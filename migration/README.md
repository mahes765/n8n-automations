# Next.js + Supabase Subscription System

Migrasi dari `demo-web` Laravel/MySQL ke Next.js App Router + Supabase PostgreSQL.

## Fitur

- Register, login, logout dengan cookie session server-side.
- Password Laravel bcrypt hasil migrasi tetap bisa dipakai.
- Halaman paket subscription.
- Pembuatan transaksi Midtrans Snap.
- Webhook Midtrans untuk mengaktifkan, menggagalkan, atau meng-expire subscription.
- Link akun Telegram via token `/start`.
- Endpoint n8n untuk cek subscription berdasarkan Telegram ID.
- SQL schema dan SQL migrasi data dari MySQL ke Supabase.

## Setup

1. Install dependency:

```bash
npm install
```

2. Copy env:

```bash
cp .env.example .env
```

3. Isi `.env`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APP_SESSION_SECRET=random-panjang
N8N_SHARED_SECRET=random-panjang-lain
TELEGRAM_BOT_USERNAME=nama_bot_tanpa_at
MIDTRANS_SERVER_KEY=SB-Mid-server-key
MIDTRANS_CLIENT_KEY=SB-Mid-client-key
MIDTRANS_IS_PRODUCTION=false
```

4. Jalankan SQL Supabase:

```text
sql/001_schema.sql
sql/002_seed_plans.sql
```

5. Jalankan app:

```bash
npm run dev
```

## Endpoint

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/plans`
- `POST /api/subscribe`
- `POST /api/webhook/midtrans`
- `GET /api/user/subscription`
- `POST /api/telegram/link`
- `GET /api/subscription/status/{telegramId}`
- `GET /api/n8n/telegram`
- `GET /api/n8n/form`

Endpoint `POST /api/telegram/link` dan `GET /api/subscription/status/{telegramId}` wajib memakai:

```http
Authorization: Bearer {N8N_SHARED_SECRET}
```

atau:

```http
X-N8N-Secret: {N8N_SHARED_SECRET}
```

## Migrasi Data MySQL ke Supabase

Urutan aman:

1. Jalankan `sql/001_schema.sql` di Supabase.
2. Jalankan `sql/003_mysql_export.sql` di MySQL lama untuk membuat CSV:
   - `users.csv`
   - `subscription_plans.csv`
   - `transactions.csv`
   - `subscriptions.csv`
3. Jalankan bagian pembuatan staging table di `sql/004_supabase_import_from_csv.sql`.
4. Import CSV ke staging table lewat Supabase Table Editor.
5. Jalankan bagian insert final di `sql/004_supabase_import_from_csv.sql`.

Catatan:

- `id` lama dipertahankan supaya relasi `transactions` dan `subscriptions` tetap cocok.
- Password Laravel bcrypt dipertahankan. Kode login Next.js sudah menangani prefix `$2y$`.
- Kalau MySQL tidak mengizinkan `INTO OUTFILE`, export CSV bisa dilakukan lewat tool database, asalkan urutan kolom sama dengan staging table.

## Konfigurasi Midtrans

Set Payment Notification URL di dashboard Midtrans ke:

```text
https://domain-kamu.com/api/webhook/midtrans
```

Subscription hanya aktif setelah webhook valid masuk. Redirect sukses dari Midtrans tidak mengaktifkan subscription.

## Workflow n8n Telegram

Untuk `/start {kode}`:

1. Telegram Trigger.
2. Ambil Telegram ID: `{{$json.message.from.id}}`.
3. Ambil token: `{{$json.message.text.split(' ')[1]}}`.
4. HTTP Request:
   - Method: `POST`
   - URL: `https://domain-kamu.com/api/telegram/link`
   - Header: `Authorization: Bearer {N8N_SHARED_SECRET}`
   - Body JSON:

```json
{
  "telegram_id": "{{$json.message.from.id}}",
  "link_token": "{{$json.message.text.split(' ')[1]}}"
}
```

Untuk validasi akses sebelum menjalankan command bot:

```http
GET https://domain-kamu.com/api/subscription/status/{{$json.message.from.id}}
Authorization: Bearer {N8N_SHARED_SECRET}
```

Lanjutkan workflow hanya jika response `active` bernilai `true`.
