export class GoogleDriveError extends Error {
  statusCode: number
  apiError?: string

  constructor(message: string, statusCode: number, apiError?: string) {
    super(message)
    this.statusCode = statusCode
    this.apiError = apiError
  }
}

export interface DriveFolder {
  id: string
  name: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
}

async function driveRequest(url: string, accessToken: string, options?: RequestInit) {
  const resp = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  })
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new GoogleDriveError(
      `Drive API error: ${resp.status}`,
      resp.status,
      text
    )
  }
  return resp
}

export async function listFolders(
  accessToken: string,
  parentId?: string
): Promise<DriveFolder[]> {
  const parent = parentId ?? 'root'
  const q = encodeURIComponent(
    `'${parent}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const resp = await driveRequest(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&orderBy=name&pageSize=100`,
    accessToken
  )
  const data = await resp.json()
  return data.files ?? []
}

export async function listPDFs(
  accessToken: string,
  folderId: string
): Promise<DriveFile[]> {
  const q = encodeURIComponent(
    `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`
  )
  const allFiles: DriveFile[] = []
  let pageToken: string | undefined

  do {
    const tokenParam = pageToken ? `&pageToken=${pageToken}` : ''
    const resp = await driveRequest(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=nextPageToken,files(id,name,mimeType)&orderBy=name&pageSize=100${tokenParam}`,
      accessToken
    )
    const data = await resp.json()
    allFiles.push(...(data.files ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)

  return allFiles
}

export async function downloadFile(
  accessToken: string,
  fileId: string
): Promise<ArrayBuffer> {
  const resp = await driveRequest(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    accessToken
  )
  return resp.arrayBuffer()
}

export async function createGoogleDoc(
  accessToken: string,
  title: string,
  textContent: string,
  parentFolderId?: string
): Promise<{ docId: string; docUrl: string }> {
  const metadata: Record<string, unknown> = {
    name: title,
    mimeType: 'application/vnd.google-apps.document',
  }
  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const boundary = '---ndlocrlite-boundary'
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    textContent,
    `--${boundary}--`,
  ].join('\r\n')

  const resp = await driveRequest(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    accessToken,
    {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  const data = await resp.json()
  return { docId: data.id, docUrl: data.webViewLink }
}
