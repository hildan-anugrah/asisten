import type { Env, TelegramUpdate } from '../types'
import { getEnv } from '../config'
import { handleAiCommand, handleAiUploadCommand } from './command-ai'
import { handleListCommand, handleDeleteCommand, handleEditCommand, handleNewCommand } from './command-pages'
import {
  handleCdCommand,
  handlePwdCommand,
  handleMkdirCommand,
  handleLsCommand,
  handleWriteCommand,
  handleRmCommand,
  handleUploadGDriveCommand,
  handleCatCommand,
  handleSearchCommand,
} from './command-gdrive'
import { handleHelpCommand } from './command-utils'
import { handleCallbackQuery } from './callback'
import { sendMessage } from '../services/telegram'
import { saveFileInfo } from '../lib/kv'
import { logInfo, logStep, logSuccess, logError } from '../utils/logger'

const WELCOME_MESSAGE = `🤖 *Halo! Selamat datang di AI Assistant*

*🤖 AI:*
• /ai [file_id] - Analisis dokumen dengan AI
• /ai_upload - Upload file untuk dianalisis

*📁 Google Drive:*
• /ls - List isi folder (+ ID)
• /cd [nama] - Pindah folder
• /cd .. - Kembali ke parent
• /pwd - Folder saat ini
• /mkdir [nama] - Buat folder
• /cat [file_id] - Baca isi file
• /write [nama] | [isi] - Buat file
• /upload [nama] - Upload file ke GDrive
• /search [keyword] - Cari file
• /rm [file_id] - Hapus file

*📋 Notion:*
• /list - Lihat halaman
• /read [nomor] - Baca halaman
• /new [judul] | [isi] - Buat halaman
• /edit [nomor] | [isi] - Edit halaman
• /delete [nomor] - Hapus halaman

*⚙️ Lainnya:*
• /help [command] - Bantuan detail`

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
          `📁 File diterima: *${doc.file_name ?? 'unknown'}*\n\nKetik /ai_upload untuk analisis AI\natau /upload untuk simpan ke Google Drive.`
        )
        logSuccess('Document disimpan di KV', doc.file_name)
        return
      }

      if (text.toLowerCase().startsWith('/ai ')) {
        logStep('COMMAND', '/ai dipanggil')
        await handleAiCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/ai_upload')) {
        logStep('COMMAND', '/ai_upload dipanggil')
        await handleAiUploadCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/cd')) {
        logStep('COMMAND', '/cd dipanggil')
        await handleCdCommand(update.message, env)
      } else if (text.toLowerCase() === '/pwd') {
        logStep('COMMAND', '/pwd dipanggil')
        await handlePwdCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/mkdir')) {
        logStep('COMMAND', '/mkdir dipanggil')
        await handleMkdirCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/ls')) {
        logStep('COMMAND', '/ls dipanggil')
        await handleLsCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/cat')) {
        logStep('COMMAND', '/cat dipanggil')
        await handleCatCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/write')) {
        logStep('COMMAND', '/write dipanggil')
        await handleWriteCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/upload')) {
        logStep('COMMAND', '/upload dipanggil')
        await handleUploadGDriveCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/search')) {
        logStep('COMMAND', '/search dipanggil')
        await handleSearchCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/rm')) {
        logStep('COMMAND', '/rm dipanggil')
        await handleRmCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/list')) {
        logStep('COMMAND', '/list dipanggil')
        await handleListCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/read')) {
        logStep('COMMAND', '/read dipanggil')
        const readMatch = text.match(/^\/read\s+(.+)/i)
        if (readMatch) {
          await handleCallbackQuery({
            id: '0',
            chat_instance: '0',
            from: { id: 0, first_name: '' },
            data: `read:${readMatch[1].trim()}`
          }, env)
        }
      } else if (text.toLowerCase().startsWith('/new')) {
        logStep('COMMAND', '/new dipanggil')
        await handleNewCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/edit')) {
        logStep('COMMAND', '/edit dipanggil')
        await handleEditCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/delete')) {
        logStep('COMMAND', '/delete dipanggil')
        await handleDeleteCommand(update.message, env)
      } else if (text.toLowerCase().startsWith('/help')) {
        logStep('COMMAND', '/help dipanggil')
        await handleHelpCommand(update.message, env)
      } else if (text.toLowerCase() === '/start') {
        logStep('COMMAND', '/start dipanggil')
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
