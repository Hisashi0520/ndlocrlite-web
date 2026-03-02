import { useState, useCallback } from 'react'
import type { OCRResult } from '../../types/ocr'
import { downloadText, copyToClipboard } from '../../utils/textExport'
import { GoogleDriveButton } from '../gdrive/GoogleDriveButton'
import { SaveAllToDriveButton } from '../gdrive/SaveAllToDriveButton'

interface ResultActionsProps {
  results: OCRResult[]
  currentResult: OCRResult | null
  lang: 'ja' | 'en'
  accessToken?: string | null
  onSignInRequired?: () => void
}

export function ResultActions({ results, currentResult, lang, accessToken, onSignInRequired }: ResultActionsProps) {
  const [copied, setCopied] = useState(false)
  const [includeFileName, setIncludeFileName] = useState(false)
  const [ignoreNewlines, setIgnoreNewlines] = useState(false)

  const applyOptions = useCallback((text: string) =>
    ignoreNewlines ? text.replace(/\n/g, '') : text,
    [ignoreNewlines]
  )

  const buildText = useCallback((result: OCRResult) =>
    applyOptions(includeFileName ? `=== ${result.fileName} ===\n${result.fullText}` : result.fullText),
    [includeFileName, applyOptions]
  )

  const handleCopy = async () => {
    const text = currentResult ? buildText(currentResult) : ''
    try {
      await copyToClipboard(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert(lang === 'ja' ? 'コピーに失敗しました' : 'Failed to copy')
    }
  }

  const handleDownload = () => {
    if (!currentResult) return
    downloadText(buildText(currentResult), currentResult.fileName)
  }

  const handleDownloadAll = () => {
    if (results.length === 0) return
    const allText = results.map((r) => buildText(r)).join('\n\n')
    downloadText(allText, 'ocr_results')
  }

  const disabled = !currentResult
  const showDrive = accessToken !== undefined && onSignInRequired !== undefined

  return (
    <div className="result-actions">
      <label className="result-actions-option">
        <input
          type="checkbox"
          checked={includeFileName}
          onChange={(e) => setIncludeFileName(e.target.checked)}
        />
        {lang === 'ja' ? 'ファイル名を記載する' : 'Include file name'}
      </label>
      <label className="result-actions-option">
        <input
          type="checkbox"
          checked={ignoreNewlines}
          onChange={(e) => setIgnoreNewlines(e.target.checked)}
        />
        {lang === 'ja' ? '改行を無視する' : 'Ignore newlines'}
      </label>
      <div className="result-actions-buttons">
        <button className="btn btn-primary" onClick={handleCopy} disabled={disabled}>
          {copied ? (lang === 'ja' ? 'コピーしました！' : 'Copied!') : (lang === 'ja' ? 'コピー' : 'Copy')}
        </button>
        <button className="btn btn-secondary" onClick={handleDownload} disabled={disabled}>
          {lang === 'ja' ? 'ダウンロード' : 'Download'}
        </button>
        {showDrive && (
          <GoogleDriveButton
            text={currentResult ? buildText(currentResult) : ''}
            fileName={currentResult?.fileName ?? 'ocr'}
            lang={lang}
            accessToken={accessToken ?? null}
            onSignInRequired={onSignInRequired!}
            disabled={disabled}
          />
        )}
        {results.length > 1 && (
          <button className="btn btn-secondary" onClick={handleDownloadAll}>
            {lang === 'ja' ? '全てダウンロード' : 'Download All'}
          </button>
        )}
        {showDrive && results.length > 1 && (
          <SaveAllToDriveButton
            results={results}
            buildText={buildText}
            lang={lang}
            accessToken={accessToken ?? null}
            onSignInRequired={onSignInRequired!}
          />
        )}
      </div>
    </div>
  )
}
