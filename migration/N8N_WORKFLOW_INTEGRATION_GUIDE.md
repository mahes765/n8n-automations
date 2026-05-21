# N8N Workflow Integration - Modified Nodes & Structure

## 📋 Detailed Modification Plan

### Node 1: "Scrape Instagram Data" (MODIFIED)

**Old:**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://www.instagram.com/{{ $json.ig_username }}/?__a=1",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequest",
  "id": "c8c2ba7d-59e6-4644-9aae-8474c91c47a3",
  "name": "Scrape Instagram Data"
}
```

**New:**
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

**Changes:**
- URL: Instagram API → Backend Apify endpoint
- Method: POST tetap
- Add request body: `{username, request_id, n8n_secret}`
- Response format: Apify format (bukan Instagram native)

**Response dari backend:**
```json
{
  "success": true,
  "data": {
    "username": "kompascom",
    "fullName": "Kompas",
    "biography": "...",
    "followerCount": 1234567,
    "followingCount": 150,
    "posts": [
      {
        "id": "post_id",
        "caption": "...",
        "likeCount": 5000,
        "commentCount": 250,
        "timestamp": "..."
      }
    ]
  }
}
```

---

### Node 2: "Transform Instagram Data" (NEW - ADDED AFTER SCRAPE)

**New node inserted between "Scrape Instagram Data" and "Prepare AI Analysis Prompt":**

```json
{
  "parameters": {
    "jsCode": "// Transform Apify response to Instagram native format\nconst response = $json || {};\n\nif (!response.success || !response.data) {\n  return [{\n    json: {\n      error: response.error || 'Failed to scrape Instagram',\n      errorCode: response.errorCode || 'scraping_failed'\n    }\n  }];\n}\n\nconst profile = response.data;\n\n// Map Apify format to Instagram native format for compatibility\nconst transformedData = {\n  success: true,\n  data: {\n    user: {\n      username: profile.username,\n      full_name: profile.fullName,\n      biography: profile.biography,\n      edge_followed_by: {\n        count: profile.followerCount || 0\n      },\n      edge_follow: {\n        count: profile.followingCount || 0\n      },\n      profile_pic_url: profile.profilePicUrl\n    },\n    edge_owner_to_timeline_media: {\n      edges: (profile.posts || []).map(post => ({\n        node: {\n          id: post.id,\n          edge_media_to_caption: {\n            edges: post.caption ? [\n              {\n                node: {\n                  text: post.caption\n                }\n              }\n            ] : []\n          },\n          edge_media_preview_like: {\n            count: post.likeCount || 0\n          },\n          edge_media_to_comment: {\n            count: post.commentCount || 0\n          }\n        }\n      }))\n    }\n  }\n};\n\nreturn [{ json: transformedData }];"
  },
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [16450, 5520],
  "id": "transform-instagram-response-001",
  "name": "Transform Instagram Data"
}
```

**Purpose:**
- Convert format Apify → Instagram native format
- Maintain backward-compatibility dengan "Prepare AI Analysis Prompt"
- Handle error responses gracefully

**Mapping:**
| Apify Field | Instagram Native | Nested Path |
|------------|-----------------|------------|
| followerCount | count | user.edge_followed_by.count |
| followingCount | count | user.edge_follow.count |
| biography | biography | user.biography |
| posts[].caption | text | edge_media_to_caption.edges[].node.text |
| posts[].likeCount | count | edge_media_preview_like.count |
| posts[].commentCount | count | edge_media_to_comment.count |

---

### Node 3: "Send Progress: Scraping IG" (NO CHANGE)

**Already correct**, tidak perlu modifikasi. Node ini hanya mengirim progress update ke frontend.

**Status:** ✅ Keep as-is

---

### Node 4: "Send Progress: AI Analysis" (NO CHANGE)

**Already correct**, tidak perlu modifikasi. Node ini mengirim progress update sebelum AI processing.

**Status:** ✅ Keep as-is

---

## 🔗 Connection Changes

### Before:
```
Send Progress: Scraping IG 
  ↓
Scrape Instagram Data 
  ↓
Send Progress: AI Analysis 
  ↓
Prepare AI Analysis Prompt
```

### After:
```
Send Progress: Scraping IG 
  ↓
Scrape Instagram Data 
  ↓
Transform Instagram Data ← NEW NODE
  ↓
Send Progress: AI Analysis 
  ↓
Prepare AI Analysis Prompt
```

**Connection updates:**
1. Remove: "Scrape Instagram Data" → "Send Progress: AI Analysis"
2. Add: "Scrape Instagram Data" → "Transform Instagram Data"
3. Add: "Transform Instagram Data" → "Send Progress: AI Analysis"

---

## 📝 Field Mapping (Lama vs Baru)

### Input Data (tetap sama)
```javascript
// From "Validate IG URL" node:
{
  ig_username: "kompascom",    // Used for calling backend
  request_id: "req_123",
  callback_token: "token_abc",
  progress_callback_url: "https://...",
  result_callback_url: "https://..."
}
```

### Output Data (transformed untuk compatibility)
```javascript
// Before (Instagram native):
{
  data: {
    user: {
      edge_followed_by: { count: 1234567 },
      edge_follow: { count: 150 },
      biography: "..."
    },
    edge_owner_to_timeline_media: {
      edges: [
        {
          node: {
            edge_media_to_caption: {
              edges: [{ node: { text: "caption..." } }]
            }
          }
        }
      ]
    }
  }
}

// After transformation (from Apify):
// Same structure as above ✅ BACKWARD COMPATIBLE
```

---

## ⚙️ Environment Variables Required

Add to **N8N environment** or **n8n.yml**:

```yaml
# N8N Environment Variables

# Backend endpoint (replace with your actual Vercel domain)
BACKEND_INSTAGRAM_ENDPOINT=https://your-vercel-domain.com/api/medsos/scrape-instagram

# N8N shared secret (for authentication)
N8N_SHARED_SECRET=jllIcqyZiL0Od9g5b7Qq7fUtDc4JLdMRz
```

**Or inject directly in workflow URL:**
```
https://YOUR_VERCEL_DOMAIN.com/api/medsos/scrape-instagram
```

---

## ✅ Data Flow Verification

```
1. Webhook receives: { profile_url, request_id, ... }
2. Parse & Validate IG URL → extract ig_username
3. Scrape Instagram Data:
   POST {username, request_id} to backend
   ↓ returns Apify format
4. Transform Instagram Data:
   Convert to Instagram native format
   ↓ returns Instagram format
5. Prepare AI Analysis Prompt:
   Extract user, posts, captions
   Generate AI prompt ✅
6. AI Analysis & Results ✅
```

---

## 🚨 Important Notes

### 1. Backward Compatibility ✅
- "Prepare AI Analysis Prompt" node expects Instagram native format
- Transformation node ensures compatibility
- No changes needed to downstream nodes

### 2. Node Addition
- Adding "Transform Instagram Data" node is **necessary**
- This is minimal & non-intrusive
- Does not change workflow logic, only data format

### 3. Error Handling
- Transform node checks `response.success` before processing
- Returns error gracefully if scraping failed
- Maintains error tracking

### 4. Progress Nodes
- "Send Progress: Scraping IG" starts at 20%
- "Send Progress: AI Analysis" at 60%
- No changes needed

---

## 📋 Workflow Modification Checklist

- [ ] Update "Scrape Instagram Data" node URL
- [ ] Add request body to "Scrape Instagram Data"
- [ ] Add "Transform Instagram Data" CODE node
- [ ] Connect "Scrape Instagram Data" → "Transform Instagram Data"
- [ ] Connect "Transform Instagram Data" → "Send Progress: AI Analysis"
- [ ] Replace backend URL with your actual Vercel domain
- [ ] Test workflow in n8n
- [ ] Monitor "Transform Instagram Data" node for any issues

---

## 🔧 How to Apply Changes

### Option 1: Manual Edit in n8n (Recommended)
1. Open workflow in n8n
2. Edit "Scrape Instagram Data" node (see modified JSON above)
3. Add new CODE node after it
4. Connect nodes as shown
5. Test

### Option 2: Import Modified JSON
- Will provide full modified workflow.json file
- Import via n8n Dashboard → Import

---

