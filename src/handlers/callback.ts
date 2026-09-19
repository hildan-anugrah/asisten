import type { Env, TelegramCallbackQuery } from '../types'
import { getEnv } from '../config'
import { getFromKV, deleteFromKV, savePageList } from '../lib/kv'
import { createChildPage, readPageContent, deletePage, listChildPages } from '../services/notion'
import {
  answerCallbackQuery,
  editMessageReplyMarkup,
  editMessageText,
  sendMessage,
  buildSavedKeyboard,
  buildPageListKeyboard,
  buildPageDetailKeyboard,
} from '../services/telegram'
import { logInfo, logStep, logSuccess, logError } from '../utils/logger'

export async function handleCallbackQuery(
  query: TelegramCallbackQuery,
  env: Env
): Promise<void> {
  const config = getEnv(env)

  if (query.data === 'already_saved' || query.data === 'noop') {
    await answerCallbackQuery(config.telegramBotToken, query.id)
    return
  }

  if (!query.data) {
    await answerCallbackQuery(config.telegramBotToken, query.id, 'Data tidak valid.', true)
    return
  }

  const parts = query.data.split(':')
  logInfo(`Callback data`, { action: parts[0], raw: query.data })

  // SAVE: save:{chatId}:{messageId}
  if (parts[0] === 'save' && parts.length === 3) {
    const chatId = parseInt(parts[1], 10)
    const messageId = parseInt(parts[2], 10)

    if (isNaN(chatId) || isNaN(messageId)) {
      await answerCallbackQuery(config.telegramBotToken, query.id, 'ID tidak valid.', true)
      return
    }

    logStep('SAVE', `Ambil AI result dari KV: msg_${chatId}_${messageId}`)
    const aiResult = await getFromKV(config.kv, chatId, messageId)
    if (!aiResult) {
      logError('Data expired di KV')
      await answerCallbackQuery(
        config.telegramBotToken,
        query.id,
        'Data sudah expired. Kirim ulang /analisa.',
        true
      )
      return
    }

    try {
      logStep('NOTION', 'Membuat child page...')
      const page = await createChildPage(
        config.notionToken,
        config.notionParentPageId,
        `Analisis AI - ${new Date().toLocaleDateString('id-ID')}`,
        aiResult
      )

      logSuccess('NOTION', `Page created: ${page.id}`)

      await answerCallbackQuery(config.telegramBotToken, query.id, 'Berhasil disimpan ke Notion!')

      if (query.message) {
        await editMessageReplyMarkup(
          config.telegramBotToken,
          query.message.chat.id,
          query.message.message_id,
          buildSavedKeyboard(page.url)
        )
      }

      await deleteFromKV(config.kv, chatId, messageId)
      logSuccess('SAVE', 'Selesai, KV dihapus')
    } catch (error) {
      logError('Error saving to Notion', error)
      await answerCallbackQuery(
        config.telegramBotToken,
        query.id,
        'Gagal menyimpan ke Notion. Coba lagi.',
        true
      )
    }
    return
  }

  // READ: read:{pageId}
  if (parts[0] === 'read' && parts.length === 2) {
    const pageId = parts[1]
    logStep('READ', `Membaca page: ${pageId}`)

    try {
      const { title, content } = await readPageContent(config.notionToken, pageId)
      logSuccess('NOTION', `Page dibaca: ${title} (${content.length} chars)`)

      const truncated =
        content.length > 3500
          ? content.substring(0, 3500) + '\n\n_[Isi dipotong untuk Telegram]_'
          : content

      if (query.message) {
        await editMessageText(
          config.telegramBotToken,
          query.message.chat.id,
          query.message.message_id,
          `*${title}*\n\n${truncated}`,
          buildPageDetailKeyboard(pageId)
        )
      }

      await answerCallbackQuery(config.telegramBotToken, query.id)
    } catch (error) {
      logError('Error reading page', error)
      await answerCallbackQuery(
        config.telegramBotToken,
        query.id,
        'Gagal membaca halaman.',
        true
      )
    }
    return
  }

  // DELETE: delete:{pageId}
  if (parts[0] === 'delete' && parts.length === 2) {
    const pageId = parts[1]
    logStep('DELETE', `Menghapus page: ${pageId}`)

    try {
      await deletePage(config.notionToken, pageId)

      await answerCallbackQuery(config.telegramBotToken, query.id, 'Halaman berhasil dihapus!')

      if (query.message) {
        await editMessageText(
          config.telegramBotToken,
          query.message.chat.id,
          query.message.message_id,
          '🗑️ Halaman sudah dihapus dari Notion.'
        )
      }
      logSuccess('DELETE', `Page ${pageId} dihapus`)
    } catch (error) {
      logError('Error deleting page', error)
      await answerCallbackQuery(
        config.telegramBotToken,
        query.id,
        'Gagal menghapus halaman.',
        true
      )
    }
    return
  }

  // LIST_REFRESH: list_refresh
  if (parts[0] === 'list_refresh') {
    logStep('LIST_REFRESH', 'Refresh daftar halaman')
    try {
      const pages = await listChildPages(config.notionToken, config.notionParentPageId)

      if (pages.length === 0) {
        await answerCallbackQuery(
          config.telegramBotToken,
          query.id,
          'Belum ada halaman.',
          false
        )
        return
      }

      const pageIds = pages.map((p) => p.id)
      await savePageList(config.kv, query.message?.chat.id ?? 0, pageIds)

      const keyboard = buildPageListKeyboard(pages)

      if (query.message) {
        const listText =
          `*Daftar Halaman di Notion:*\n\n` +
          pages.map((p, i) => `${i + 1}. ${p.title}`).join('\n') +
          `\n\n_Klik untuk melihat isi, atau ketik /delete [nomor] untuk menghapus._`

        await editMessageText(
          config.telegramBotToken,
          query.message.chat.id,
          query.message.message_id,
          listText,
          keyboard
        )
      }

      await answerCallbackQuery(config.telegramBotToken, query.id)
      logSuccess('LIST_REFRESH', `${pages.length} halaman ditampilkan`)
    } catch (error) {
      logError('Error listing pages', error)
      await answerCallbackQuery(
        config.telegramBotToken,
        query.id,
        'Gagal memuat daftar halaman.',
        true
      )
    }
    return
  }

  await answerCallbackQuery(config.telegramBotToken, query.id)
}
