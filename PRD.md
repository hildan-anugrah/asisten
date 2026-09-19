# Product Requirements Document (PRD)

**Nama Produk:** Telegram AI Assistant (Integrasi GDrive, AI, & Notion)
**Pemilik Produk (Product Owner):** Hildan Anugrah Tamadi Putra
**Status Dokumen:** Draft / Perencanaan Awal
**Target Lingkungan:** Cloudflare Workers (Edge)

## 1. Latar Belakang & Visi Produk

Manajemen dokumen dan ekstraksi informasi seringkali memakan waktu, terutama ketika transisi antar aplikasi (Telegram untuk komunikasi, Google Drive untuk penyimpanan, AI untuk pemrosesan, dan Notion untuk pencatatan). Produk ini adalah *bot* asisten pribadi di Telegram yang bertindak sebagai jembatan otomatisasi. Sistem ini dirancang dengan arsitektur *serverless edge* untuk memastikan latensi rendah dan keandalan tinggi tanpa bergantung pada *server* tradisional atau VPS.

## 2. Objektif & Metrik Keberhasilan

**Objektif:**

* Menyediakan antarmuka tunggal (Telegram) untuk memproses dokumen Google Drive menggunakan AI.
* Memungkinkan penyimpanan hasil pemrosesan AI ke *database* Notion hanya dengan satu klik.
* Mengatasi masalah *timeout* integrasi pihak ketiga melalui eksekusi proses latar belakang.

**Metrik Keberhasilan (Success Metrics):**

* **Latensi Webhook:** Respons *acknowledgement* (200 OK) ke Telegram di bawah 1 detik untuk mencegah *looping webhook*.
* **Keberhasilan Eksekusi:** 99% proses ekstraksi GDrive dan AI berhasil diselesaikan di latar belakang tanpa *crash*.
* **Persistensi Data:** 100% data teks sementara berhasil dibaca dari *state storage* dan dikirim ke Notion API.

## 3. Spesifikasi Arsitektur & Teknologi

Sistem ini dirancang menggunakan *stack* yang dioptimalkan untuk pengembangan *edge computing*, selaras dengan praktik pengelolaan infrastruktur web modern.

* **Lingkungan Pengembangan:** Bun pada sistem operasi Windows untuk manajemen *package* global dan eksekusi skrip lokal yang sangat cepat.
* **Framework:** Hono, dipilih karena dukungan *native* terhadap standar *Web API* (`fetch`, `Request`, `Response`) dan integrasi bawaan dengan eksekusi *Edge*.
* **Infrastruktur Backend:** Cloudflare Workers.
* **Manajemen State:** Cloudflare KV (Key-Value) untuk penyimpanan sementara teks hasil AI.
* **Integrasi Pihak Ketiga:**
* Telegram Bot API (Antarmuka pengguna & interaksi *Inline Keyboard*).
* Google Drive API (Membaca file menggunakan *Service Account*).
* AI API (Gemini / OpenAI untuk pemrosesan *Natural Language*).
* Notion API (Menulis blok data ke *database* atau halaman).



## 4. User Stories

* Sebagai pengguna, saya ingin mengirimkan perintah `/analisa [ID_File]` ke bot Telegram agar sistem dapat membaca dokumen spesifik di Google Drive saya.
* Sebagai pengguna, saya ingin menerima balasan ringkasan atau hasil olahan dokumen dari AI di obrolan Telegram.
* Sebagai pengguna, saya ingin melihat tombol *Inline* "Simpan ke Notion" di bawah pesan hasil AI agar saya tidak perlu menyalin-tempel teks secara manual.
* Sebagai pengguna, saya ingin mendapatkan indikator visual (perubahan tombol menjadi "✅ Tersimpan") ketika data sukses diekspor ke Notion.

## 5. Functional Requirements (FR)

### FR1: Penerimaan & Validasi Webhook

* Sistem **HARUS** menyediakan *endpoint* `POST /webhook` menggunakan Hono untuk menerima *payload* dari Telegram.
* Sistem **HARUS** memvalidasi *header* `X-Telegram-Bot-Api-Secret-Token` untuk memastikan *request* benar-benar berasal dari Telegram.
* Sistem **HARUS** menggunakan `c.executionCtx.waitUntil()` untuk memisahkan proses berat, dan langsung mengembalikan status `200 OK`.

### FR2: Ekstraksi Dokumen (Google Drive)

* Sistem **HARUS** menggunakan kredensial *Service Account* (ditandatangani secara *edge-compatible*) untuk mendapatkan *Access Token* GDrive.
* Sistem **HARUS** menarik konten teks dari Google Drive berdasarkan ID yang dikirimkan oleh pengguna.
* Sistem **HARUS** membatasi *payload* teks maksimal (misal: 15.000 karakter) untuk mencegah limit token AI tercapai.

### FR3: Pemrosesan AI & Penyimpanan State

* Sistem **HARUS** mengirimkan teks dokumen beserta *system prompt* ke API AI.
* Sistem **HARUS** menyimpan teks balasan AI ke Cloudflare KV menggunakan ID pesan Telegram (`message_id`) sebagai *key*, dengan masa kedaluwarsa (TTL) otomatis selama 24 jam agar KV tidak membengkak.
* Sistem **HARUS** mengirim pesan balasan ke Telegram yang dilengkapi dengan *InlineKeyboardMarkup*.

### FR4: Callback Query & Integrasi Notion

* Sistem **HARUS** merespons *Callback Query* dari Telegram ketika tombol "Simpan ke Notion" ditekan.
* Sistem **HARUS** mengambil teks dari Cloudflare KV berdasarkan `message_id` dari *Callback Query*.
* Sistem **HARUS** mengirimkan permintaan `POST` ke Notion API untuk membuat *Rich Text Block* baru pada *Database ID* yang telah dikonfigurasi.
* Sistem **HARUS** memanggil `editMessageReplyMarkup` Telegram untuk mengubah status tombol setelah berhasil.

## 6. Non-Functional Requirements (NFR)

* **Kinerja Edge:** *Cold start* sistem tidak boleh lebih dari 50ms, yang dijamin dengan menggunakan Hono di atas Cloudflare Workers.
* **Keamanan Kredensial:** Seluruh API Keys, Secret Token, dan Private Key GDrive tidak boleh di-*hardcode*, melainkan harus disimpan dengan aman di Cloudflare Secrets.
* **Ketahanan Kegagalan (Resilience):** Jika API AI mengalami *timeout* atau file GDrive tidak ditemukan, *worker* latar belakang harus mengirim pesan *error* ke obrolan Telegram pengguna alih-alih mati diam-diam (*silent failure*).

## 7. Struktur Data Base (Cloudflare KV)

Berbeda dengan perancangan skema relasional yang kompleks seperti Supabase atau MySQL, Cloudflare KV hanya membutuhkan satu ruang nama (Namespace) sederhana:

| Key Format | Value Type | Deskripsi | TTL (Time to Live) |
| --- | --- | --- | --- |
| `msg_{chat_id}_{message_id}` | String | Teks mentah hasil pemrosesan AI | 86400 detik (24 Jam) |

## 8. Asumsi & Batasan (Out of Scope)

* **Manajemen Pengguna Multi-Tenant:** Saat ini, sistem dirancang sebagai asisten pribadi (*single-user*). Pengembangan *role-based access control* (RBAC) atau otentikasi multi-pengguna tidak termasuk dalam cakupan versi awal ini.
* **Pemrosesan Media Campuran:** Versi ini hanya mendukung ekstraksi teks mentah dari Google Drive Docs/TXT. Ekstraksi OCR dari gambar atau transkripsi audio dari GDrive dikerjakan pada fase pengembangan selanjutnya.

Bagaimana rencana jadwal implementasinya, apakah akan dimulai dengan inisialisasi *repository* Hono terlebih dahulu atau pendaftaran kredensial API?
