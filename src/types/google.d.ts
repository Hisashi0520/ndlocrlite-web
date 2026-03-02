declare namespace google.accounts.oauth2 {
  interface TokenClient {
    requestAccessToken(config?: { prompt?: string }): void
  }

  interface TokenResponse {
    access_token: string
    expires_in: number
    error?: string
    error_description?: string
    scope: string
  }

  interface TokenClientConfig {
    client_id: string
    scope: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type: string; message: string }) => void
    ux_mode?: 'popup' | 'redirect'
  }

  function initTokenClient(config: TokenClientConfig): TokenClient
  function revoke(token: string, callback?: () => void): void
}
