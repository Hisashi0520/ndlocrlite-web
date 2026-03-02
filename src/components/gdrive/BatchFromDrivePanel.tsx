import { useState } from 'react'
import { DriveFolderPicker } from './DriveFolderPicker'
import type { DriveFolder } from '../../utils/googleDrive'
import type { BatchState } from '../../hooks/useGoogleDriveBatch'

interface BatchFromDrivePanelProps {
  lang: 'ja' | 'en'
  accessToken: string
  batchState: BatchState
  onStartBatch: (sourceFolderId: string, accessToken: string, outputFolderId?: string) => void
  onCancel: () => void
  onClose: () => void
}

type Step = 'select-source' | 'select-output' | 'ready' | 'running'

export function BatchFromDrivePanel({
  lang, accessToken, batchState, onStartBatch, onCancel, onClose,
}: BatchFromDrivePanelProps) {
  const [step, setStep] = useState<Step>('select-source')
  const [sourceFolder, setSourceFolder] = useState<DriveFolder | null>(null)
  const [outputFolder, setOutputFolder] = useState<DriveFolder | null>(null)
  const [showOutputPicker, setShowOutputPicker] = useState(false)

  const handleSourceSelect = (folder: DriveFolder) => {
    setSourceFolder(folder)
    setStep('ready')
  }

  const handleStart = () => {
    if (!sourceFolder) return
    setStep('running')
    onStartBatch(sourceFolder.id, accessToken, outputFolder?.id)
  }

  const doneCount = batchState.jobs.filter(j => j.status === 'done').length
  const errorCount = batchState.jobs.filter(j => j.status === 'error').length
  const isComplete = !batchState.isRunning && batchState.jobs.length > 0

  return (
    <div className="panel-overlay" onClick={onClose}>
      <div className="panel" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{lang === 'ja' ? 'Google ドライブからバッチOCR' : 'Batch OCR from Google Drive'}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="panel-body">
          {step === 'select-source' && (
            <DriveFolderPicker
              accessToken={accessToken}
              onSelect={handleSourceSelect}
              onCancel={onClose}
              lang={lang}
              title={lang === 'ja' ? 'PDFが入ったフォルダを選択' : 'Select folder containing PDFs'}
            />
          )}

          {(step === 'ready' || step === 'running') && (
            <>
              <div className="batch-folder-row">
                <span className="batch-folder-label">
                  {lang === 'ja' ? '入力:' : 'Source:'}
                </span>
                <span className="batch-folder-name">{sourceFolder?.name}</span>
                {step === 'ready' && (
                  <button className="btn btn-secondary" onClick={() => setStep('select-source')} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                    {lang === 'ja' ? '変更' : 'Change'}
                  </button>
                )}
              </div>

              <div className="batch-folder-row">
                <span className="batch-folder-label">
                  {lang === 'ja' ? '出力:' : 'Output:'}
                </span>
                <span className="batch-folder-name">
                  {outputFolder?.name ?? (lang === 'ja' ? '（入力と同じ）' : '(Same as source)')}
                </span>
                {step === 'ready' && (
                  <button className="btn btn-secondary" onClick={() => setShowOutputPicker(true)} style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}>
                    {lang === 'ja' ? '変更' : 'Change'}
                  </button>
                )}
              </div>

              {showOutputPicker && (
                <DriveFolderPicker
                  accessToken={accessToken}
                  onSelect={(folder) => { setOutputFolder(folder); setShowOutputPicker(false) }}
                  onCancel={() => setShowOutputPicker(false)}
                  lang={lang}
                  title={lang === 'ja' ? '出力フォルダを選択' : 'Select output folder'}
                />
              )}

              {step === 'ready' && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <button className="btn btn-primary" onClick={handleStart}>
                    {lang === 'ja' ? 'バッチ処理を開始' : 'Start Batch OCR'}
                  </button>
                </div>
              )}

              {step === 'running' && batchState.jobs.length > 0 && (
                <>
                  <ul className="batch-job-list">
                    {batchState.jobs.map((job) => (
                      <li key={job.id} className="batch-job-item">
                        <span className={`batch-job-status ${job.status === 'done' ? 'done' : job.status === 'error' ? 'error' : ['downloading', 'processing', 'saving'].includes(job.status) ? 'active' : ''}`}>
                          {job.status === 'done' ? '✓' : job.status === 'error' ? '✗' : job.status === 'pending' ? '○' : '…'}
                        </span>
                        <span className="batch-job-name">{job.fileName}</span>
                        <span style={{ fontSize: '0.7rem', color: '#757575' }}>
                          {job.status === 'downloading' ? (lang === 'ja' ? 'ダウンロード中' : 'Downloading') :
                           job.status === 'processing' ? (lang === 'ja' ? 'OCR中' : 'OCR') :
                           job.status === 'saving' ? (lang === 'ja' ? '保存中' : 'Saving') :
                           job.status === 'error' ? (job.errorMessage?.substring(0, 30) ?? '') : ''}
                        </span>
                        {job.status === 'done' && job.resultDocUrl && (
                          <a href={job.resultDocUrl} target="_blank" rel="noopener noreferrer" className="batch-job-link">
                            {lang === 'ja' ? '開く' : 'Open'}
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>

                  {isComplete && (
                    <div className={`batch-summary ${errorCount > 0 ? 'has-errors' : ''}`}>
                      {lang === 'ja'
                        ? `完了: ${doneCount}/${batchState.totalFiles} ファイル${errorCount > 0 ? ` (${errorCount} 件エラー)` : ''}`
                        : `Done: ${doneCount}/${batchState.totalFiles} files${errorCount > 0 ? ` (${errorCount} errors)` : ''}`}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
        <div className="panel-footer" style={{ gap: '0.5rem' }}>
          {batchState.isRunning && (
            <button className="btn btn-danger" onClick={onCancel}>
              {lang === 'ja' ? 'キャンセル' : 'Cancel'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>
            {lang === 'ja' ? '閉じる' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}
