import { useState } from 'react'
import { createGoogleDoc } from '../../utils/googleDrive'
import { DriveFolderPicker } from './DriveFolderPicker'
import type { DriveFolder } from '../../utils/googleDrive'

interface GoogleDriveButtonProps {
  text: string
  fileName: string
  lang: 'ja' | 'en'
  accessToken: string | null
  onSignInRequired: () => void
  disabled?: boolean
}

type SaveState = 'idle' | 'picking' | 'saving' | 'saved' | 'error'

export function GoogleDriveButton({
  text, fileName, lang, accessToken, onSignInRequired, disabled,
}: GoogleDriveButtonProps) {
  const [state, setState] = useState<SaveState>('idle')
  const [docUrl, setDocUrl] = useState<string | null>(null)

  const handleClick = () => {
    if (!accessToken) {
      onSignInRequired()
      return
    }
    setState('picking')
  }

  const handleFolderSelect = async (folder: DriveFolder) => {
    setState('saving')
    try {
      const title = fileName.replace(/\.[^.]+$/, '') + '_ocr'
      const result = await createGoogleDoc(accessToken!, title, text, folder.id === 'root' ? undefined : folder.id)
      setDocUrl(result.docUrl)
      setState('saved')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label = (() => {
    switch (state) {
      case 'saving': return lang === 'ja' ? '保存中...' : 'Saving...'
      case 'saved': return lang === 'ja' ? '保存しました！' : 'Saved!'
      case 'error': return lang === 'ja' ? '保存失敗' : 'Failed'
      default: return lang === 'ja' ? 'ドライブに保存' : 'Save to Drive'
    }
  })()

  return (
    <>
      <button
        className={`btn btn-drive ${state === 'saved' ? 'drive-save-status success' : state === 'error' ? 'drive-save-status error' : ''}`}
        onClick={handleClick}
        disabled={disabled || state === 'saving'}
      >
        {label}
      </button>
      {state === 'saved' && docUrl && (
        <a href={docUrl} target="_blank" rel="noopener noreferrer" className="drive-save-status success">
          {lang === 'ja' ? '開く' : 'Open'}
        </a>
      )}
      {state === 'picking' && accessToken && (
        <DriveFolderPicker
          accessToken={accessToken}
          onSelect={handleFolderSelect}
          onCancel={() => setState('idle')}
          lang={lang}
          title={lang === 'ja' ? '保存先フォルダを選択' : 'Select destination folder'}
        />
      )}
    </>
  )
}
