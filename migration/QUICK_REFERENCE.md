# 🚀 Instagram Scraping - Quick Reference

## 📌 File Locations

| File | Purpose | Location |
|------|---------|----------|
| **Main Service** | Apify integration | `lib/medsos/apify.ts` |
| **API Endpoint** | HTTP route | `app/api/medsos/scrape-instagram/route.ts` |
| **Helpers** | Utilities & database | `lib/medsos/instagram-helpers.ts` |
| **Migrations** | Database setup | `sql/009_instagram_scraping.sql` |
| **Tests** | Test suite | `scripts/test-instagram-scraping.ts` |
| **Docs** | Full documentation | `INSTAGRAM_IMPLEMENTATION_GUIDE.md` |

---

## 🔧 Common Commands

```bash
# Install dependency
npm install apify-client

# Run dev server
npm run dev

# Run tests locally
npx ts-node scripts/test-instagram-scraping.ts

# Build for production
npm run build

# Database migration (local Postgres)
psql -U postgres -d your_db -f sql/009_instagram_scraping.sql

# Deploy to Vercel
git push origin main  # Auto-deploys

# Check Vercel logs
vercel logs --tail
```

---

## 🔑 Environment Variables

```env
# REQUIRED - Apify credentials
APIFY_API_KEY=apfy_xxxxxxxxxxxxx

# OPTIONAL - with defaults
APIFY_INSTAGRAM_ACTOR_ID=apify/instagram-scraper
APIFY_DATASET_CACHE_TTL=3600
INSTAGRAM_SCRAPE_TIMEOUT=30000
```

**Where to set:**
- Local: `.env.local`
- Vercel: Dashboard → Settings → Environment Variables

---

## 📡 API Quick Reference

### POST /api/medsos/scrape-instagram

**Sync mode (wait for result):**
```bash
curl -X POST http://localhost:3000/api/medsos/scrape-instagram \
  -H "Content-Type: application/json" \
  -d '{"username": "kompascom"}'

# Response: 200 with profile data
```

**Async mode (use callback):**
```bash
curl -X POST http://localhost:3000/api/medsos/scrape-instagram \
  -H "Content-Type: application/json" \
  -d '{
    "username": "kompascom",
    "callback_url": "https://your-domain.com/api/callback"
  }'

# Response: 202 Accepted (queued)
```

**GET status:**
```bash
curl http://localhost:3000/api/medsos/scrape-instagram

# Response: service status & cache info
```

---

## 💻 Code Examples

### Example 1: Simple Usage

```typescript
import { getApifyService } from '@/lib/medsos/apify';

const service = getApifyService();
const result = await service.scrapeProfile('kompascom');

if (result.success) {
  console.log(result.data?.followerCount);
} else {
  console.error(result.error);
}
```

### Example 2: Extract URL

```typescript
import { extractInstagramUsername } from '@/lib/medsos/instagram-helpers';

const username = extractInstagramUsername('https://instagram.com/kompascom');
// Returns: 'kompascom'
```

### Example 3: Batch Processing

```typescript
const results = await service.scrapeMultiple([
  'kompascom',
  'detikcom',
  'kumparan'
]);

Object.entries(results).forEach(([username, result]) => {
  console.log(`${username}: ${result.success ? 'OK' : 'FAIL'}`);
});
```

### Example 4: Database Integration

```typescript
import {
  cacheProfileToDatabase,
  saveScrapeResult
} from '@/lib/medsos/instagram-helpers';

// Save to cache
await cacheProfileToDatabase(username, profileData, 3600);

// Save to history
await saveScrapeResult(requestId, userId, username, result);
```

---

## 🗄️ Database Queries

### Check Cache
```sql
SELECT username, usage_count, expires_at
FROM instagram_profiles_cache
WHERE expires_at > NOW()
ORDER BY usage_count DESC
LIMIT 10;
```

### Check Scrape History
```sql
SELECT username, status, error_code, created_at
FROM medsos_scrape_results
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC
LIMIT 20;
```

### Cache Hit Rate
```sql
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN scrape_cache_used THEN 1 ELSE 0 END) as cache_hits,
  ROUND(SUM(CASE WHEN scrape_cache_used THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as hit_percent
FROM medsos_scrape_results;
```

### Cleanup Expired Cache
```sql
DELETE FROM instagram_profiles_cache
WHERE expires_at < NOW();
```

---

## ⚡ Performance Tuning

### Increase Cache Duration
```bash
# 1 hour (default)
APIFY_DATASET_CACHE_TTL=3600

# 24 hours
APIFY_DATASET_CACHE_TTL=86400
```

**Impact:** More cache hits = less API calls

### Reduce Posts Fetched
In `lib/medsos/apify.ts`, line ~150:
```typescript
// Change from:
resultsLimit: 15

// To:
resultsLimit: 5  // Faster scraping
```

### Adjust Timeout
```bash
# Default 30 seconds
INSTAGRAM_SCRAPE_TIMEOUT=30000

# Increase for slow networks
INSTAGRAM_SCRAPE_TIMEOUT=60000

# Note: Vercel max is 30s on free tier
```

---

## 🐛 Debugging

### Check Service Status
```typescript
import { getApifyService } from '@/lib/medsos/apify';

const service = getApifyService();
const stats = service.getCacheStats();
console.log(stats);
// Output: { entries: 5, ttl: 3600, timeout: 30000 }
```

### Enable Verbose Logging
```typescript
// In apify.ts, uncomment console.log statements
console.log(`[Apify] Scraping Instagram @${username}...`);
console.log(`[Cache Hit] Instagram @${username}`);
console.log(`[Success] Instagram @${username}...`);
```

### Test with Postman

1. Create POST request to `http://localhost:3000/api/medsos/scrape-instagram`
2. Set body:
   ```json
   {"username": "kompascom"}
   ```
3. Send and inspect response

### Check Vercel Logs
```bash
vercel logs --tail

# Filter specific errors
vercel logs --tail | grep Error
```

---

## ❌ Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `APIFY_API_KEY belum dikonfigurasi` | Env var missing | Add to .env.local & restart |
| `PROFILE_NOT_FOUND` | Username doesn't exist | Verify on instagram.com |
| `SCRAPE_TIMEOUT` | Takes > 30s | Increase timeout or use async |
| `RATE_LIMIT` | Instagram blocks requests | Wait 1 hour, try again |
| `EMPTY_RESPONSE` | Apify returned nothing | Check actor status at apify.com |
| `Database connection failed` | RLS policy issue | Check Supabase RLS settings |

---

## 🧪 Quick Test Checklist

Before deploying:

```bash
# 1. Local test
npm run dev
# → POST /api/medsos/scrape-instagram with body {"username":"kompascom"}
# → Should get profile data in < 10 seconds

# 2. Cache test
# → Call same username again
# → Should be instant (< 100ms)

# 3. Error test
# → POST with {"username":"invalid_@_username"}
# → Should get error response with error code

# 4. Build test
npm run build
# → Should complete without errors

# 5. Database test
# Via Supabase SQL Editor:
SELECT COUNT(*) FROM instagram_profiles_cache;
# → Should return 0 or more rows
```

---

## 🚀 Deployment Checklist (Quick)

- [ ] Apify API key ready
- [ ] `.env.local` configured locally
- [ ] Local tests passing
- [ ] Database migration run
- [ ] Commit code: `git push origin main`
- [ ] Vercel env vars added (API key, etc.)
- [ ] Deployment completes successfully
- [ ] Test production endpoint
- [ ] Check Vercel logs for errors
- [ ] Monitor for 24 hours

---

## 📞 Quick Support

**Problem?** Follow this order:

1. Check **logs**: `vercel logs --tail`
2. Check **environment**: `vercel env list`
3. Check **database**: Supabase dashboard → SQL Editor
4. Check **Apify dashboard**: Account & usage
5. Review **error code**: See error mapping in `lib/medsos/apify.ts`
6. See full **troubleshooting** in `INSTAGRAM_IMPLEMENTATION_GUIDE.md`

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Apify** | https://apify.com |
| **Instagram Scraper** | https://apify.com/apify/instagram-scraper |
| **Vercel Console** | https://vercel.com/dashboard |
| **Supabase Console** | https://supabase.com/dashboard |
| **Next.js Docs** | https://nextjs.org/docs |

---

## 💡 Pro Tips

1. **Use request_id for tracking**
   ```json
   {"username": "kompascom", "request_id": "req_12345"}
   ```
   → Helps debugging and correlating logs

2. **Implement circuit breaker**
   - If Apify down, return cached data
   - Don't cascade failures

3. **Set spending limit on Apify**
   - Prevent unexpected charges
   - Apify → Settings → Spending limit

4. **Monitor monthly quota**
   - Set reminder to check usage
   - Plan upgrade early if needed

5. **Cache aggressively for Vercel**
   - Free tier = cold starts
   - Cache reduces API calls & cost

---

**Need full documentation?** See `DOCUMENTATION_INDEX.md`

**Ready to deploy?** See `DEPLOYMENT_CHECKLIST.md`

**Want examples?** See `INSTAGRAM_IMPLEMENTATION_GUIDE.md`
