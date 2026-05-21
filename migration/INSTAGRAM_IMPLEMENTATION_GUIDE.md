# Instagram Scraping Implementation Guide

## 🚀 Quick Start

### 1. Setup Apify Account

1. Go to [https://apify.com](https://apify.com)
2. Sign up (free tier available)
3. Get your API key dari Settings → Integrations → API tokens
4. Find actor ID: `apify/instagram-scraper` di actor marketplace

### 2. Add Environment Variables

Tambahkan ke `.env.local`:

```env
# Apify Configuration
APIFY_API_KEY=your_api_key_here
APIFY_INSTAGRAM_ACTOR_ID=apify/instagram-scraper
APIFY_DATASET_CACHE_TTL=3600
INSTAGRAM_SCRAPE_TIMEOUT=30000

# Existing vars
N8N_MEDSOS_WEBHOOK_URL=https://...
N8N_SHARED_SECRET=your_secret
```

### 3. Install Dependencies

```bash
npm install apify-client
```

### 4. Run Database Migration

```bash
# Backup dulu
# Then run:
psql -U postgres -d your_db -f sql/009_instagram_scraping.sql
```

Atau melalui Supabase dashboard:
1. Go to SQL Editor
2. Copy-paste content dari `sql/009_instagram_scraping.sql`
3. Run

---

## 📝 API Endpoints

### Endpoint 1: Scrape Instagram Profile

**URL:** `POST /api/medsos/scrape-instagram`

**Request Body:**

```json
{
  "username": "kompascom",
  "request_id": "req_12345",
  "n8n_secret": "optional_secret"
}
```

**Response (Success):**

```json
{
  "success": true,
  "data": {
    "username": "kompascom",
    "fullName": "Kompas",
    "biography": "...",
    "followerCount": 1234567,
    "followingCount": 150,
    "postsCount": 5000,
    "profilePicUrl": "https://...",
    "isVerified": true,
    "isBusinessAccount": true,
    "posts": [
      {
        "id": "post_id_123",
        "caption": "Caption post...",
        "likeCount": 5000,
        "commentCount": 250,
        "timestamp": "2026-05-21T10:30:00Z",
        "imageUrl": "https://...",
        "isCarousel": false
      }
    ]
  },
  "request_id": "req_12345",
  "timestamp": "2026-05-21T10:35:00Z"
}
```

**Response (Error):**

```json
{
  "success": false,
  "error": "Profile Instagram @kompascom tidak ditemukan",
  "errorCode": "PROFILE_NOT_FOUND",
  "request_id": "req_12345"
}
```

**Error Codes:**

| Code | Meaning | Solution |
|------|---------|----------|
| `INVALID_USERNAME` | Username format salah | Check format (no special chars except . and _) |
| `PROFILE_NOT_FOUND` | Profile tidak ada | Verify username exists |
| `SCRAPE_TIMEOUT` | Timeout > 30s | Try again, Instagram slow |
| `RATE_LIMIT` | Instagram blocks requests | Wait 1 hour, try again |
| `APIFY_AUTH_ERROR` | API key invalid | Check Apify settings |
| `SERVER_ERROR` | Server error | Check logs |

---

### Endpoint 2: Async Scraping dengan Callback

Untuk profile yang scrape-nya lama, gunakan async mode:

**Request:**

```json
{
  "username": "kompascom",
  "request_id": "req_12345",
  "callback_url": "https://your-domain.com/api/callback/instagram"
}
```

**Response (202 Accepted):**

```json
{
  "success": true,
  "status": "queued",
  "message": "Scraping dimulai, hasil akan dikirim ke callback URL",
  "request_id": "req_12345"
}
```

Hasil akan di-POST ke `callback_url`:

```json
{
  "request_id": "req_12345",
  "success": true,
  "data": { /* profile data */ }
}
```

---

### Endpoint 3: Get Service Status

**URL:** `GET /api/medsos/scrape-instagram`

**Response:**

```json
{
  "service": "apify-instagram-scraper",
  "status": "active",
  "cache": {
    "entries": 3,
    "ttl": 3600,
    "timeout": 30000
  }
}
```

---

## 💻 Usage Examples

### Example 1: Simple Scrape

```typescript
// From Frontend atau Backend
const response = await fetch('/api/medsos/scrape-instagram', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'kompascom'
  })
});

const result = await response.json();

if (result.success) {
  console.log(`Followers: ${result.data.followerCount}`);
  console.log(`Posts: ${result.data.posts.length}`);
} else {
  console.error(`Error: ${result.error}`);
}
```

### Example 2: Parse URL

```typescript
import { extractInstagramUsername } from '@/lib/medsos/instagram-helpers';

// From various formats
const username1 = extractInstagramUsername('kompascom'); // -> 'kompascom'
const username2 = extractInstagramUsername('https://instagram.com/kompascom'); // -> 'kompascom'
const username3 = extractInstagramUsername('https://www.instagram.com/kompascom/'); // -> 'kompascom'
```

### Example 3: Batch Scraping

```typescript
import { getApifyService } from '@/lib/medsos/apify';

const service = getApifyService();

const results = await service.scrapeMultiple([
  'kompascom',
  'detikcom',
  'kumparan'
]);

Object.entries(results).forEach(([username, result]) => {
  if (result.success) {
    console.log(`${username}: ${result.data?.followerCount} followers`);
  } else {
    console.error(`${username}: ${result.error}`);
  }
});
```

### Example 4: Direct Service Usage

```typescript
import { getApifyService, ApifyInstagramProfile } from '@/lib/medsos/apify';

const service = getApifyService();

const result = await service.scrapeProfile('kompascom');

if (result.success) {
  const profile: ApifyInstagramProfile = result.data!;
  
  // Use profile data
  console.log(profile.username);
  console.log(profile.followerCount);
  console.log(profile.posts);
} else {
  console.error(`Error: ${result.errorCode} - ${result.error}`);
}
```

### Example 5: Save ke Database

```typescript
import {
  cacheProfileToDatabase,
  saveScrapeResult,
  getUserScrapeHistory
} from '@/lib/medsos/instagram-helpers';

// Save ke cache
if (result.success) {
  await cacheProfileToDatabase(username, result.data!, 3600);
}

// Save ke history
await saveScrapeResult('req_123', userId, username, result);

// Get history
const history = await getUserScrapeHistory(userId);
```

---

## 🔗 Integration dengan n8n (Preview)

Setelah backend ready, update n8n workflow:

**Old Flow:**
```
HTTP Request POST https://instagram.com/...?__a=1
    ↓ (TIDAK BERFUNGSI)
```

**New Flow:**
```
HTTP Request POST https://your-domain.com/api/medsos/scrape-instagram
  {
    "username": "{{ $json.ig_username }}",
    "request_id": "{{ $json.request_id }}",
    "callback_url": "{{ $json.result_callback_url }}"
  }
  ↓
Parse Response
  ↓
Send Results
```

Detail akan dibahas di fase integrasi.

---

## ⚙️ Performance Tips

### 1. Caching Strategy

```typescript
// Cache 1 jam untuk profiles
APIFY_DATASET_CACHE_TTL=3600

// Jika profile jarang berubah, naikkan:
APIFY_DATASET_CACHE_TTL=86400  // 24 jam
```

**Benefit:**
- Reduce Apify API calls 70%
- Faster response (cached < 100ms vs 3-5s fresh)
- Save quota (5 free tasks/month)

### 2. Batch Processing

```typescript
// ❌ JANGAN: Loop individual profiles
for (const username of usernames) {
  await scrapeProfile(username);  // Calls queue up
}

// ✅ GUNAKAN: Batch dengan delay
const results = await service.scrapeMultiple(usernames);
// Automatically sequential dengan 2s delay
```

### 3. Rate Limiting

```typescript
// Set max concurrent tasks
MAX_CONCURRENT_SCRAPES=2

// Avoid Instagram rate limit:
// - Max 1 profile per 2 seconds
// - Max 100 profiles per day
// - Randomize timing
```

### 4. Async Mode untuk Vercel

```typescript
// ❌ SYNC (Bad untuk Vercel - timeout 30s)
await service.scrapeProfile(username);

// ✅ ASYNC (Good - return immediately)
apifyService.scrapeProfile(username).then(result => {
  sendCallback(callback_url, result);
});

return json({ status: 'queued' }, 202);
```

---

## 🚨 Troubleshooting

### Problem: "APIFY_API_KEY belum dikonfigurasi"

**Solution:**
```bash
# Check .env.local
cat .env.local | grep APIFY

# Verify key at Apify dashboard
# Restart dev server
npm run dev
```

### Problem: "Timeout saat scraping (>30000ms)"

**Solutions:**
1. Profile sedang pending (loading lama)
2. Instagram sedang rate-limit
3. Network issue

**Action:**
```typescript
// Increase timeout
INSTAGRAM_SCRAPE_TIMEOUT=60000  // 60s

// Or use async mode
callback_url: "https://..."
```

### Problem: "Profile Instagram not ditemukan"

**Check:**
1. Username exists di Instagram?
   ```bash
   # Manual check
   https://instagram.com/username/
   ```

2. Username format valid?
   - No spaces
   - No special chars (except . dan _)
   - 3-30 characters

3. Instagram blocking Apify?
   - Try dengan actor berbeda
   - Wait dan retry nanti

### Problem: "Rate limit - Instagram memblock"

**Solution:**
1. Wait 1-2 jam
2. Use proxy service (berbayar)
3. Reduce scraping frequency
4. Batch requests dengan delay

---

## 📊 Monitoring & Logging

### Check Cache Status

```bash
curl https://your-domain.com/api/medsos/scrape-instagram

# Response:
{
  "service": "apify-instagram-scraper",
  "status": "active",
  "cache": { "entries": 5, "ttl": 3600 }
}
```

### Check Database Cache

```sql
SELECT username, usage_count, expires_at
FROM public.instagram_profiles_cache
WHERE expires_at > NOW()
ORDER BY usage_count DESC;
```

### Monitor Scrape Results

```sql
SELECT
  DATE(created_at) as date,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'success' THEN 1 END) as success_count
FROM public.medsos_scrape_results
GROUP BY DATE(created_at), status
ORDER BY date DESC;
```

---

## 🔄 Next Steps

**Current Status:** Backend implementation complete ✅

**Remaining:**
1. Deploy ke Vercel
2. Test endpoints dengan Postman/curl
3. Update n8n workflow untuk gunakan new endpoint
4. End-to-end testing
5. Monitor production

