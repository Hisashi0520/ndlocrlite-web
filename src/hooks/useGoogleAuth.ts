import { useState, useEffect, useRef, useCallback } from 'react'
import {
  type GoogleAuthState,
  INITIAL_AUTH_STATE,
  loadGisScript,
  initTokenClient,
  requestAccessToken,
  revokeToken,
  isTokenExpired,
  fetchUserEmail,
} from '../utils/googleAuth'

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

export function useGoogleAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>(INITIAL_AUTH_STATE)
  const [gisReady, setGisReady] = useState(false)
  const tokenClientRef = useRef<google.accounts.oauth2.TokenClient | null>(null)
  const signInResolveRef = useRef<(() => void) | null>(null)

  const isConfigured = Boolean(CLIENT_ID)

  // Load GIS script on mount
  useEffect(() => {
    console.log('[GoogleAuth] CLIENT_ID:', CLIENT_ID ? 'set' : 'NOT SET')
    if (!CLIENT_ID) return
    loadGisScript()
      .then(() => {
        console.log('[GoogleAuth] GIS loaded, initializing token client...')
        tokenClientRef.current = initTokenClient(
          CLIENT_ID,
          // success callback
          async (response) => {
            console.log('[GoogleAuth] Token response:', response.error ?? 'success')
            if (response.error) {
              signInResolveRef.current = null
              return
            }
            const expiresAt = Date.now() + response.expires_in * 1000
            const email = await fetchUserEmail(response.access_token)
            setAuthState({
              isSignedIn: true,
              accessToken: response.access_token,
              expiresAt,
              userEmail: email,
            })
            signInResolveRef.current?.()
            signInResolveRef.current = null
          },
          // error callback
          (err) => {
            console.error('[GoogleAuth] Error callback:', err)
            signInResolveRef.current = null
          }
        )
        setGisReady(true)
        console.log('[GoogleAuth] Token client ready')
      })
      .catch((err) => {
        console.error('[GoogleAuth] GIS script failed to load:', err)
      })
  }, [])

  const signIn = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      console.log('[GoogleAuth] signIn called, tokenClient:', tokenClientRef.current ? 'ready' : 'null')
      if (!tokenClientRef.current) {
        resolve()
        return
      }
      signInResolveRef.current = resolve
      requestAccessToken(tokenClientRef.current)
    })
  }, [])

  const signOut = useCallback(async () => {
    if (authState.accessToken) {
      await revokeToken(authState.accessToken)
    }
    setAuthState(INITIAL_AUTH_STATE)
  }, [authState.accessToken])

  const ensureValidToken = useCallback(async (): Promise<string | null> => {
    if (authState.accessToken && !isTokenExpired(authState.expiresAt)) {
      return authState.accessToken
    }
    // Token expired, request new one
    await signIn()
    // After signIn resolves, authState may not be updated yet due to async setState
    // Return null and let the caller retry or check authState
    return null
  }, [authState.accessToken, authState.expiresAt, signIn])

  return {
    authState,
    isConfigured,
    gisReady,
    signIn,
    signOut,
    ensureValidToken,
  }
}
