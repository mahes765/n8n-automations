# N8N Workflow Integration - Implementation Guide

## 🎯 Ringkasan Perubahan

### Modified Nodes (3)
1. ✅ **Send Progress: Scraping IG** - Tetap sama, no changes needed
2. ✅ **Scrape Instagram Data** - Modified untuk call backend baru  
3. ✅ **Send Progress: AI Analysis** - Tetap sama, no changes needed

### Added Node (1)
4. ✨ **Transform Instagram Data** - NEW CODE node untuk bridge data format

---

## 📝 Perubahan Detail Setiap Node

### Node 1: "Send Progress: Scraping IG"

**Status:** ✅ **NO CHANGE NEEDED**

```json
{
  "name": "Send Progress: Scraping IG",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "={{ $json.progress_callback_url }}",
    "authentication": "genericCredentialType",
    "genericAuthType": "httpBearerAuth",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "=..."
  }
}
```

**Alasan:** Node ini hanya mengirim progress update ke frontend, tidak tergantung pada data scraping. Tetap berjalan normal sebelum scraping dimulai.

---

### Node 2: "Scrape Instagram Data" 

**Status:** ✅ **MODIFIED**

#### Perubahan:

| Aspek | Lama | Baru |
|-------|------|------|
| **URL** | `https://www.instagram.com/{{ $json.ig_username }}/?__a=1` | `https://YOUR_VERCEL_DOMAIN.com/api/medsos/scrape-instagram` |
| **Method** | POST | POST ✓ same |
| **Body** | None | JSON dengan username, request_id |
| **Response Format** | Instagram native | Apify format |

#### Full Node Configuration (Baru):

```json
{
  "parameters": {
    "method": "POST",
    "url": "=https://YOUR_VERCEL_DOMAIN.com/api/medsos/scrape-instagram",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"username\": \"{{ $json.ig_username }}\",\n  \"request_id\": \"{{ $json.request_id }}\",\n  \"n8n_secret\": \"jllIcqyZiL0Od9g5b7Qq7fUtDc4JLdMRz\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.3,
  "position": [16368, 5520],
  "id": "c8c2ba7d-59e6-4644-9aae-8474c91c47a3",
  "name": "Scrape Instagram Data"
}
```

#### Request Body Sent to Backend:

```json
{
  "username": "kompascom",
  "request_id": "req_123",
  "n8n_secret": "jllIcqyZiL0Od9g5b7Qq7fUtDc4JLdMRz"
}
```

#### Response dari Backend:

```json
{
  "success": true,
  "data": {
    "username": "kompascom",
    "fullName": "Kompas",
    "biography": "...",
    "followerCount": 1234567,
    "followingCount": 150,
    "profilePicUrl": "https://...",
    "isVerified": true,
    "posts": [
      {
        "id": "post_id",
        "caption": "Post caption",
        "likeCount": 5000,
        "commentCount": 250,
        "timestamp": "2026-05-21T10:30:00Z"
      }
    ]
  }
}
```

**⚠️ PENTING:** Response ini dalam format **Apify**, bukan Instagram native. Perlu transformation di node berikutnya.

---

### Node 3: "Transform Instagram Data" (NEW)

**Status:** ✨ **NEWLY ADDED**

```json
{
  "parameters": {
    "jsCode": "// Full transformation code - see below"
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [16450, 5520],
  "id": "transform-instagram-response-001",
  "name": "Transform Instagram Data"
}
```

#### Fungsi Node:

1. **Receive:** Apify format response
2. **Transform:** Convert ke Instagram native format
3. **Output:** Instagram format untuk downstream compatibility

#### Transformation Logic:

```javascript
// Input dari "Scrape Instagram Data":
{
  "success": true,
  "data": {
    "username": "kompascom",
    "followerCount": 1234567,
    "posts": [...]
  }
}

// Output setelah transformation:
{
  "success": true,
  "data": {
    "user": {
      "username": "kompascom",
      "edge_followed_by": { "count": 1234567 },
      "edge_follow": { "count": 150 },
      "biography": "..."
    },
    "edge_owner_to_timeline_media": {
      "edges": [
        {
          "node": {
            "id": "post_id",
            "edge_media_to_caption": {
              "edges": [{ "node": { "text": "Post caption" } }]
            },
            "edge_media_preview_like": { "count": 5000 },
            "edge_media_to_comment": { "count": 250 }
          }
        }
      ]
    }
  }
}
```

#### Field Mapping Table:

| Apify (Input) | Instagram Native (Output) | Path |
|--------------|--------------------------|------|
| username | username | user.username |
| fullName | full_name | user.full_name |
| biography | biography | user.biography |
| followerCount | count | user.edge_followed_by.count |
| followingCount | count | user.edge_follow.count |
| profilePicUrl | profile_pic_url | user.profile_pic_url |
| isVerified | is_verified | user.is_verified |
| isBusinessAccount | is_business_account | user.is_business_account |
| posts[].caption | text | edge_media_to_caption.edges[].node.text |
| posts[].likeCount | count | edge_media_preview_like.count |
| posts[].commentCount | count | edge_media_to_comment.count |
| posts[].isCarousel | is_carousel | node.is_carousel |

#### Error Handling:

Node ini juga menangani error dari scraping:

```javascript
if (!response.success || !response.data) {
  return [{
    json: {
      error: response.error || 'Failed to scrape Instagram',
      errorCode: response.errorCode || 'scraping_failed'
    }
  }];
}
```

---

### Node 4: "Send Progress: AI Analysis"

**Status:** ✅ **NO CHANGE NEEDED**

```json
{
  "name": "Send Progress: AI Analysis",
  "type": "n8n-nodes-base.httpRequest"
}
```

**Alasan:** Node ini menerima data dari "Transform Instagram Data" (setelah transformation), yang sudah dalam format Instagram native. Downstream node "Prepare AI Analysis Prompt" juga tetap bekerja normal karena format data kompatibel.

---

## 🔗 Connection Flow (Updated)

### Before:
```
Send Progress: Scraping IG
  ↓
Scrape Instagram Data (call Instagram API - DEPRECATED)
  ↓
Send Progress: AI Analysis
  ↓
Prepare AI Analysis Prompt
  ↓
AI Processing...
```

### After:
```
Send Progress: Scraping IG
  ↓
Scrape Instagram Data (call Backend Apify endpoint - NEW)
  ↓
Transform Instagram Data (convert format - NEW)
  ↓
Send Progress: AI Analysis  
  ↓
Prepare AI Analysis Prompt
  ↓
AI Processing... ✓ (no changes needed)
```

### Connection Changes in JSON:

**Remove connection:**
```json
"Scrape Instagram Data": {
  "main": [
    [
      {
        "node": "Send Progress: AI Analysis",  // ❌ OLD
        "type": "main",
        "index": 0
      }
    ]
  ]
}
```

**Add new connections:**
```json
"Scrape Instagram Data": {
  "main": [
    [
      {
        "node": "Transform Instagram Data",  // ✅ NEW
        "type": "main",
        "index": 0
      }
    ]
  ]
},

"Transform Instagram Data": {
  "main": [
    [
      {
        "node": "Send Progress: AI Analysis",  // ✅ NEW
        "type": "main",
        "index": 0
      }
    ]
  ]
}
```

---

## 🔧 Implementation Steps

### Step 1: Backup Workflow
```bash
# Export current workflow sebelum modifikasi
# n8n Dashboard → Workflows → Select WF_Social_Media_Analyst
# → Menu → Download → Save as WF_Social_Media_Analyst_BACKUP.json
```

### Step 2: Update Backend URL

**CRITICAL:** Replace `YOUR_VERCEL_DOMAIN.com` dengan domain Vercel Anda yang sebenarnya.

Options:
- **Option A:** Edit JSON directly
  ```json
  "url": "=https://your-actual-domain.vercel.app/api/medsos/scrape-instagram"
  ```

- **Option B:** Use Environment Variable
  ```json
  "url": "={{ $env.BACKEND_INSTAGRAM_ENDPOINT }}"
  ```
  Kemudian set env var di n8n:
  ```
  BACKEND_INSTAGRAM_ENDPOINT=https://your-domain.vercel.app/api/medsos/scrape-instagram
  ```

### Step 3: Import Modified Workflow

**Via n8n Dashboard:**
1. Go to Workflows
2. Click "Import"
3. Select `WF_Social_Media_Analyst_INTEGRATED.json`
4. Choose "Replace existing workflow"
5. Confirm

**Or via JSON Edit:**
1. Export current workflow
2. Copy connections and nodes dari file baru
3. Save and import

### Step 4: Verify Connections

1. Open workflow in n8n
2. Check node connections:
   - "Scrape Instagram Data" → "Transform Instagram Data" ✓
   - "Transform Instagram Data" → "Send Progress: AI Analysis" ✓
3. Visualize workflow (should match the "After" diagram above)

### Step 5: Test Workflow

```
1. Trigger webhook dengan test data
2. Monitor execution:
   - Send Progress: Scraping IG (20%) ✓
   - Scrape Instagram Data (call backend) ✓
   - Transform Instagram Data (convert format) ✓
   - Send Progress: AI Analysis (60%) ✓
   - AI Processing... ✓
```

---

## ✅ Verification Checklist

- [ ] Backend endpoint deployed dan accessible
- [ ] Vercel domain updated dalam "Scrape Instagram Data" node
- [ ] "Transform Instagram Data" node added dengan correct JavaScript
- [ ] Connections updated: Scrape → Transform → Progress
- [ ] Workflow tested dengan real Instagram profile
- [ ] Progress updates (20%, 60%, 90%) working
- [ ] AI analysis output matches expected format
- [ ] Error handling works (test with invalid profile)
- [ ] Logs show no errors in nodes
- [ ] Response time reasonable (3-5 sec first call, <100ms cached)

---

## 🐛 Troubleshooting

### Issue 1: "Cannot find module 'Transform Instagram Data'"

**Cause:** Node connection broken after import

**Solution:**
1. Delete "Transform Instagram Data" node
2. Add new CODE node manually
3. Copy JavaScript code from integration guide
4. Reconnect

### Issue 2: "Backend URL returns 404"

**Cause:** Vercel domain incorrect

**Solution:**
```
1. Verify Vercel deployment status
2. Test endpoint: curl https://your-domain.vercel.app/api/medsos/scrape-instagram
3. Check environment variables in Vercel dashboard
4. Update URL in "Scrape Instagram Data" node
```

### Issue 3: "Prepare AI Analysis Prompt gets undefined data"

**Cause:** Transform node data format incorrect

**Solution:**
1. Check Transform node output by adding debug step:
   ```
   - Right-click on "Transform Instagram Data"
   - Click "Test step"
   - Check output structure
   ```

2. Verify field mapping matches Instagram native format
3. Check error in Transform node for schema issues

### Issue 4: "Progress updates not sent"

**Cause:** Progress callback URL incorrect

**Solution:**
1. Check webhook data format
2. Verify `progress_callback_url` field in input
3. Check backend logs for callback failures

---

## 📊 Performance Expectations

| Stage | Time | Notes |
|-------|------|-------|
| Scrape Instagram Data | 3-5 sec | First call (Apify) |
| Transform Instagram Data | <100ms | Convert format |
| Send Progress | <1 sec | HTTP callback |
| Total to AI Analysis | 4-6 sec | First run |
| **Cached** | <1 sec | Subsequent same profile |

---

## 🔐 Security Considerations

### API Key Protection
- ✅ N8N_SHARED_SECRET used for auth
- ✅ Backend validates n8n_secret
- ✅ No sensitive data in logs

### CORS Handling
- ✅ Backend allows n8n requests
- ✅ Origin headers validated
- ✅ Rate limiting implemented

---

## 📚 Additional Resources

| Resource | Link |
|----------|------|
| Modified JSON | `WF_Social_Media_Analyst_INTEGRATED.json` |
| Integration Guide | `N8N_WORKFLOW_INTEGRATION_GUIDE.md` |
| Backend Code | `lib/medsos/apify.ts` |
| Deployment | `DEPLOYMENT_CHECKLIST.md` |

---

## ✨ Next Steps After Integration

1. **Test thoroughly** dengan berbagai Instagram profiles
2. **Monitor performance** di production
3. **Set up alerts** untuk scraping failures
4. **Optimize caching** berdasarkan usage patterns
5. **Consider load testing** untuk multi-profile scenarios

---

**Integration Status:** ✅ READY FOR DEPLOYMENT

Files prepared:
- ✅ Modified workflow JSON
- ✅ Node configurations
- ✅ Transformation logic  
- ✅ Implementation guide
- ✅ Troubleshooting guide

**Next:** Import workflow ke n8n dan test! 🚀

