import { useState, useEffect, useCallback } from 'react'
import { listFolders, type DriveFolder } from '../../utils/googleDrive'

interface BreadcrumbItem {
  id: string | null // null = root
  name: string
}

interface DriveFolderPickerProps {
  accessToken: string
  onSelect: (folder: DriveFolder) => void
  onCancel: () => void
  lang: 'ja' | 'en'
  title?: string
}

export function DriveFolderPicker({ accessToken, onSelect, onCancel, lang, title }: DriveFolderPickerProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: null, name: lang === 'ja' ? 'マイドライブ' : 'My Drive' },
  ])

  const currentFolderId = breadcrumb[breadcrumb.length - 1].id

  const loadFolders = useCallback(async (parentId: string | null) => {
    setLoading(true)
    try {
      const result = await listFolders(accessToken, parentId ?? undefined)
      setFolders(result)
    } catch {
      setFolders([])
    }
    setLoading(false)
  }, [accessToken])

  useEffect(() => {
    loadFolders(currentFolderId)
  }, [currentFolderId, loadFolders])

  const handleFolderClick = (folder: DriveFolder) => {
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
  }

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumb(prev => prev.slice(0, index + 1))
  }

  const handleSelect = () => {
    const current = breadcrumb[breadcrumb.length - 1]
    onSelect({ id: current.id ?? 'root', name: current.name })
  }

  return (
    <div className="panel-overlay" onClick={onCancel}>
      <div className="panel panel-small" onClick={e => e.stopPropagation()}>
        <div className="panel-header">
          <h2>{title ?? (lang === 'ja' ? 'フォルダを選択' : 'Select Folder')}</h2>
          <button className="btn-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="panel-body">
          <div className="folder-picker-breadcrumb">
            {breadcrumb.map((item, i) => (
              <span key={i}>
                {i > 0 && <span> &gt; </span>}
                {i < breadcrumb.length - 1 ? (
                  <button onClick={() => handleBreadcrumbClick(i)}>{item.name}</button>
                ) : (
                  <span className="breadcrumb-current">{item.name}</span>
                )}
              </span>
            ))}
          </div>

          {loading ? (
            <div className="empty-message">
              {lang === 'ja' ? '読み込み中...' : 'Loading...'}
            </div>
          ) : folders.length === 0 ? (
            <div className="empty-message">
              {lang === 'ja' ? 'サブフォルダがありません' : 'No subfolders'}
            </div>
          ) : (
            <ul className="folder-list">
              {folders.map(folder => (
                <li key={folder.id}>
                  <button
                    className="folder-list-item"
                    onClick={() => handleFolderClick(folder)}
                  >
                    📁 {folder.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="panel-footer">
          <button className="btn btn-primary" onClick={handleSelect}>
            {lang === 'ja' ? 'このフォルダを選択' : 'Select this folder'}
          </button>
        </div>
      </div>
    </div>
  )
}
