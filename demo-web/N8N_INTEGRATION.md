# Integrasi n8n, Telegram, dan Laravel Subscription

Laravel menyediakan endpoint server-to-server untuk dipanggil n8n sebelum workflow bot memproses perintah pengguna.

## 1. Konfigurasi Laravel

Tambahkan secret panjang di `.env` Laravel:

```env
N8N_SHARED_SECRET=isi-dengan-random-secret-yang-panjang
TELEGRAM_BOT_USERNAME=nama_bot_tanpa_at
```

Jalankan migration:

```bash
php artisan migrate
```

User tidak perlu mengisi Telegram ID saat register. Setelah login, halaman paket akan menampilkan tombol/kode untuk menghubungkan Telegram. User klik tombol itu, lalu Telegram mengirim `/start {kode}` ke bot. n8n kemudian mengirim `telegram_id` dari Telegram dan kode tersebut ke Laravel.

## 2. Menghubungkan akun Telegram

Endpoint:

```http
POST /api/telegram/link
Authorization: Bearer {N8N_SHARED_SECRET}
Content-Type: application/json
```

Body:

```json
{
  "telegram_id": "123456789",
  "link_token": "kode-dari-start-command"
}
```

Response berhasil:

```json
{
  "linked": true,
  "status": "linked",
  "telegram_id": "123456789",
  "user_id": 1,
  "message": "Telegram berhasil terhubung."
}
```

Workflow n8n untuk `/start`:

1. `Telegram Trigger`
2. `IF` command dimulai dengan `/start`
3. `Set` atau expression untuk mengambil kode dari teks `/start {kode}`
4. `HTTP Request` ke `/api/telegram/link`
5. `Telegram Send Message` berisi hasil berhasil/gagal

Expression yang umum dipakai:

- Telegram ID: `{{$json.message.from.id}}`
- Text command: `{{$json.message.text}}`
- Link token dari `/start abc123`: `{{$json.message.text.split(' ')[1]}}`

## 3. Endpoint status subscription

Endpoint:

```http
GET /api/subscription/status/{telegram_id}
Authorization: Bearer {N8N_SHARED_SECRET}
```

Contoh response aktif:

```json
{
  "active": true,
  "telegram_id": "123456789",
  "user_id": 1,
  "status": "active",
  "plan": "30 Hari",
  "start_date": "2026-05-01 10:00:00",
  "end_date": "2026-05-31 10:00:00",
  "days_left": 29,
  "message": "Subscription aktif."
}
```

Contoh response ditolak:

```json
{
  "active": false,
  "telegram_id": "123456789",
  "user_id": 1,
  "status": "expired",
  "days_left": 0,
  "message": "Subscription tidak aktif atau sudah berakhir."
}
```

Jika `telegram_id` belum ada di database, status akan menjadi `not_registered`.

## 4. Workflow n8n untuk validasi subscription

Susunan node:

1. `Telegram Trigger`
2. `HTTP Request`
3. `IF`
4. Cabang `true`: proses perintah bot
5. Cabang `false`: kirim pesan perpanjang subscription

Konfigurasi `HTTP Request`:

- Method: `GET`
- URL: `https://domain-laravel.com/api/subscription/status/{{$json.message.from.id}}`
- Authentication: `None`
- Header:
  - `Authorization`: `Bearer isi-dengan-random-secret-yang-panjang`
- Response Format: `JSON`

Konfigurasi `IF`:

- Value 1: `{{$json.active}}`
- Operation: `is true`

Pesan di cabang false, contoh:

```text
Subscription kamu belum aktif atau sudah habis. Silakan login dan perpanjang paket untuk memakai bot lagi.
```

## 5. Mengamankan webhook n8n

Untuk Telegram bot, cara terbaik adalah jangan membuka webhook n8n sebagai URL publik umum yang mudah ditebak.

- Gunakan Telegram Trigger resmi n8n jika memungkinkan, karena update berasal dari Telegram API.
- Jika memakai Webhook node, gunakan path random panjang, misalnya `/webhook/telegram/8a9f...`.
- Validasi payload minimal memiliki `message.from.id`.
- Simpan secret di credential/env n8n, bukan di node yang mudah diekspor.
- Aktifkan HTTPS.
- Batasi akses n8n dengan reverse proxy, basic auth, VPN, atau allowlist IP jika deployment memungkinkan.
- Jangan pernah menaruh `N8N_SHARED_SECRET` di frontend.

Webhook n8n tetap tidak bisa mem-bypass subscription selama semua cabang workflow memanggil endpoint status ini sebelum menjalankan aksi utama.

## 6. Subscription habis tanpa cron

Endpoint status melakukan lazy expiration. Saat n8n mengecek user, Laravel akan:

1. mencari user dari `telegram_id`;
2. menandai subscription aktif yang `end_date`-nya sudah lewat sebagai `expired`;
3. mengembalikan `active: false`.

Dengan pola ini, bot otomatis menolak perintah setelah masa subscription habis tanpa cron job tambahan.
