import type { Env } from './types'

export function getEnv(env: Env) {
  return {
    telegramBotToken: env.TELEGRAM_BOT_TOKEN,
    telegramSecretToken: env.TELEGRAM_SECRET_TOKEN,
    gcpServiceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON,
    geminiApiKey: env.GEMINI_API_KEY,
    notionToken: env.NOTION_TOKEN,
    notionParentPageId: env.NOTION_PARENT_PAGE_ID,
    kv: env.KV,
  }
}

export const MAX_TEXT_LENGTH = 15000
export const KV_TTL_SECONDS = 86400
export const GEMINI_MODEL = 'gemini-2.0-flash'
export const NOTION_API_VERSION = '2025-09-03'
export const TELEGRAM_API_BASE = 'https://api.telegram.org'
export const GCP_TOKEN_URI = 'https://oauth2.googleapis.com/token'
export const GDRIVE_API_BASE = 'https://www.googleapis.com/drive/v3'
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com'
export const NOTION_API_BASE = 'https://api.notion.com'

export const SYSTEM_PROMPT = `Kamu adalah asisten AI yang ahli dalam menganalisis dokumen. Tugas kamu:
1. Memberikan ringkasan yang padat dan jelas dari dokumen
2. Mengidentifikasi poin-poin penting
3. Memberikan analisis mendalam jika diperlukan
4. Menjawab dalam Bahasa Indonesia yang baik dan benar
5. Gunakan heading dan bullet point untuk struktur yang jelas`
