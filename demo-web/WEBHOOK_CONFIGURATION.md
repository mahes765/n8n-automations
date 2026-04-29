# Cara Fix Subscription Pending Issue

## Problem
- Database subscription selalu PENDING
- Padahal pembayaran sudah BERHASIL di Midtrans
- Penyebab: Webhook tidak dikonfigurasi

## Solution

### 1. Configure Webhook di Midtrans Dashboard

**Step 1: Login ke Midtrans Sandbox Dashboard**
- https://dashboard.sandbox.midtrans.com

**Step 2: Pergi ke Settings**
- Menu → Settings → Configuration

**Step 3: Atur Webhook URL**
- **Notification URL**: `http://YOUR_PUBLIC_URL/api/webhook/midtrans`
- **Overwrite Notification URL**: Check (jika ada)
- Save/Update

**PENTING**: URL harus:
- ✅ Public (bisa diakses dari internet)
- ✅ Bukan localhost (Midtrans tidak bisa akses localhost)
- ✅ HTTPS (untuk production), HTTP bisa untuk sandbox
- ✅ Exact path: `/api/webhook/midtrans`

### 2. Jika menggunakan localhost, gunakan Tunnel Service

Untuk development, gunakan **ngrok** atau **localhost.run**:

```bash
# Option A: ngrok
ngrok http 8000
# Copy generated URL, misal: https://abc123.ngrok.io
# Set webhook URL di Dashboard: https://abc123.ngrok.io/api/webhook/midtrans

# Option B: localhost.run
ssh -R 80:localhost:8000 localhost.run
# Use: http://your-username-12345.localhost.run/api/webhook/midtrans
```

### 3. Test Webhook Manually

Di terminal, jalankan:

```bash
curl -X POST http://127.0.0.1:8000/api/webhook/midtrans \
  -H "Content-Type: application/json" \
  -H "X-Midtrans-Signature: test-signature" \
  -d '{
    "order_id": "TEST-ORDER-1",
    "transaction_status": "settlement",
    "transaction_id": "test-transaction-id",
    "status_code": "200",
    "gross_amount": "50000",
    "payment_type": "credit_card"
  }'
```

Expected response:
```json
{
  "status": "ok"
}
```

### 4. Check Logs untuk Debug

```bash
# Lihat log dari webhook processing
tail -f storage/logs/laravel.log | grep -i midtrans

# Atau check database
SELECT * FROM transactions WHERE status = 'pending';
SELECT * FROM subscriptions WHERE status = 'pending';
```

## Debugging Checklist

- [ ] Webhook URL sudah di-set di Midtrans Dashboard
- [ ] URL adalah public/accessible dari Midtrans (bukan localhost)
- [ ] URL path exact: `/api/webhook/midtrans`
- [ ] Database connection OK
- [ ] Laravel logs tidak ada error
- [ ] Midtrans server_key & client_key correct
- [ ] Payment berhasil di Midtrans (transaction_status = settlement/capture)

## Expected Database State After Payment

```sql
-- Transactions table
SELECT * FROM transactions WHERE user_id = 2;
-- Status should be: PAID (not PENDING)

-- Subscriptions table
SELECT * FROM subscriptions WHERE user_id = 2;
-- Status should be: ACTIVE (not PENDING)
-- start_date & end_date should be filled
```

## Webhook Signature Validation

Jika ada error "Invalid Midtrans signature", pastikan:
1. `MIDTRANS_SERVER_KEY` correct di `.env`
2. Signature dibuat dari: `order_id + status_code + gross_amount + server_key`
3. Hash menggunakan SHA512

## Quick Test dengan Payment Sukses

```bash
# 1. Start server
php artisan serve

# 2. Akses halaman plans
http://127.0.0.1:8000/plans

# 3. Pilih paket, klik "Pilih Paket"

# 4. Snap popup muncul, gunakan test card:
# Number: 4111111111111111
# Exp: 12/25
# CVV: 123
# OTP: 123456

# 5. Klik "Pay"

# 6. Jika webhook sudah di-configure:
# - Akan di-redirect ke /payment/success
# - Database subscription status berubah ke ACTIVE
# - Dapat akses n8n endpoints

# 7. Jika webhook BELUM di-configure:
# - Akan di-redirect ke /payment/success (dari frontend callback)
# - TAPI database masih PENDING
# - Tidak bisa akses n8n endpoints (karena subscription.active middleware check)
```

## Buat Webhook URL untuk Testing (tanpa ngrok)

Jika mau setup webhook testing tanpa ngrok, buat route untuk simulate webhook:

```php
// routes/web.php (hanya untuk testing!)
Route::post('/test-webhook', function (Request $request) {
    $request->merge([
        'order_id' => $request->input('order_id'),
        'transaction_status' => 'settlement',
        'status_code' => '200',
        'gross_amount' => $request->input('gross_amount'),
        'payment_type' => 'credit_card',
    ]);
    
    return app(\App\Http\Controllers\WebhookController::class)->handleMidtrans(
        app(\App\Http\Requests\PaymentWebhookRequest::class)
    );
});
```

Terus call:
```bash
curl -X POST http://127.0.0.1:8000/test-webhook \
  -d "order_id=ORDER-1-20260429&gross_amount=50000"
```

---

## Resume

**Masalahnya**: Webhook belum dikonfigurasi di Midtrans Dashboard
**Solusinya**: 
1. Set webhook URL di Dashboard → Settings → Configuration
2. Gunakan URL public (bukan localhost)
3. Test payment flow kembali
4. Database subscription akan auto-update ke ACTIVE

Setelah webhook jalan, subscription akan otomatis ACTIVE saat pembayaran berhasil! ✅
