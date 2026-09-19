import type {
  TelegramInlineKeyboardButton,
  TelegramInlineKeyboardMarkup,
} from '../types'
import { TELEGRAM_API_BASE } from '../config'

function apiBase(token: string): string {
  return `${TELEGRAM_API_BASE}/bot${token}`
}

export async function sendMessage(
  token: string,
  chatId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup
): Promise<{ message_id: number } | null> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: 'Markdown',
  }

  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }

  const response = await fetch(`${apiBase(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    console.error('Telegram sendMessage error:', await response.text())
    return null
  }

  const data = (await response.json()) as { result: { message_id: number } }
  return data.result
}

export async function editMessageReplyMarkup(
  token: string,
  chatId: number,
  messageId: number,
  replyMarkup: TelegramInlineKeyboardMarkup
): Promise<boolean> {
  const response = await fetch(`${apiBase(token)}/editMessageReplyMarkup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      message_id: messageId,
      reply_markup: replyMarkup,
    }),
  })

  if (!response.ok) {
    console.error('Telegram editMessageReplyMarkup error:', await response.text())
    return false
  }

  return true
}

export async function editMessageText(
  token: string,
  chatId: number,
  messageId: number,
  text: string,
  replyMarkup?: TelegramInlineKeyboardMarkup
): Promise<boolean> {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
  }

  if (replyMarkup) {
    body.reply_markup = replyMarkup
  }

  const response = await fetch(`${apiBase(token)}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    console.error('Telegram editMessageText error:', await response.text())
    return false
  }

  return true
}

export async function answerCallbackQuery(
  token: string,
  callbackQueryId: string,
  text?: string,
  showAlert = false
): Promise<boolean> {
  const body: Record<string, unknown> = {
    callback_query_id: callbackQueryId,
    show_alert: showAlert,
  }

  if (text) {
    body.text = text
  }

  const response = await fetch(`${apiBase(token)}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    console.error('Telegram answerCallbackQuery error:', await response.text())
    return false
  }

  return true
}

export async function getFileContent(
  token: string,
  fileId: string
): Promise<string | null> {
  const infoResponse = await fetch(`${apiBase(token)}/getFile?file_id=${fileId}`)

  if (!infoResponse.ok) {
    console.error('Telegram getFile error:', await infoResponse.text())
    return null
  }

  const infoData = (await infoResponse.json()) as {
    result: { file_path: string }
  }
  const filePath = infoData.result.file_path

  const fileResponse = await fetch(
    `https://api.telegram.org/file/bot${token}/${filePath}`
  )

  if (!fileResponse.ok) {
    console.error('Telegram file download error:', await fileResponse.text())
    return null
  }

  return fileResponse.text()
}

export function buildSaveNotionKeyboard(
  chatId: number,
  messageId: number
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: 'Simpan ke Notion',
          callback_data: `save:${chatId}:${messageId}`,
        },
      ],
    ],
  }
}

export function buildSavedKeyboard(pageUrl: string): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Tersimpan',
          url: pageUrl || undefined,
        },
      ],
    ],
  }
}

export function buildPageListKeyboard(
  pages: Array<{ id: string; title: string }>
): TelegramInlineKeyboardMarkup {
  const buttons: TelegramInlineKeyboardButton[][] = pages.map((page) => [
    {
      text: `📄 ${page.title.substring(0, 40)}`,
      callback_data: `read:${page.id}`,
    },
  ])

  return { inline_keyboard: buttons }
}

export function buildPageDetailKeyboard(
  pageId: string
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: '🗑️ Hapus',
          callback_data: `delete:${pageId}`,
        },
      ],
    ],
  }
}
