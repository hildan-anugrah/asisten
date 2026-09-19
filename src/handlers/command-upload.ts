import type { Env, TelegramMessage } from '../types'
import { getEnv } from '../config'
import { getFileInfo, saveToKV, deleteFileInfo } from '../lib/kv'
import { analyzeWithGemini } from '../services/gemini'
import { getFileContent, sendMessage, editMessageText, buildSaveNotionKeyboard } from '../services/telegram'
import { logInfo, logStep, logSuccess, logError } from '../utils/logger'

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.csv', '.json', '.ts', '.js', '.py', '.log', '.yaml', '.yml', '.toml', '.xml', '.html', '.css']

function isAllowedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

export async function handleUploadCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const config = getEnv(env)
  const chatId = message.chat.id

  logStep('UPLOAD', `Cek file info untuk chat ${chatId}`)
  const fileInfo = await getFileInfo(config.kv, chatId)

  if (!fileInfo) {
    logInfo('Tidak ada file yang menunggu')
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Tidak ada file yang menunggu.\n\nCara pakai:\n1. Kirim file teks ke bot ini\n2. Ketik /upload\n\nFormat yang didukung: .txt, .md, .csv, .json, .ts, .js, .py'
    )
    return
  }

  if (!isAllowedFile(fileInfo.fileName)) {
    logError(`Format file tidak didukung: ${fileInfo.fileName}`)
    await sendMessage(
      config.telegramBotToken,
      chatId,
      `Format file "${fileInfo.fileName}" tidak didukung.\n\nFormat yang didukung: .txt, .md, .csv, .json, .ts, .js, .py`
    )
    await deleteFileInfo(config.kv, chatId)
    return
  }

  logStep('UPLOAD', `File: ${fileInfo.fileName} (${fileInfo.fileSize} bytes)`)
  const loadingMsg = await sendMessage(
    config.telegramBotToken,
    chatId,
    `⏳ *Mengunduh dan menganalisis...*\n\nFile: ${fileInfo.fileName}`
  )

  try {
    logStep('TELEGRAM', 'Mengunduh file dari Telegram...')
    const fileContent = await getFileContent(config.telegramBotToken, fileInfo.fileId)

    if (!fileContent) {
      throw new Error('Gagal mengunduh file dari Telegram')
    }
    logSuccess('TELEGRAM', `File diunduh: ${fileContent.length} karakter`)

    const truncatedContent =
      fileContent.length > 15000
        ? fileContent.substring(0, 15000) + '\n\n[...file dipotong]'
        : fileContent

    logStep('GEMINI', 'Menganalisis dengan AI...')
    const aiResult = await analyzeWithGemini(config.geminiApiKey, truncatedContent)
    logSuccess('Gemini', `Hasil: ${aiResult.length} karakter`)

    const resultMessageId = loadingMsg?.message_id ?? message.message_id

    logStep('KV', 'Menyimpan hasil AI...')
    await saveToKV(config.kv, chatId, resultMessageId, aiResult)
    await deleteFileInfo(config.kv, chatId)
    logSuccess('KV', `Tersimpan, file info dihapus`)

    const truncatedResult =
      aiResult.length > 3000
        ? aiResult.substring(0, 3000) + '\n\n_[Hasil dipotong untuk Telegram]_'
        : aiResult

    const keyboard = buildSaveNotionKeyboard(chatId, resultMessageId)

    await editMessageText(
      config.telegramBotToken,
      chatId,
      resultMessageId,
      `*Hasil Analisis AI:*\n\n📄 File: ${fileInfo.fileName}\n\n${truncatedResult}`,
      keyboard
    )
    logSuccess('UPLOAD', 'Selesai, tombol "Simpan ke Notion" dikirim')
  } catch (error) {
    logError('Error handling /upload', error)

    let errorMessage = 'Gagal memproses file.'
    if (error instanceof Error) {
      if (error.message.includes('Gemini')) {
        errorMessage = 'Gagal menganalisis file dengan AI.'
      } else {
        errorMessage = `Error: ${error.message}`
      }
    }

    if (loadingMsg) {
      await editMessageText(config.telegramBotToken, chatId, loadingMsg.message_id, errorMessage)
    } else {
      await sendMessage(config.telegramBotToken, chatId, errorMessage)
    }
  }
}
