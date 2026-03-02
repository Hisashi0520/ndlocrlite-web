import { useState } from 'react'
import { createGoogleDoc } from '../../utils/googleDrive'
import { DriveFolderPicker } from './DriveFolderPicker'
import type { DriveFolder } from '../../utils/googleDrive'
import type { OCRResult } from '../../types/ocr'

interface SaveAllToDriveButtonProps {
  results: OCRResult[]
  buildText: (result: OCRResult) => string
  lang: 'ja' | 'en'
  accessToken: string | null
  onSignInRequired: () => void
}

type SaveState = 'idle' | 'picking' | 'saving' | 'saved' | 'error'

export function SaveAllToDriveButton({
  results, buildText, lang, accessToken, onSignInRequired,
}: SaveAllToDriveButtonProps) {
  const [state, setState] = useState<SaveState>('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const handleClick = () => {
    if (!accessToken) {
      onSignInRequired()
      return
    }
    setState('picking')
  }

  const handleFolderSelect = async (folder: DriveFolder) => {
    setState('saving')
    setProgress({ done: 0, total: results.length })
    const folderId = folder.id === 'root' ? undefined : folder.id

    try {
      for (let i = 0; i < results.length; i++) {
        const r = results[i]
        const title = r.fileName.replace(/\.[^.]+$/, '') + '_ocr'
        await createGoogleDoc(accessToken!, title, buildText(r), folderId)
        setProgress({ done: i + 1, total: results.length })
      }
      setState('saved')
      setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label = (() => {
    switch (state) {
      case 'saving': return lang === 'ja'
        ? `保存中 (${progress.done}/${progress.total})...`
        : `Saving (${progress.done}/${progress.total})...`
      case 'saved': return lang === 'ja' ? '全て保存しました！' : 'All Saved!'
      case 'error': return lang === 'ja' ? '保存失敗' : 'Failed'
      default: return lang === 'ja' ? '全てドライブに保存' : 'Save All to Drive'
    }
  })()

  return (
    <>
      <button
        className={`btn btn-drive ${state === 'saved' ? 'drive-save-status success' : state === 'error' ? 'drive-save-status error' : ''}`}
        onClick={handleClick}
        disabled={state === 'saving'}
      >
        {label}
      </button>
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
