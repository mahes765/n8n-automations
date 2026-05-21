# Solusi Instagram Scraping untuk Vercel Free Tier

## 📋 Ringkasan Masalah

Endpoint Instagram native (`https://www.instagram.com/{{ $json.ig_username }}/?__a=1`) **tidak berfungsi lagi** karena:
- Instagram menutup API internal (graph query endpoint)
- POST request ke endpoint ini di-block oleh Instagram
- Diperlukan alternatif yang stabil dan sesuai resource Vercel

---

## 🏗️ Solusi Arsitektur Backend

### Pendekatan yang Dipilih: Apify API

**Alasan Memilih Apify:**
✅ Lightweight (API-based, tidak perlu Playwright di Vercel)
✅ Reliable (Instagram scraper yang sudah teruji)
✅ Cost-effective (free tier 5 tasks/bulan)
✅ Cepat (~2-5 detik per profile)
✅ Response format yang terstruktur
✅ Mudah diintegrasikan

### Arsitektur Alur

```
n8n Webhook 
    ↓
[POST /api/medsos/instagram-scrape] ← Backend endpoint baru
    ↓
[Queue System] ← Apify task queue management
    ↓
[Apify Instagram Scraper Actor]
    ↓
[Parse & Normalize Response]
    ↓
[Return to n8n via callback]
```

### Keuntungan Arsitektur Ini

1. **Decoupled dari n8n**: Backend bertanggung jawab scraping, n8n fokus orchestration
2. **Reusable**: Endpoint bisa digunakan dari berbagai tempat
3. **Cached**: Responses bisa di-cache untuk mengurangi Apify quota
4. **Resilient**: Error handling yang jelas
5. **Scalable**: Mudah di-upgrade atau ganti provider

---

## 🔧 Implementasi Backend

### 1. Setup Apify Client

```bash
npm install apify-client
```

### 2. Environment Variables

Tambahkan ke `.env.local`:

```env
APIFY_API_KEY=your_apify_api_key
APIFY_INSTAGRAM_ACTOR_ID=apify/instagram-scraper  # atau actor ID lain
APIFY_DATASET_CACHE_TTL=3600  # Cache 1 jam
INSTAGRAM_SCRAPE_TIMEOUT=30000  # 30 detik timeout
```

### 3. Data Flow

**Input (dari n8n):**
```json
{
  "request_id": "123",
  "callback_token": "token",
  "ig_username": "kompascom",
  "progress_callback_url": "https://...",
  "result_callback_url": "https://..."
}
```

**Output (ke n8n):**
```json
{
  "request_id": "123",
  "callback_token": "token",
  "ig_data": {
    "username": "kompascom",
    "followers": 1234567,
    "following": 150,
    "bio": "...",
    "posts": [
      {
        "id": "post_id",
        "caption": "...",
        "likes": 5000,
        "comments": 250,
        "timestamp": "2026-05-21T..."
      }
    ]
  },
  "status": "success"
}
```

---

## 📊 Perbandingan Opsi

| Aspek | Instagram API Native | Apify Actor | Playwright |
|-------|---------------------|------------|-----------|
| **Maintenance** | Maintained oleh Instagram | ✅ Maintained | Perlu maintain sendiri |
| **Reliability** | ❌ Deprecated | ✅ High | ⚠️ Instagram blocks |
| **Vercel Free Tier** | N/A | ✅ Cocok | ❌ Resource heavy |
| **Cost** | Free | ✅ 5 tasks free/bulan | Free |
| **Speed** | N/A | ✅ 2-5 sec | ⚠️ 10-30 sec |
| **Data Quality** | N/A | ✅ Lengkap | ✅ Lengkap |
| **Setup Complexity** | N/A | ⭐⭐ Easy | ⭐⭐⭐⭐ Hard |

---

## 💰 Cost Estimation untuk Vercel Free Tier

### Apify Pricing
- **Free Tier**: 5 actor runs/bulan
- **Paid Tier**: $9-500/bulan sesuai usage

### Estimasi Usage
```
Skenario 1: 10 users × 1 analysis/bulan = 10 tasks/bulan
→ Perlu Apify paid tier (~$9/bulan)

Skenario 2: 2 users × 2 analysis/bulan = 4 tasks/bulan  
→ Bisa pakai free tier
```

### Alternatif Cost Savings
1. **Cache responses**: 3600s TTL bisa menghemat hingga 70% API calls
2. **Batch processing**: Proses multiple profiles dalam 1 task
3. **Smart queuing**: Jangan scrape profile yang sudah scraped hari ini

---

## ⚙️ Implementasi Step-by-Step

### Phase 1: Setup Apify Service (Backend)
→ Buat `lib/medsos/apify.ts`
→ Handle API calls dan response parsing
→ Implement caching

### Phase 2: Create Endpoint
→ Buat `/api/medsos/scrape-instagram`
→ Validasi input
→ Queue ke Apify

### Phase 3: Callback Handler
→ Existing `/api/n8n/medsos/result`
→ Menerima hasil dari backend

### Phase 4: Integration ke n8n
→ Update workflow untuk call backend endpoint
→ Testing end-to-end

---

## 🚀 Performance Optimization untuk Vercel Free

### 1. Response Streaming (Jika data besar)
```typescript
// Gunakan streaming untuk response besar
response.headers.set('Content-Type', 'application/json');
response.write(chunk); // Partial write
```

### 2. Background Jobs (Recommended)
```typescript
// Trigger scraping tanpa menunggu
await triggerApifyTask(/* params */);
return json({ status: 'queued' });

// Callback ke n8n nanti
```

### 3. Data Compression
```typescript
// Compress response sebelum kirim
const compressed = compress(igData);
```

### 4. Caching Strategy
```
First time scraping @kompascom:
- Call Apify API (~3 sec)
- Store hasil ke Supabase cache
- Return cached version selama 1 jam

Scraping ulang dalam 1 jam:
- Langsung return dari cache
- Tidak hit Apify quota
```

---

## 🛡️ Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `APIFY_API_KEY_INVALID` | Key salah | Verify di Apify dashboard |
| `ACTOR_NOT_FOUND` | Actor ID salah | Check apify/instagram-scraper exists |
| `INSTAGRAM_TIMEOUT` | Profile takes too long | Increase timeout atau skip |
| `RATE_LIMIT` | Instagram blocks scraper | Wait & retry dengan exponential backoff |
| `PROFILE_NOT_FOUND` | Username tidak ada | Return error gracefully |

---

## 📝 Next Steps

1. ✅ Setup Apify account & get API key
2. ⏳ Implement `lib/medsos/apify.ts` service
3. ⏳ Create `/api/medsos/scrape-instagram` endpoint
4. ⏳ Update n8n workflow ke gunakan new endpoint
5. ⏳ Testing & deployment

**Fokus current**: Hanya backend implementation (Step 1-3)
**Integrasi n8n**: Step 4-5 (akan dilakukan setelah backend siap)

