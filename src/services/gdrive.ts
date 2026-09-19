import { getGCPAccessToken } from '../lib/gcp-auth'
import { GDRIVE_API_BASE, MAX_TEXT_LENGTH } from '../config'
import { logStep, logSuccess, logError } from '../utils/logger'

export interface GDriveFileInfo {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
  webViewLink?: string
}

async function getAccessToken(serviceAccountJson: string): Promise<string> {
  logStep('GDRIVE', 'Mendapatkan access token...')
  const accessToken = await getGCPAccessToken(serviceAccountJson)
  logSuccess('GDRIVE', 'Access token OK')
  return accessToken
}

export async function getGDriveFileText(
  serviceAccountJson: string,
  fileId: string
): Promise<string> {
  const accessToken = await getAccessToken(serviceAccountJson)

  const exportUrl = `${GDRIVE_API_BASE}/files/${encodeURIComponent(fileId)}/export`
  const params = new URLSearchParams({ mimeType: 'text/plain' })

  logStep('GDRIVE', `Export file: ${fileId}`)
  const response = await fetch(`${exportUrl}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (response.status === 404) {
    logError('GDRIVE', `File not found: ${fileId}`)
    throw new Error('FILE_NOT_FOUND')
  }

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `API error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  let text = await response.text()

  if (text.length > MAX_TEXT_LENGTH) {
    text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[...teks dipotong karena melebihi batas karakter]'
  }

  logSuccess('GDRIVE', `Teks diterima: ${text.length} karakter`)
  return text
}

export async function createGDriveFolder(
  serviceAccountJson: string,
  folderName: string,
  parentFolderId?: string
): Promise<GDriveFileInfo> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `Membuat folder: ${folderName}`)
  const metadata: Record<string, unknown> = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  }

  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const response = await fetch(`${GDRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  })

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `Create folder error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  logSuccess('GDRIVE', `Folder dibuat: ${data.id as string}`)
  return {
    id: data.id as string,
    name: data.name as string,
    mimeType: data.mimeType as string,
    createdTime: data.createdTime as string,
    webViewLink: data.webViewLink as string,
  }
}

export async function listGDriveFiles(
  serviceAccountJson: string,
  folderId?: string
): Promise<GDriveFileInfo[]> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `List files di folder: ${folderId ?? 'root'}`)
  const query = folderId
    ? `'${folderId}' in parents and trashed = false`
    : `'root' in parents and trashed = false`
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,size,createdTime,webViewLink)',
    orderBy: 'name',
    pageSize: '50',
  })

  const response = await fetch(`${GDRIVE_API_BASE}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `List files error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as { files: Array<Record<string, unknown>> }
  const files: GDriveFileInfo[] = data.files.map((f) => ({
    id: f.id as string,
    name: f.name as string,
    mimeType: f.mimeType as string,
    size: f.size as string | undefined,
    createdTime: f.createdTime as string | undefined,
    webViewLink: f.webViewLink as string | undefined,
  }))

  logSuccess('GDRIVE', `${files.length} file ditemukan`)
  return files
}

export async function createGDriveFile(
  serviceAccountJson: string,
  fileName: string,
  content: string,
  parentFolderId?: string
): Promise<GDriveFileInfo> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `Membuat file: ${fileName}`)

  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: 'text/plain',
  }

  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n')

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `Create file error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  logSuccess('GDRIVE', `File dibuat: ${data.id as string}`)
  return {
    id: data.id as string,
    name: data.name as string,
    mimeType: data.mimeType as string,
    size: data.size as string | undefined,
    createdTime: data.createdTime as string | undefined,
    webViewLink: data.webViewLink as string | undefined,
  }
}

export async function downloadGDriveFile(
  serviceAccountJson: string,
  fileId: string
): Promise<string> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `Download file: ${fileId}`)
  const response = await fetch(
    `${GDRIVE_API_BASE}/files/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (response.status === 404) {
    logError('GDRIVE', `File not found: ${fileId}`)
    throw new Error('FILE_NOT_FOUND')
  }

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `Download error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  let text = await response.text()

  if (text.length > MAX_TEXT_LENGTH) {
    text = text.substring(0, MAX_TEXT_LENGTH) + '\n\n[...teks dipotong karena melebihi batas karakter]'
  }

  logSuccess('GDRIVE', `File diunduh: ${text.length} karakter`)
  return text
}

export async function searchGDriveFiles(
  serviceAccountJson: string,
  keyword: string,
  folderId?: string
): Promise<GDriveFileInfo[]> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `Mencari file: ${keyword}`)
  let query = `name contains '${keyword}' and trashed = false`
  if (folderId) {
    query = `'${folderId}' in parents and name contains '${keyword}' and trashed = false`
  }

  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,size,createdTime,webViewLink)',
    orderBy: 'name',
    pageSize: '20',
  })

  const response = await fetch(`${GDRIVE_API_BASE}/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `Search error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as { files: Array<Record<string, unknown>> }
  const files: GDriveFileInfo[] = data.files.map((f) => ({
    id: f.id as string,
    name: f.name as string,
    mimeType: f.mimeType as string,
    size: f.size as string | undefined,
    createdTime: f.createdTime as string | undefined,
    webViewLink: f.webViewLink as string | undefined,
  }))

  logSuccess('GDRIVE', `${files.length} file ditemukan`)
  return files
}

export async function deleteGDriveFile(
  serviceAccountJson: string,
  fileId: string
): Promise<boolean> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `Menghapus file: ${fileId}`)
  const response = await fetch(`${GDRIVE_API_BASE}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    logError('GDRIVE', `Delete error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  logSuccess('GDRIVE', `File dihapus: ${fileId}`)
  return true
}

export async function uploadFileToGDrive(
  serviceAccountJson: string,
  fileName: string,
  fileContent: string,
  mimeType: string,
  parentFolderId?: string
): Promise<GDriveFileInfo> {
  const accessToken = await getAccessToken(serviceAccountJson)

  logStep('GDRIVE', `Upload file: ${fileName}`)

  const metadata: Record<string, unknown> = {
    name: fileName,
    mimeType: mimeType,
  }

  if (parentFolderId) {
    metadata.parents = [parentFolderId]
  }

  const boundary = '----FormBoundary' + Math.random().toString(36).substring(2)
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    `Content-Type: ${mimeType}; charset=UTF-8`,
    '',
    fileContent,
    `--${boundary}--`,
  ].join('\r\n')

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    logError('GDRIVE', `Upload error: ${response.status}`)
    throw new Error(`GDrive API error: ${response.status} - ${error}`)
  }

  const data = (await response.json()) as Record<string, unknown>
  logSuccess('GDRIVE', `File diupload: ${data.id as string}`)
  return {
    id: data.id as string,
    name: data.name as string,
    mimeType: data.mimeType as string,
    size: data.size as string | undefined,
    createdTime: data.createdTime as string | undefined,
    webViewLink: data.webViewLink as string | undefined,
  }
}
