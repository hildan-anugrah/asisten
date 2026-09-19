import { getGCPAccessToken } from '../lib/gcp-auth'
import { GDRIVE_API_BASE, MAX_TEXT_LENGTH } from '../config'
import { logStep, logSuccess, logError } from '../utils/logger'

export async function getGDriveFileText(
  serviceAccountJson: string,
  fileId: string
): Promise<string> {
  logStep('GDRIVE', 'Mendapatkan access token...')
  const accessToken = await getGCPAccessToken(serviceAccountJson)
  logSuccess('GDRIVE', 'Access token OK')

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
