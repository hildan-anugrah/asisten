import type { Env, TelegramMessage } from '../types'
import { getEnv } from '../config'
import { getGDriveFileText } from '../services/gdrive'
import { analyzeWithGemini } from '../services/gemini'
import { saveToKV } from '../lib/kv'
import {
  sendMessage,
  editMessageText,
  buildSaveNotionKeyboard,
} from '../services/telegram'
import { logInfo, logStep, logSuccess, logError } from '../utils/logger'

export async function handleAnalisaCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const config = getEnv(env)
  const chatId = message.chat.id
  const text = message.text?.trim() ?? ''

  const fileIdMatch = text.match(/^\/analisa\s+(.+)/i)

  if (!fileIdMatch) {
    logError('Format /analisa salah')
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Gunakan: `/analisa [Google Drive File ID]`\n\nContoh: `/analisa 1abc...xyz`'
    )
    return
  }

  const fileId = fileIdMatch[1].trim()

  if (!fileId || fileId.length < 10) {
    logError('File ID tidak valid')
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'File ID tidak valid. Pastikan kamu memasukkan ID file yang benar.'
    )
    return
  }

  logStep('ANALISA', `File ID: ${fileId}`)
  const loadingMsg = await sendMessage(
    config.telegramBotToken,
    chatId,
    '⏳ *Sedang memproses...*\n\nMengambil dokumen dari Google Drive dan menganalisis dengan AI.'
  )

  try {
    logStep('GDRIVE', 'Mengambil teks dari Google Drive...')
    const documentText = await getGDriveFileText(config.gcpServiceAccountJson, fileId)
    logSuccess('GDrive', `Teks diterima: ${documentText.length} karakter`)

    logStep('GEMINI', 'Menganalisis dengan AI...')
    const aiResult = await analyzeWithGemini(config.geminiApiKey, documentText)
    logSuccess('Gemini', `Hasil: ${aiResult.length} karakter`)

    const resultMessageId = loadingMsg?.message_id ?? message.message_id

    logStep('KV', 'Menyimpan hasil AI...')
    await saveToKV(config.kv, chatId, resultMessageId, aiResult)
    logSuccess('KV', `Tersimpan dengan key: msg_${chatId}_${resultMessageId}`)

    const truncatedResult =
      aiResult.length > 3000
        ? aiResult.substring(0, 3000) + '\n\n_[Hasil dipotong untuk Telegram]_'
        : aiResult

    const keyboard = buildSaveNotionKeyboard(chatId, resultMessageId)

    await editMessageText(
      config.telegramBotToken,
      chatId,
      resultMessageId,
      `*Hasil Analisis AI:*\n\n${truncatedResult}`,
      keyboard
    )
    logSuccess('ANALISA', 'Selesai, tombol "Simpan ke Notion" dikirim')
  } catch (error) {
    logError('Error handling /analisa', error)

    let errorMessage = 'Gagal memproses dokumen.'
    if (error instanceof Error) {
      if (error.message === 'FILE_NOT_FOUND') {
        errorMessage = '❌ File tidak ditemukan atau tidak memiliki akses.'
      } else if (error.message.includes('GDrive')) {
        errorMessage = '❌ Gagal mengakses Google Drive. Coba lagi nanti.'
      } else if (error.message.includes('Gemini')) {
        errorMessage = '❌ Gagal memproses dokumen dengan AI.'
      }
    }

    if (loadingMsg) {
      await editMessageText(config.telegramBotToken, chatId, loadingMsg.message_id, errorMessage)
    } else {
      await sendMessage(config.telegramBotToken, chatId, errorMessage)
    }
  }
}
