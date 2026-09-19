export interface Env {
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_SECRET_TOKEN: string
  GOOGLE_SERVICE_ACCOUNT_JSON: string
  GEMINI_API_KEY: string
  NOTION_TOKEN: string
  NOTION_PARENT_PAGE_ID: string
  KV: KVNamespace
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramMessage {
  message_id: number
  chat: { id: number; type: string }
  text?: string
  document?: TelegramDocument
  from?: {
    id: number
    first_name: string
    username?: string
  }
}

export interface PendingFileInfo {
  fileId: string
  fileName: string
  mimeType: string
  fileSize: number
}

export interface TelegramCallbackQuery {
  id: string
  chat_instance: string
  from: {
    id: number
    first_name: string
    username?: string
  }
  message?: TelegramMessage
  data?: string
}

export interface TelegramInlineKeyboardButton {
  text: string
  callback_data?: string
  url?: string
}

export interface TelegramInlineKeyboardMarkup {
  inline_keyboard: TelegramInlineKeyboardButton[][]
}

export interface GCPServiceAccount {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  auth_uri: string
  token_uri: string
  auth_provider_x509_cert_url?: string
  client_x509_cert_url?: string
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
    finishReason?: string
  }>
  error?: {
    code: number
    message: string
    status: string
  }
}

export interface NotionPageInfo {
  id: string
  title: string
  createdTime: string
  url: string
}
