import type { Env, TelegramMessage } from '../types'
import { getEnv } from '../config'
import { listChildPages, readPageContent, deletePage } from '../services/notion'
import { savePageList, getPageIdByIndex } from '../lib/kv'
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

    const pageIds = pages.map((p) => p.id)
    await savePageList(config.kv, chatId, pageIds)

    const lines = pages.map((p, i) => `${i + 1}. ${p.title}`)
    const listText = 'Daftar Halaman di Notion:\n\n' + lines.join('\n') + '\n\nKlik untuk melihat isi, atau ketik /delete [nomor] untuk menghapus.'
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
      'Gunakan: /delete [nomor]\n\nContoh: /delete 1\n\nGunakan /list untuk melihat daftar halaman dan nomornya.'
    )
    return
  }

  const input = match[1].trim()
  const index = parseInt(input, 10)

  if (isNaN(index) || index < 1) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Nomor tidak valid. Gunakan angka positif.\n\nContoh: /delete 1'
    )
    return
  }

  const pageId = await getPageIdByIndex(config.kv, chatId, index)

  if (!pageId) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      `Halaman nomor ${index} tidak ditemukan.\n\nKetik /list untuk melihat daftar terbaru.`
    )
    return
  }

  try {
    await deletePage(config.notionToken, pageId)
    await sendMessage(config.telegramBotToken, chatId, `Halaman nomor ${index} berhasil dihapus dari Notion!`)
  } catch (error) {
    console.error('Error deleting page:', error)
    await sendMessage(config.telegramBotToken, chatId, 'Gagal menghapus halaman dari Notion.')
  }
}
