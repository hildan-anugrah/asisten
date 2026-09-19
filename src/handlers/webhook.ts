import type { Env, TelegramUpdate } from '../types'
import { getEnv } from '../config'
import { handleAnalisaCommand } from './command-analisa'
import { handleListCommand, handleDeleteCommand } from './command-pages'
import { handleUploadCommand } from './command-upload'
import { handleCallbackQuery } from './callback'
import { sendMessage } from '../services/telegram'
import { saveFileInfo } from '../lib/kv'
import { logInfo, logStep, logSuccess, logError } from '../utils/logger'

const WELCOME_MESSAGE = `🤖 *Halo! Selamat datang di AI Assistant*

Saya bisa bantu kamu:
📄 /analisa [file_id] - Analisis dokumen dari Google Drive
📁 /upload - Kirim file langsung untuk dianalisis
📋 /list - Lihat semua halaman di Notion
📖 /read [page_id] - Baca isi halaman Notion
🗑️ /delete [page_id] - Hapus halaman Notion

💡 *Tips:*
• Untuk /analisa, paste file ID dari Google Drive
• Atau kirim file langsung ke sini, lalu ketik /upload

Contoh: /analisa 1aBcDeFgHiJkLmNoPqRsTuVwXyZ`

export async function handleWebhook(update: TelegramUpdate, env: Env): Promise<void> {
  try {
    if (update.message) {
      const chatId = update.message.chat.id
      const from = update.message.from?.first_name ?? 'Unknown'
      const text = update.message.text?.trim() ?? ''

      logInfo(`Pesan dari ${from} (chat:${chatId})`, text || '[document]')

      if (update.message.document) {
        const doc = update.message.document
        logStep('DOCUMENT', `File: ${doc.file_name} (${doc.file_size ?? 0} bytes)`)
        const config = getEnv(env)

        await saveFileInfo(config.kv, chatId, {
          fileId: doc.file_id,
          fileName: doc.file_name ?? 'unknown',
          mimeType: doc.mime_type ?? 'application/octet-stream',
          fileSize: doc.file_size ?? 0,
        })

        await sendMessage(
          config.telegramBotToken,
          chatId,
          `📁 File diterima: *${doc.file_name ?? 'unknown'}*\n\nKetik /upload untuk menganalisis file ini.`
        )
        logSuccess('Document disimpan di KV', doc.file_name)
        return
      }

      if (text.toLowerCase().startsWith('/analisa')) {
        logStep('COMMAND', '/analisa dipanggil')
        await handleAnalisaCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/upload')) {
        logStep('COMMAND', '/upload dipanggil')
        await handleUploadCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/list')) {
        logStep('COMMAND', '/list dipanggil')
        await handleListCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/delete')) {
        logStep('COMMAND', '/delete dipanggil')
        await handleDeleteCommand(update.message, env)
      } else if (text.toLowerCase() === '/start' || text.toLowerCase() === '/help') {
        logStep('COMMAND', '/start atau /help dipanggil')
        const config = getEnv(env)
        await sendMessage(config.telegramBotToken, chatId, WELCOME_MESSAGE)
        logSuccess('Welcome message dikirim')
      } else {
        logInfo('Pesan tidak dikenali, diabaikan')
      }
    }

    if (update.callback_query) {
      const cq = update.callback_query
      logInfo(`Callback dari ${cq.from.first_name}`, cq.data)
      await handleCallbackQuery(cq, env)
    }
  } catch (error) {
    logError('Webhook handler error', error)
  }
}
