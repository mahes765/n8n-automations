# Midtrans Integration Setup Guide

## Prerequisites

1. Install Midtrans PHP Library:
```bash
composer require midtrans/midtrans-php
```

## Environment Configuration

Add these to your `.env` file:

```env
# Midtrans Configuration - Sandbox (Development)
MIDTRANS_MODE=sandbox
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxxxxxxxxxx
MIDTRANS_IS_PRODUCTION=false
MIDTRANS_IS_SANITIZED=true
MIDTRANS_IS_3DS=true

# For Production:
# MIDTRANS_MODE=production
# MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxxxxxxxxxxxxxxx
# MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxxxxxxxxxxxxxxx
# MIDTRANS_IS_PRODUCTION=true
```

## Get Midtrans Credentials

### Sandbox (Development)
1. Go to https://dashboard.sandbox.midtrans.com
2. Sign up for a free account
3. Get your Server Key and Client Key from Dashboard → Settings

### Production
1. Go to https://dashboard.midtrans.com
2. Sign up for an account
3. Complete verification process
4. Get your Server Key and Client Key

## Payment Flow

### 1. User Subscribe
```
POST /subscribe
{
  "plan_id": 1
}
```

### 2. Backend Creates Transaction
- Creates Transaction record with status `PENDING`
- Creates Subscription record with status `PENDING`
- Calls `MidtransService::createTransaction()`

### 3. Get Snap Token
- Sends complete request to Midtrans API
- Receives `snap_token` (JWT token)
- Returns `redirect_url` to client

```
Response:
{
  "snap_token": "xxx_token_xxx",
  "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/xxx_token_xxx",
  "transaction_id": 1,
  "midtrans_order_id": "ORDER-1-20260429140523-ABCDEF"
}
```

### 4. User Pays in Snap UI
- User redirected to Midtrans Snap UI
- User selects payment method
- User completes payment

### 5. Webhook Callback
- Midtrans sends webhook to `POST /api/webhook/midtrans`
- Webhook payload includes transaction status
- Backend validates signature
- Updates Transaction status
- If PAID: Activates Subscription

## Request Body Sent to Midtrans

```json
{
  "transaction_details": {
    "order_id": "ORDER-1-20260429140523-ABCDEF",
    "gross_amount": 50000
  },
  "item_details": [
    {
      "id": "PLAN-1",
      "price": 50000,
      "quantity": 1,
      "name": "Premium Plan",
      "brand": "Subscription",
      "category": "Digital Service"
    }
  ],
  "customer_details": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+62800000000"
  },
  "enabled_payments": [
    "credit_card",
    "bca_va",
    "bni_va",
    "bri_va",
    "cimb_va",
    "permata_va",
    "gopay",
    "shopeepay"
  ],
  "callbacks": {
    "finish": "https://yourapp.com/payment/success",
    "error": "https://yourapp.com/payment/failed",
    "unfinish": "https://yourapp.com/payment/failed"
  },
  "expiry": {
    "unit": "hours",
    "duration": 24
  }
}
```

## Testing

### Test Credit Card (Sandbox)
- Number: `4111111111111111`
- Expiry: Any future date (e.g., `12/25`)
- CVV: `123`
- OTP: `123456`

### Other Test Credentials
- VA Bank Number: Any number
- VA Expired: Auto-expired, create new one to test

## Webhook Signature Validation

Signature formula:
```
SHA512(order_id + status_code + gross_amount + server_key)
```

Example:
```php
$orderId = "ORDER-1-20260429140523-ABCDEF";
$statusCode = "200";
$grossAmount = "50000";
$serverKey = "SB-Mid-server-xxx";

$signature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);
```

## Troubleshooting

### SSL Certificate Error
- Development: Automatically bypassed in non-production
- Production: Must use valid SSL certificates
- Check firewall/proxy settings if still failing

### Empty Token Returned
- Verify MIDTRANS_SERVER_KEY is correct
- Check Midtrans API status at https://status.midtrans.com
- Enable debug logging to see API response

### Webhook Not Received
- Verify webhook URL is publicly accessible
- Check Server Key matches for signature validation
- Enable webhook in Midtrans Dashboard → Settings → Webhook

### Transaction Not Found
- Verify order_id exists in transactions table
- Check webhook payload contains required fields:
  - `order_id`
  - `transaction_status`
  - `gross_amount`
  - `status_code`
  - `signature_key`

## Files Modified

1. **MidtransService.php** - Request token from Midtrans
2. **AppServiceProvider.php** - Always use MidtransService (no fake mode)
3. **WebhookController.php** - Handle Midtrans webhooks
4. **routes/web.php** - Removed fake payment routes
5. **config/services.php** - Midtrans configuration

## Database Schema

### transactions table
- `id` - Primary key
- `user_id` - Foreign key to users
- `plan_id` - Foreign key to subscription_plans
- `midtrans_order_id` - Order ID sent to Midtrans
- `status` - pending, paid, failed, expired
- `gross_amount` - Amount in IDR
- `payment_type` - Payment method used
- `settlement_time` - When payment settled
- `raw_response` - Raw Midtrans webhook response

### subscriptions table
- `id` - Primary key
- `user_id` - Foreign key to users
- `plan_id` - Foreign key to subscription_plans
- `transaction_id` - Foreign key to transactions
- `status` - pending, active, inactive, expired
- `start_date` - When subscription starts
- `end_date` - When subscription ends

## Useful Links

- Midtrans Docs: https://docs.midtrans.com
- Snap Documentation: https://docs.midtrans.com/en/snap/overview
- Webhook Documentation: https://docs.midtrans.com/en/after-payment/http-notification
- PHP Library: https://github.com/Midtrans/midtrans-php
