import type { Env, TelegramMessage } from '../types'
import { getEnv } from '../config'
import { createChildPage, listChildPages, readPageContent, deletePage, appendPageContent } from '../services/notion'
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

export async function handleNewCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const config = getEnv(env)
  const chatId = message.chat.id
  const text = message.text?.trim() ?? ''

  const match = text.match(/^\/new\s+(.+?)\s*\|\s*(.+)/is)
  if (!match) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Gunakan: /new [judul] | [isi]\n\nContoh: /new Catatan Kuliah | Isi catatan hari ini'
    )
    return
  }

  const title = match[1].trim()
  const content = match[2].trim()

  if (!title) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Judul tidak boleh kosong.\n\nContoh: /new Catatan Kuliah | Isi catatan'
    )
    return
  }

  const loadingMsg = await sendMessage(
    config.telegramBotToken,
    chatId,
    `⏳ *Membuat halaman baru...*\n\nJudul: ${title}`
  )

  try {
    const page = await createChildPage(
      config.notionToken,
      config.notionParentPageId,
      title,
      content
    )

    if (loadingMsg) {
      await sendMessage(
        config.telegramBotToken,
        chatId,
        `✅ Halaman *${page.title}* berhasil dibuat di Notion!\n\nID: \`${page.id}\``
      )
    }
  } catch (error) {
    console.error('Error creating page:', error)
    if (loadingMsg) {
      await sendMessage(config.telegramBotToken, chatId, 'Gagal membuat halaman baru.')
    } else {
      await sendMessage(config.telegramBotToken, chatId, 'Gagal membuat halaman baru.')
    }
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

export async function handleEditCommand(
  message: TelegramMessage,
  env: Env
): Promise<void> {
  const config = getEnv(env)
  const chatId = message.chat.id
  const text = message.text?.trim() ?? ''

  const match = text.match(/^\/edit\s+(\d+)\s*\|\s*(.+)/is)
  if (!match) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Gunakan: /edit [nomor] | [isi]\n\nContoh: /edit 2 | Tambahan isi di bawah'
    )
    return
  }

  const index = parseInt(match[1], 10)
  const content = match[2].trim()

  if (isNaN(index) || index < 1) {
    await sendMessage(
      config.telegramBotToken,
      chatId,
      'Nomor tidak valid. Gunakan angka positif.\n\nContoh: /edit 1 | Isi baru'
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
    await appendPageContent(config.notionToken, pageId, content)
    await sendMessage(
      config.telegramBotToken,
      chatId,
      `✅ Isi berhasil ditambahkan ke halaman nomor ${index}!`
    )
  } catch (error) {
    console.error('Error editing page:', error)
    await sendMessage(config.telegramBotToken, chatId, 'Gagal mengedit halaman.')
  }
}
