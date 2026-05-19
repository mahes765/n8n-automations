# N8N Setup & Debug Guide

## 🔴 Current Issue
```
N8N Webhook tidak respond
- URL: https://n8n-blknxhzbmkij.titanium.sumopod.my.id/webhook-test/medsos-analysis-webhook
- Method: Seharusnya POST, tapi N8N mencoba GET
- Status: "Pembayaran Sedang Diproses" stuck di payment polling
```

## 📋 Checklist Konfigurasi

### 1. ✅ Next.js Environment Variables
Create `.env.local` di project root:
```env
# Existing
NEXT_PUBLIC_APP_URL=https://your-nextjs-domain.com
SUPABASE_SERVICE_ROLE_KEY=your-key
APP_SESSION_SECRET=your-session-secret
MIDTRANS_SERVER_KEY=your-key

# ❌ MISSING - Add this!
N8N_MEDSOS_WEBHOOK_URL=https://n8n-blknxhzbmkij.titanium.sumopod.my.id/webhook/medsos-analysis-webhook
N8N_SHARED_SECRET=your-n8n-auth-token
```

### 2. ✅ N8N Workflow Configuration
**Current Configuration:**
- Webhook Path: `medsos-analysis-webhook`
- HTTP Method: `POST` ✓
- Webhook ID: `5b19ccb2-a8c6-4b40-95b2-b5e669739fae`

**Issue Analysis:**
- URL memiliki `/webhook-test/` (test mode?) - seharusnya `/webhook/`
- Cek apakah workflow sudah di-activate di N8N

### 3. ❌ Possible Problems

#### Problem A: Webhook Path Mismatch
```
Expected: /webhook/medsos-analysis-webhook
Actual:   /webhook-test/medsos-analysis-webhook
Solution: Update N8N workflow path dari "medsos-analysis-webhook" 
          menjadi path yang benar di N8N instance
```

#### Problem B: Workflow Not Activated
```
N8N webhook hanya bisa menerima request jika workflow di-ACTIVATE
Solution: 
1. Login ke N8N instance
2. Buka workflow "WF_Social_Media_Analyst"
3. Click tombol "Activate" di top-right
4. Verify status berubah dari "Inactive" ke "Active"
```

#### Problem C: Wrong HTTP Method
```
N8N mencoba GET padahal harus POST
Reason: Webhook node configuration error
Solution: 
1. Di N8N workflow, cek "Webhook Input (from Next.js)" node
2. Verify: "HTTP Method" = "POST"
3. Verify: "Path" = "medsos-analysis-webhook" (atau sesuai actual path)
```

#### Problem D: Authentication Mismatch
```
N8N mungkin require auth token tapi Next.js tidak mengirim
Solution:
1. Check N8N webhook authentication settings
2. Set N8N_SHARED_SECRET di .env.local
3. Webhook akan auto-send: Authorization: Bearer <token>
```

## 🔧 Testing Steps

### Step 1: Validate N8N Webhook is Active
```bash
# From terminal, test if webhook is accessible
curl -X POST https://n8n-blknxhzbmkij.titanium.sumopod.my.id/webhook/medsos-analysis-webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: Either 200 OK atau specific N8N response (not 404)
# If 404: Webhook path is wrong OR workflow not activated
```

### Step 2: Check N8N Logs
```
1. Login to N8N instance dashboard
2. Go to "Executions" tab
3. Filter by "medsos-analysis-webhook"
4. Look for failed executions
5. Check error message - ini akan kasih clue masalahnya
```

### Step 3: Test from Next.js
```bash
# After fixing .env and N8N setup, test payment flow:
1. Go to /medsos/packages
2. Buy a package
3. Complete payment in Midtrans
4. Watch "Pembayaran Sedang Diproses" page
5. Check logs in:
   - Next.js server logs (for N8N dispatch errors)
   - N8N dashboard (for webhook execution)
```

## 📝 Configuration Checklist

- [ ] `.env.local` created with `N8N_MEDSOS_WEBHOOK_URL` set
- [ ] N8N workflow "WF_Social_Media_Analyst" **ACTIVATED** (not just saved)
- [ ] Webhook HTTP Method = "POST"
- [ ] Webhook Path matches actual N8N path (remove "/webhook-test/" if in test mode)
- [ ] N8N instance firewall allows HTTPS POST from your Next.js server
- [ ] Test curl command returns response (not 404)
- [ ] N8N execution logs show incoming requests

## 🚀 Next Actions (Priority Order)

1. **URGENT**: Set `N8N_MEDSOS_WEBHOOK_URL` in `.env.local`
   ```env
   N8N_MEDSOS_WEBHOOK_URL=https://n8n-blknxhzbmkij.titanium.sumopod.my.id/webhook/medsos-analysis-webhook
   ```

2. **URGENT**: Verify N8N workflow is **ACTIVATED**
   - Go to N8N dashboard
   - Open "WF_Social_Media_Analyst"
   - Click "Activate" button (if not already active)

3. **IMPORTANT**: Test webhook accessibility
   ```bash
   curl -X POST <N8N_MEDSOS_WEBHOOK_URL> \
     -H "Content-Type: application/json" \
     -d '{"test": "true"}'
   ```

4. **IMPORTANT**: Check N8N execution logs for errors

5. Test end-to-end payment flow again

## 📚 Reference

**Next.js Integration Code** (`lib/medsos/requests.ts`):
```typescript
const webhookUrl = process.env.N8N_MEDSOS_WEBHOOK_URL; // ← Must be set!
const response = await fetch(webhookUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" }
});
```

**N8N Workflow Node** (WF_Social_Media_Analyst):
- Webhook Input Path: "medsos-analysis-webhook"
- HTTP Method: "POST"
- Activation Status: ❌ Must be ACTIVE

## Contact N8N Support
If webhook still not responding after checking all above:
- Verify N8N instance URL is correct
- Check if N8N instance is running/healthy
- Look for network firewall issues
- Check N8N logs: `docker logs n8n` (if running in docker)
