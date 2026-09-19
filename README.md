# 🤖 Telegram AI Assistant

Bot Telegram yang menganalisis dokumen menggunakan AI (Google Gemini), menyimpan hasilnya ke Notion, dan berjalan di Cloudflare Workers (Edge).

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Hono](https://img.shields.io/badge/Hono-4.x-black?logo=hono)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-orange?logo=cloudflare)
![Gemini](https://img.shields.io/badge/Google-Gemini-red?logo=google)
![Notion](https://img.shields.io/badge/Notion-API-white?logo=notion)

---

## ✨ Fitur

| Perintah | Fungsi |
|----------|--------|
| `/start` | Tampilkan bantuan dan daftar perintah |
| `/analisa [file_id]` | Analisis dokumen dari Google Drive |
| `/upload` | Upload file teks langsung untuk dianalisis |
| `/list` | Lihat semua hasil analisis di Notion |
| `/read [page_id]` | Baca isi halaman Notion |
| `/delete [page_id]` | Hapus halaman Notion |

---

## 🚀 Quick Start (5 Langkah)

> Untuk yang sudah punya API keys, ikuti langkah singkat ini:

```bash
# 1. Clone & Install
git clone git@github.com:hildan-anugrah/asisten.git
cd asisten
bun install

# 2. Buat file .dev.vars dan isi dengan API keys kamu
# (lihat panduan lengkap di bawah)

# 3. Buat KV Namespace
bunx wrangler kv namespace create "KV"

# 4. Set Cloudflare Secrets (WAJIB sebelum deploy!)
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_SECRET_TOKEN
bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put NOTION_TOKEN
bunx wrangler secret put NOTION_PARENT_PAGE_ID

# 5. Deploy & Set Webhook
bun run deploy
# Buka browser untuk set webhook (lihat di bawah)
```

> ⚠️ **PENTING:** File `.dev.vars` TIDAK di-upload ke Cloudflare! Secrets **WAJIB** di-set pakai `wrangler secret put` sebelum atau sesudah deploy.

---

## 📋 Tech Stack

- **Runtime:** Cloudflare Workers (Edge)
- **Framework:** Hono
- **Package Manager:** Bun
- **AI:** Google Gemini API
- **Storage:** Cloudflare KV + Notion

---

## ⚙️ Setup

### 1. Clone Repository

```bash
git clone git@github.com:hildan-anugrah/asisten.git
cd asisten
bun install
```

### 2. Buat File `.dev.vars`

Buat file `.dev.vars` di root project (file ini **TIDAK** di-upload ke GitHub):

```bash
# Windows
echo. > .dev.vars

# macOS/Linux
touch .dev.vars
```

### 3. Isi `.dev.vars`

Buka file `.dev.vars` dan isi dengan credentials:

```env
TELEGRAM_BOT_TOKEN=your_token_from_botfather
TELEGRAM_SECRET_TOKEN=your_random_secret
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
GEMINI_API_KEY=AIzaSy...
NOTION_TOKEN=ntn_...
NOTION_PARENT_PAGE_ID=3e036fc13dce8081b8eee93589446d09
```

> ⚠️ **PENTING:** Jangan pernah commit file `.dev.vars` ke GitHub!

---

## 🔑 Cara Mendapatkan API Keys

### A. TELEGRAM_BOT_TOKEN

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi:
   - Nama bot: `Asisten AI` (bebas)
   - Username: `nama_asisten_ai_bot` (harus unik, akhiran `_bot`)
4. BotFather akan memberikan token seperti:

   ```
   123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

5. Copy token tersebut ke `.dev.vars`

---

### B. TELEGRAM_SECRET_TOKEN

Ini secret acak untuk validasi webhook. Buat sendiri:

```bash
bun -e "console.log(crypto.randomUUID())"
```

Copy hasilnya ke `.dev.vars` sebagai `TELEGRAM_SECRET_TOKEN`.

---

### C. GOOGLE_SERVICE_ACCOUNT_JSON

1. Buka **Google Cloud Console**: https://console.cloud.google.com
2. Buat project baru atau pilih project yang ada
3. **Enable Google Drive API:**
   - Buka **APIs & Services > Library**
   - Cari "Google Drive API", klik **Enable**
4. **Buat Service Account:**
   - Buka **APIs & Services > Credentials**
   - Klik **Create Credentials > Service Account**
   - Nama: `asisten-bot` (bebas)
   - Klik **Create and Continue**
   - Role: **Basic > Viewer**
   - Klik **Done**
5. **Buat Key:**
   - Klik service account yang baru dibuat
   - Tab **Keys** > **Add Key** > **Create new key**
   - Pilih **JSON**, klik **Create**
   - File JSON akan terdownload
6. **Copy isi file JSON** ke `.dev.vars` sebagai `GOOGLE_SERVICE_ACCOUNT_JSON`
7. **Share Google Drive:**
   - Buka file Google Drive yang mau diakses bot
   - Klik **Share**
   - Tambahkan email service account:

   ```
   asisten-bot@your-project-id.iam.gserviceaccount.com
   ```

   - Berikan permission **Viewer**

---

### D. GEMINI_API_KEY

1. Buka **Google AI Studio**: https://aistudio.google.com/apikey
2. Login dengan Google account
3. Klik **Create API Key**
4. Pilih project (atau buat baru)
5. Copy API key (format: `AIzaSy...`)
6. Paste ke `.dev.vars` sebagai `GEMINI_API_KEY`

---

### E. NOTION_TOKEN

1. Buka **Notion Integrations**: https://www.notion.so/my-integrations
2. Klik **+ New integration**
3. Isi:
   - Name: `Asisten AI`
   - Associated workspace: pilih workspace kamu
4. Klik **Submit**
5. Copy **Internal Integration Secret** (format: `ntn_...`)
6. Paste ke `.dev.vars` sebagai `NOTION_TOKEN`

---

### F. NOTION_PARENT_PAGE_ID

1. Buka halaman Notion yang mau dijadikan parent (misal: "Kuliah")
2. Share halaman ke Integration yang baru dibuat:
   - Klik **...** (titik tiga) di pojok kanan atas
   - Pilih **Connections** > **Asisten AI**
3. Copy URL dari browser:

   ```
   https://app.notion.com/p/Kuliah-3e036fc13dce8081b8eee93589446d09
   ```

4. **PAGE_ID** = 32 karakter setelah nama halaman:

   ```
   3e036fc13dce8081b8eee93589446d09
   ```

5. Paste ke `.dev.vars` sebagai `NOTION_PARENT_PAGE_ID`

---

## 💻 Development (Lokal)

### Jalankan Dev Server

```bash
bunx wrangler dev
```

Server akan jalan di `http://localhost:8787`

### Setup Telegram Webhook untuk Local Testing

Karena Telegram butuh HTTPS, pakai **ngrok** atau **Cloudflare Tunnel**:

```bash
# Install ngrok, lalu:
ngrok http 8787
```

Copy URL publik (misal: `https://abc123.ngrok.io`), lalu buka URL ini di browser:

```
https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://abc123.ngrok.io/webhook&secret_token=<SECRET_TOKEN>
```

### Test di Telegram

Kirim `/start` ke bot kamu.

---

## 🚀 Deploy ke Cloudflare Workers

### 1. Buat KV Namespace

```bash
bunx wrangler kv namespace create "KV"
```

Copy ID yang muncul, lalu ganti `PLACEHOLDER_ID_BIKIN_DULU` di `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID"
    }
  ]
}
```

### 2. Set Cloudflare Secrets

> ⚠️ **WAJIB:** Secrets harus di-set **SEBELUM** atau **SESUDAH** deploy. File `.dev.vars` TIDAK ikut di-upload ke production!

Jalankan satu per satu, paste value saat diminta:

```bash
bunx wrangler secret put TELEGRAM_BOT_TOKEN
bunx wrangler secret put TELEGRAM_SECRET_TOKEN
bunx wrangler secret put GOOGLE_SERVICE_ACCOUNT_JSON
bunx wrangler secret put GEMINI_API_KEY
bunx wrangler secret put NOTION_TOKEN
bunx wrangler secret put NOTION_PARENT_PAGE_ID
```

Untuk cek semua secrets sudah ter-set:

```bash
bunx wrangler secret list
```

### 3. Deploy

```bash
bun run deploy
```

Copy URL worker yang muncul (misal: `https://asisten.xxx.workers.dev`)

### 4. Set Webhook Telegram

Buka browser, paste URL ini (ganti token dan URL worker):

```
https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://asisten.xxx.workers.dev/webhook&secret_token=<SECRET_TOKEN>
```

Response yang benar:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

### 5. Test

Kirim `/start` ke bot Telegram. Selesai! 🎉

> ⚠️ **Masih tidak merespon?** Lihat bagian [Troubleshooting](#-troubleshooting) di bawah.

---

## 📁 Struktur Project

```
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
```

---

## ❓ Troubleshooting

### Cek Status Webhook

Buka browser untuk melihat status webhook:

```
https://api.telegram.org/bot<TOKEN_BOT>/getWebhookInfo
```

Perhatikan field `last_error_message`:

| `last_error_message` | Arti | Solusi |
|----------------------|------|--------|
| `"Unauthorized"` | Secrets belum di-set | Jalankan `wrangler secret put` untuk semua secrets |
| `""` (kosong) | Tidak ada error | Secrets sudah benar, cek hal lain |
| `"Not Found"` | URL webhook salah | Re-set webhook dengan URL yang benar |

### Daftar Masalah Umum

| Masalah | Solusi |
|---------|--------|
| Bot tidak merespon sama sekali | Cek webhook status (lihat di atas), pastikan secrets sudah di-set |
| Error 401 Unauthorized | Secrets belum di-set ke production, jalankan `wrangler secret put` |
| Sudah fix secrets tapi masih tidak merespon | **Re-set webhook** ke URL yang sama untuk clear pending updates |
| File tidak ditemukan | Pastikan Service Account punya akses ke file di Google Drive |
| Gemini error | Cek API key valid dan quota masih ada |
| Notion error | Pastikan halaman sudah di-share ke Integration |
| Deploy berhasil tapi bot mati | Cek apakah semua `wrangler secret put` sudah dijalankan |

### Cara Re-set Webhook

Setelah fix secrets atau ada error, re-set webhook ke URL yang sama:

```
https://api.telegram.org/bot<TOKEN_BOT>/setWebhook?url=https://asisten.xxx.workers.dev/webhook&secret_token=<SECRET_TOKEN>
```

Response yang benar:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

---

## 📄 License

MIT
