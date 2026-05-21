# Deployment Checklist untuk Instagram Scraping

## ✅ Pre-Deployment Checklist

### 1. Dependencies & Installation

- [ ] Install Apify client: `npm install apify-client`
- [ ] Run build locally: `npm run build`
- [ ] Verify no TypeScript errors: `npm run lint`
- [ ] All tests passing: `npm test`

### 2. Environment Setup

#### Local Development (.env.local)

```bash
# Apify Configuration
APIFY_API_KEY=apfy_xxxxxxxxxxxxx
APIFY_INSTAGRAM_ACTOR_ID=apify/instagram-scraper
APIFY_DATASET_CACHE_TTL=3600
INSTAGRAM_SCRAPE_TIMEOUT=30000

# Existing configurations
N8N_MEDSOS_WEBHOOK_URL=https://n8n.example.com/webhook/...
N8N_SHARED_SECRET=your_secret_here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJxxxxx
```

**Get Apify API Key:**
1. Login ke [https://apify.com/console](https://apify.com/console)
2. Go to Settings → Integrations → API Tokens
3. Copy API token (starts with `apfy_`)
4. Verify actor ID exists: `apify/instagram-scraper`

- [ ] APIFY_API_KEY configured
- [ ] APIFY_INSTAGRAM_ACTOR_ID set correctly
- [ ] Cache TTL configured (default: 3600)
- [ ] Timeout configured (default: 30000ms)

### 3. Database Migrations

#### Local Postgres

```bash
# Using psql
psql -U postgres -d your_db_local -f sql/009_instagram_scraping.sql

# Or via SQL client (pgAdmin, DBeaver, etc.)
```

#### Supabase (Production)

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy-paste content dari `sql/009_instagram_scraping.sql`
4. Run query
5. Verify tables created:
   ```sql
   SELECT * FROM information_schema.tables
   WHERE table_name IN (
     'instagram_profiles_cache',
     'medsos_scrape_results'
   );
   ```

- [ ] `instagram_profiles_cache` table created
- [ ] `medsos_scrape_results` table created
- [ ] RLS policies applied
- [ ] Indexes created

### 4. Testing Locally

```bash
# Start dev server
npm run dev

# Test 1: Extract username
curl -X POST http://localhost:3000/api/medsos/scrape-instagram \
  -H "Content-Type: application/json" \
  -d '{"username": "kompascom"}'

# Expected response: success: true with profile data
```

- [ ] Endpoint responds with 200/202
- [ ] Response format valid JSON
- [ ] Cache working (2nd call faster)
- [ ] Error handling works

### 5. Vercel Environment Configuration

#### Via Vercel Dashboard

1. Go to Project Settings → Environment Variables
2. Add variables:

| Key | Value | Type |
|-----|-------|------|
| `APIFY_API_KEY` | `apfy_xxx...` | Secret |
| `APIFY_INSTAGRAM_ACTOR_ID` | `apify/instagram-scraper` | Plain |
| `APIFY_DATASET_CACHE_TTL` | `3600` | Plain |
| `INSTAGRAM_SCRAPE_TIMEOUT` | `30000` | Plain |

**Environment:** Production, Preview, Development

#### Via Vercel CLI

```bash
vercel env add APIFY_API_KEY
# Paste your API key when prompted
# Select: Production, Preview, Development

vercel env add APIFY_INSTAGRAM_ACTOR_ID
# Value: apify/instagram-scraper

vercel env add APIFY_DATASET_CACHE_TTL
# Value: 3600

vercel env add INSTAGRAM_SCRAPE_TIMEOUT
# Value: 30000
```

**Important:** Make sure to set env vars untuk SEMUA environment (dev, preview, prod)

- [ ] All Apify vars added to Vercel
- [ ] All environment types configured
- [ ] Redeployed after adding vars

### 6. Build & Deployment

```bash
# Local build verification
npm run build

# If build succeeds
git add .
git commit -m "feat: add Instagram scraping with Apify"
git push origin main

# Vercel auto-deploys from main
# Check deployment status on Vercel dashboard
```

- [ ] Build passes locally
- [ ] No TypeScript errors
- [ ] Code committed to git
- [ ] Vercel deployment triggered
- [ ] Deployment completes successfully

### 7. Post-Deployment Testing

#### Test 1: Check Health

```bash
curl https://your-vercel-domain.com/api/medsos/scrape-instagram

# Expected: service status with cache info
```

#### Test 2: Test Scraping

```bash
curl -X POST https://your-vercel-domain.com/api/medsos/scrape-instagram \
  -H "Content-Type: application/json" \
  -d '{
    "username": "kompascom",
    "request_id": "deploy_test_001"
  }'

# Expected: Profile data within 5-10 seconds
```

#### Test 3: Check Logs

```bash
# Via Vercel CLI
vercel logs --tail

# Or Vercel Dashboard → Logs
# Check for any errors or warnings
```

- [ ] Health check passes
- [ ] Scraping returns valid data
- [ ] No errors in logs
- [ ] Response time acceptable (< 10s)

### 8. Apify Account Limits

**Free Tier:**
- 5 actor runs per month
- 1 concurrent run
- Limited data export

**Monitoring:**
- Go to Apify Dashboard
- Check monthly usage
- Set spending limit (optional)

**Upgrade Path (if needed):**
- Free → Starter: $9/month
- Includes 5000 actor runs/month
- 10 concurrent runs

- [ ] Apify free tier adequate for usage
- [ ] Set spending limit to prevent overages
- [ ] Monitor usage monthly

---

## 🚨 Deployment Issues & Solutions

### Issue 1: "APIFY_API_KEY not found"

**Symptom:** `Error: APIFY_API_KEY belum dikonfigurasi`

**Solution:**
```bash
# 1. Verify env var in Vercel
vercel env list

# 2. Redeploy after adding
vercel redeploy

# 3. Check build logs
vercel logs --tail

# 4. Hard refresh browser (Ctrl+Shift+R)
```

### Issue 2: "Timeout error in production"

**Symptom:** Request times out after 30s

**Reasons:**
- Profile takes too long to scrape
- Instagram rate-limiting
- Network issue

**Solutions:**
```bash
# 1. Increase timeout for Vercel
# Vercel timeout limit: 30s (free) → 60s (pro)
# So internal timeout should be < 30s

# 2. Use async mode with callback
# Don't wait for scraping

# 3. Check Apify dashboard for task status
```

### Issue 3: "Memory exceeded on Vercel free"

**Symptom:** Function crashes, or very slow responses

**Solutions:**
1. Enable caching (reduce API calls)
   ```bash
   APIFY_DATASET_CACHE_TTL=7200  # 2 hours
   ```

2. Reduce posts fetched
   ```typescript
   resultsLimit: 5  // Instead of 15
   ```

3. Use Vercel Pro tier (512MB vs 128MB)

### Issue 4: "Rate limit from Instagram"

**Symptom:** `errorCode: RATE_LIMIT`

**Solutions:**
```bash
# 1. Increase delay between requests
# Default: 2000ms (2 sec)
# Increase to 5000ms (5 sec)

# 2. Reduce scraping frequency
# Cache untuk 24 jam
APIFY_DATASET_CACHE_TTL=86400

# 3. Don't scrape same profile multiple times
# Check cache first via database
```

### Issue 5: "Database connection fails"

**Symptom:** RLS policy error, or "permission denied"

**Solutions:**
```bash
# 1. Check Supabase is running
# 2. Verify SERVICE_KEY is configured
# 3. Check RLS policies in Supabase dashboard

# Test DB connection:
SELECT 1;
```

---

## 📊 Monitoring Checklist

### Daily Monitoring

- [ ] Check Apify usage (less than quota)
- [ ] Monitor Vercel function invocations
- [ ] Review error logs for patterns
- [ ] Check database cache hit ratio

### Weekly Monitoring

```sql
-- Check cache effectiveness
SELECT
  COUNT(*) as total_requests,
  SUM(CASE WHEN scrape_cache_used THEN 1 ELSE 0 END) as cache_hits,
  ROUND(SUM(CASE WHEN scrape_cache_used THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100, 2) as cache_hit_percent
FROM medsos_scrape_results
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Monthly Review

1. Apify usage vs plan
2. Cost analysis
3. Performance metrics
4. Error rate trends
5. Decision: upgrade plan? adjust caching?

---

## 🔄 Rollback Plan

Jika ada issue production:

### Quick Rollback

```bash
# 1. Revert to previous deploy
vercel deployments
vercel promote [DEPLOYMENT_ID]

# 2. Or revert code
git revert HEAD
git push origin main
# Vercel auto-redeploys
```

### Temporary Disable

```bash
# 1. Update endpoint ke return error
# File: app/api/medsos/scrape-instagram/route.ts

export async function POST() {
  return json({
    success: false,
    error: 'Maintenance - Instagram scraping temporarily disabled',
    errorCode: 'MAINTENANCE'
  }, 503);
}

# 2. Commit & push
# 3. n8n workflow akan receive error dan handle accordingly
```

---

## ✨ Success Criteria

Deployment dianggap **BERHASIL** jika:

- ✅ Endpoint `/api/medsos/scrape-instagram` responds 200
- ✅ Scraping returns valid Instagram profile data
- ✅ Cache working (2nd request faster)
- ✅ Error handling graceful
- ✅ No errors in Vercel logs
- ✅ Response time < 10s (first call)
- ✅ Response time < 100ms (cached)
- ✅ Apify tasks queuing correctly
- ✅ Database entries created in `medsos_scrape_results`
- ✅ RLS policies working (users see own data only)

---

## 📞 Support & Resources

**Need Help?**

1. Check logs: `vercel logs --tail`
2. Apify docs: [https://apify.com/docs](https://apify.com/docs)
3. Instagram Scraper: [https://apify.com/apify/instagram-scraper](https://apify.com/apify/instagram-scraper)
4. Next.js deployment: [https://nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)

**Common Commands:**

```bash
# Check deployment status
vercel status

# View real-time logs
vercel logs --tail

# Redeploy current branch
vercel redeploy

# List recent deployments
vercel deployments

# Cancel deployment
vercel cancel [DEPLOYMENT_ID]
```

