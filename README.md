# Telegram AI Assistant

Bot Telegram yang menganalisis dokumen menggunakan AI (Google Gemini), menyimpan hasilnya ke Notion, dan berjalan di Cloudflare Workers (Edge).

## Fitur

- /start - Lihat bantuan dan daftar perintah
- /analisa [file_id] - Analisis dokumen dari Google Drive
- /upload - Upload file teks langsung untuk dianalisis
- /list - Lihat semua hasil analisis di Notion
- /read [page_id] - Baca isi halaman Notion
- /delete [page_id] - Hapus halaman Notion

## Tech Stack

- Runtime: Cloudflare Workers (Edge)
- Framework: Hono
- Package Manager: Bun
- AI: Google Gemini API
- Storage: Cloudflare KV + Notion

---

## Setup

### 1. Clone Repository

git clone git@github.com:hildan-anugrah/asisten.git
cd asisten
bun install

### 2. Buat File .dev.vars

Buat file .dev.vars di root project (file ini TIDAK di-upload ke GitHub):

echo. > .dev.vars

### 3. Isi .dev.vars

Buka file .dev.vars dan isi dengan credentials:

TELEGRAM_BOT_TOKEN=token_dari_botfather
TELEGRAM_SECRET_TOKEN=secret_acak_kamu
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GEMINI_API_KEY=AIzaSy...
NOTION_TOKEN=ntn_...
NOTION_PARENT_PAGE_ID=page_id_32_karakter

PENTING: Jangan pernah commit file .dev.vars ke GitHub!

---

## Cara Mendapatkan API Keys

### A. TELEGRAM_BOT_TOKEN

1. Buka Telegram, cari @BotFather
2. Kirim /newbot
3. Ikuti instruksi:
   - Nama bot: Asisten AI (bebas)
   - Username: nama_asisten_ai_bot (harus unik, akhiran _bot)
4. BotFather akan memberikan token seperti: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
5. Copy token tersebut ke .dev.vars

### B. TELEGRAM_SECRET_TOKEN

Ini secret acak untuk validasi webhook. Buat sendiri:

bun -e "console.log(crypto.randomUUID())"

Copy hasilnya ke .dev.vars sebagai TELEGRAM_SECRET_TOKEN.

### C. GOOGLE_SERVICE_ACCOUNT_JSON

1. Buka Google Cloud Console: https://console.cloud.google.com
2. Buat project baru atau pilih project yang ada
3. Enable Google Drive API:
   - Buka APIs & Services > Library
   - Cari Google Drive API, klik Enable
4. Buat Service Account:
   - Buka APIs & Services > Credentials
   - Klik Create Credentials > Service Account
   - Nama: asisten-bot (bebas)
   - Klik Create and Continue
   - Role: Basic > Viewer
   - Klik Done
5. Buat Key:
   - Klik service account yang baru dibuat
   - Tab Keys > Add Key > Create new key
   - Pilih JSON, klik Create
   - File JSON akan terdownload
6. Copy isi file JSON ke .dev.vars sebagai GOOGLE_SERVICE_ACCOUNT_JSON
7. Share Google Drive:
   - Buka file Google Drive yang mau diakses bot
   - Klik Share
   - Tambahkan email service account: asisten-bot@project-id.iam.gserviceaccount.com
   - Berikan permission Viewer

### D. GEMINI_API_KEY

1. Buka Google AI Studio: https://aistudio.google.com/apikey
2. Login dengan Google account
3. Klik Create API Key
4. Pilih project (atau buat baru)
5. Copy API key (format: AIzaSy...)
6. Paste ke .dev.vars sebagai GEMINI_API_KEY

### E. NOTION_TOKEN

1. Buka Notion Integrations: https://www.notion.so/my-integrations
2. Klik + New integration
3. Isi:
   - Name: Asisten AI
   - Associated workspace: pilih workspace kamu
4. Klik Submit
5. Copy Internal Integration Secret (format: ntn_...)
6. Paste ke .dev.vars sebagai NOTION_TOKEN

### F. NOTION_PARENT_PAGE_ID

1. Buka halaman Notion yang mau dijadikan parent (misal: "Kuliah")
2. Share halaman ke Integration yang baru dibuat:
   - Klik ... (titik tiga) di pojok kanan atas
   - Pilih Connections > Asisten AI
3. Copy URL dari browser:
   https://app.notion.com/p/Kuliah-3e036fc13dce8081b8eee93589446d09
4. PAGE_ID = 32 karakter setelah nama halaman:
   3e036fc13dce8081b8eee93589446d09
5. Paste ke .dev.vars sebagai NOTION_PARENT_PAGE_ID

---

## Development (Lokal)

### Jalankan Dev Server

bunx wrangler dev

Server akan jalan di http://localhost:8787

### Setup Telegram Webhook untuk Local Testing

Karena Telegram butuh HTTPS, pakai ngrok atau Cloudflare Tunnel:

Pakai ngrok:
ngrok http 8787

Copy URL publik (misal: https://abc123.ngrok.io), lalu set webhook di browser:

https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://abc123.ngrok.io/webhook&secret_token=<SECRET_TOKEN>

### Test di Telegram

Kirim /start ke bot kamu.

---

## Deploy ke Cloudflare Workers

### 1. Buat KV Namespace

bunx wrangler kv namespace create "KV"

Copy ID yang muncul, lalu ganti PLACEHOLDER_ID_BIKIN_DULU di wrangler.jsonc:

### 2. Set Cloudflare Secrets

Jalankan satu per satu, paste value saat diminta:

bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_SECRET_TOKEN
bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put NOTION_TOKEN
bunx wrangler secret put NOTION_PARENT_PAGE_ID

### 3. Deploy

bun run deploy

Copy URL worker yang muncul (misal: https://asisten.xxx.workers.dev)

### 4. Set Webhook Telegram

Buka browser, paste URL ini (ganti token dan URL worker):

https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://asisten.xxx.workers.dev/webhook&secret_token=<SECRET_TOKEN>

Response yang benar:
{ "ok":true,"result":true,"description":"Webhook was set" }

### 5. Test

Kirim /start ke bot Telegram. Selesai!

---

## Struktur Project

asisten/
├── wrangler.jsonc          # Config Cloudflare Workers
├── package.json
├── .dev.vars               # Secrets (lokal saja)
├── src/
│   ├── index.ts            # Entry: Hono + routes
│   ├── types.ts            # TypeScript interfaces
│   ├── config.ts           # Config + constants
│   ├── handlers/
│   │   ├── webhook.ts      # Router semua command
│   │   ├── command-analisa.ts
│   │   ├── command-upload.ts
│   │   ├── command-pages.ts
│   │   └── callback.ts
│   ├── services/
│   │   ├── telegram.ts     # Telegram Bot API
│   │   ├── gdrive.ts       # Google Drive export
│   │   ├── gemini.ts       # Gemini AI
│   │   └── notion.ts       # Notion pages
│   ├── lib/
│   │   ├── gcp-auth.ts     # JWT signing GCP
│   │   └── kv.ts           # KV helpers
│   └── utils/
│       └── logger.ts       # Logging

---

## Perintah Bot

| Perintah | Fungsi |
|----------|--------|
| /start | Tampilkan bantuan |
| /analisa [file_id] | Analisis file dari Google Drive |
| /upload | Proses file yang sudah di-upload |
| /list | Lihat semua halaman di Notion |
| /read [page_id] | Baca isi halaman Notion |
| /delete [page_id] | Hapus halaman Notion |

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespon | Cek webhook sudah set, pastikan wrangler dev jalan |
| Error 401 Unauthorized | Secret token tidak cocok, cek .dev.vars |
| File tidak ditemukan | Pastikan Service Account punya akses ke file |
| Gemini error | Cek API key valid dan quota masih ada |
| Notion error | Pastikan halaman sudah di-share ke Integration |
