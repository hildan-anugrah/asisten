import type { Env, TelegramMessage } from '../types'
import { getEnv } from '../config'
import { listChildPages, readPageContent, deletePage } from '../services/notion'
import {
  sendMessage,
  buildPageListKeyboard,
  buildPageDetailKeyboard,
} from '../services/telegram'

export async function handleListCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const config = getEnv(env)
  const chatId = message.chat.id

  try {
    const pages = await listChildPages(config.notionToken, config.notionParentPageId)

    if (pages.length === 0) {
      await sendMessage(
        config.telegramBotToken,
        chatId,
        'Belum ada halaman di Notion.\n\nGunakan /analisa [file_id] untuk menganalisis dokumen dan menyimpannya.'
      )
      return
    }

    const lines = pages.map((p, i) => `${i + 1}. ${p.title}`)
    const listText = 'Daftar Halaman di Notion:\n\n' + lines.join('\n') + '\n\nKlik untuk melihat isi halaman.'
    const keyboard = buildPageListKeyboard(pages)

    await sendMessage(config.telegramBotToken, chatId, listText, keyboard)
  } catch (error) {
    console.error('Error listing pages:', error)
    await sendMessage(config.telegramBotToken, chatId, 'Gagal mengambil daftar halaman dari Notion.')
  }
}

export async function handleDeleteCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const config = getEnv(env)
  const chatId = message.chat.id
  const text = message.text?.trim() ?? ''

  const match = text.match(/^\/delete\s+(.+)/i)
  if (!match) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Gunakan: /delete [Notion Page ID]\n\nGunakan /list untuk melihat daftar halaman.'
    )
    return
  }

  const pageId = match[1].trim()

  try {
    await deletePage(config.notionToken, pageId)
    await sendMessage(config.telegramBotToken, chatId, 'Halaman berhasil dihapus dari Notion!')
  } catch (error) {
    console.error('Error deleting page:', error)
    await sendMessage(config.telegramBotToken, chatId, 'Gagal menghapus halaman dari Notion.')
  }
}
