import type { Language } from '../../i18n'
import type { GoogleAuthState } from '../../utils/googleAuth'

interface HeaderProps {
  lang: Language
  onToggleLanguage: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  onLogoClick: () => void
  onStartOCR?: () => void
  canStartOCR?: boolean
  googleAuthState?: GoogleAuthState
  onGoogleSignIn?: () => void
  onGoogleSignOut?: () => void
  isGoogleConfigured?: boolean
}

export function Header({
  lang, onToggleLanguage, onOpenSettings, onOpenHistory, onLogoClick,
  onStartOCR, canStartOCR,
  googleAuthState, onGoogleSignIn, onGoogleSignOut, isGoogleConfigured,
}: HeaderProps) {
  return (
    <header className="header">
      <button className="header-title" onClick={onLogoClick}>
        <h1>NDLOCR-Lite Web</h1>
        <span className="header-subtitle">
          {lang === 'ja' ? 'ブラウザで動く日本語OCR' : 'Japanese OCR in the Browser'}
        </span>
      </button>
      <div className="header-actions">
        {canStartOCR && onStartOCR && (
          <button className="btn btn-primary btn-start-ocr" onClick={onStartOCR}>
            {lang === 'ja' ? '認識を開始' : 'Start Recognition'}
          </button>
        )}
        {isGoogleConfigured && (
          googleAuthState?.isSignedIn ? (
            <div className="google-auth-indicator">
              <span className="google-auth-email" title={googleAuthState.userEmail ?? ''}>
                {googleAuthState.userEmail ?? 'Google'}
              </span>
              <button className="btn-link" onClick={onGoogleSignOut}>
                {lang === 'ja' ? '解除' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button className="btn btn-google" onClick={onGoogleSignIn}>
              {lang === 'ja' ? 'Google ドライブ接続' : 'Connect Drive'}
            </button>
          )
        )}
        <button className="btn-icon" onClick={onOpenHistory} title={lang === 'ja' ? '処理履歴' : 'History'}>
          📋
        </button>
        <button className="btn-icon" onClick={onOpenSettings} title={lang === 'ja' ? '設定' : 'Settings'}>
          ⚙️
        </button>
        <button className="btn-lang" onClick={onToggleLanguage}>
          {lang === 'ja' ? 'English' : '日本語'}
        </button>
      </div>
    </header>
  )
}
