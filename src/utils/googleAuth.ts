export interface GoogleAuthState {
  isSignedIn: boolean
  accessToken: string | null
  expiresAt: number | null
  userEmail: string | null
}

export const INITIAL_AUTH_STATE: GoogleAuthState = {
  isSignedIn: false,
  accessToken: null,
  expiresAt: null,
  userEmail: null,
}

let gisLoaded = false
let gisLoadPromise: Promise<void> | null = null

export function loadGisScript(): Promise<void> {
  if (gisLoaded) return Promise.resolve()
  if (gisLoadPromise) return gisLoadPromise

  gisLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => {
      console.log('[GIS] Script loaded successfully')
      gisLoaded = true
      resolve()
    }
    script.onerror = (e) => {
      console.error('[GIS] Script failed to load', e)
      gisLoadPromise = null
      reject(new Error('Failed to load Google Identity Services'))
    }
    document.head.appendChild(script)
  })

  return gisLoadPromise
}

export function initTokenClient(
  clientId: string,
  callback: (response: google.accounts.oauth2.TokenResponse) => void,
  errorCallback?: (error: { type: string; message: string }) => void
): google.accounts.oauth2.TokenClient {
  return google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback,
    error_callback: errorCallback,
    ux_mode: 'popup',
  })
}

export function requestAccessToken(
  tokenClient: google.accounts.oauth2.TokenClient,
  prompt?: string
): void {
  tokenClient.requestAccessToken(prompt ? { prompt } : undefined)
}

export function revokeToken(accessToken: string): Promise<void> {
  return new Promise<void>((resolve) => {
    google.accounts.oauth2.revoke(accessToken, () => resolve())
  })
}

export function isTokenExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return true
  return Date.now() > expiresAt - 60_000 // 1 minute buffer
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  try {
    const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!resp.ok) return null
    const data = await resp.json()
    return data.email ?? null
  } catch {
    return null
  }
}
