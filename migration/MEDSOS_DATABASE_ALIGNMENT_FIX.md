# Medsos Database Alignment Fixes

## Issues Found & Fixed

### 1. **Missing Error Handling in expireEndedMedsosEntitlements()**
**Problem:** The update query was not checking for errors
```typescript
// BEFORE: Silent failure if error occurs
await supabaseAdmin.from("medsos_entitlements").update(...);
```
**Fix:** Added error checking and logging
```typescript
// AFTER: Error is thrown if query fails
const { error } = await supabaseAdmin.from("medsos_entitlements").update(...);
if (error) throw error;
```

### 2. **Unsafe NULL Condition in getActiveMedsosEntitlement()**
**Problem:** Query condition `.gt("expires_at", timestamp)` excludes rows with NULL expires_at
- Newly created entitlements have `expires_at = null`
- These were not being retrieved, causing "no active entitlement" even for pending ones
- Active entitlements with infinite validity also need to work

**Fix:** Changed to use `.or()` condition to include NULL values
```typescript
// BEFORE: Excludes NULL expires_at
.gt("expires_at", new Date().toISOString())

// AFTER: Includes both NULL and future dates
.or(`expires_at.is.null,expires_at.gt.${now}`)
```

### 3. **Relationship Type Mismatch**
**Problem:** Supabase relationships return arrays, but code assumed single object
- Query `select("*, medsos_packages(...)")` returns `medsos_packages` as array
- Code tried to access `.medsos_packages.validity_days` (object syntax) on array

**Fix:** Handle array conversion properly
```typescript
// BEFORE: Assumed single object
entitlement.medsos_packages?.validity_days

// AFTER: Extracts first element from array if needed
const medsos_packages = Array.isArray(entitlement.medsos_packages) 
  ? entitlement.medsos_packages[0]
  : entitlement.medsos_packages;
```

### 4. **Improved Error Propagation**
**Problem:** expireEndedMedsosEntitlements() error could crash entitlement lookup
**Fix:** Wrapped in try-catch and continue if expiry fails
```typescript
try {
  await expireEndedMedsosEntitlements(userId);
} catch (expireError) {
  console.error("[MEDSOS] Failed to expire ended entitlements:", expireError);
  // Continue anyway, don't let expiry check block entitlement lookup
}
```

### 5. **Missing Null Checks on Package Data**
**Problem:** Code didn't validate package exists before accessing properties
**Fix:** Added explicit null checks before accessing package data
```typescript
if (!medsos_packages) {
  throw new Error(`Package not found for entitlement ${entitlement.id}`);
}
```

---

## Database Schema Alignment

### medsos_entitlements Table ✅
All required columns present:
- `id` - Primary key
- `user_id` - Foreign key to users
- `transaction_id` - Foreign key to transactions (unique)
- `package_id` - Foreign key to medsos_packages
- `status` - Enum: pending_payment, active, consumed, expired, refunded, cancelled
- `quota_total` - Integer > 0
- `quota_used` - Integer >= 0, <= quota_total
- `activated_at` - Timestamp nullable
- `expires_at` - Timestamp nullable ⚠️ **Handled by OR condition now**
- `notes` - Text nullable
- `created_at`, `updated_at` - Timestamps

### medsos_packages Table ✅
All required columns for queries:
- `id` - Primary key
- `name` - Text, unique
- `quota_limit` - Integer > 0
- `validity_days` - Integer > 0
- `price` - Integer >= 0
- `code` - Text, unique
- `purchase_type` - Text, constraint='one_time'
- `active` - Boolean

### Indexes ✅
Created for optimal query performance:
- `medsos_entitlements_user_status_idx` - Used in getActiveMedsosEntitlement()
- `medsos_entitlements_package_status_idx` - Available for joins

---

## New Diagnostic Features Added

### 1. `/api/medsos/entitlement/diagnostics`
Step-by-step trace of entitlement lookup:
- Traces getCurrentUser()
- Traces getActiveMedsosEntitlement()
- Traces paid transaction detection
- Traces auto-activation
- Returns detailed logs and error stack

**Usage:**
```
GET https://your-domain/api/medsos/entitlement/diagnostics
```

Response format:
```json
{
  "status": "error|active|inactive",
  "logs": [
    "✓ Got user: ID=123, email=user@example.com",
    "✓ Found active entitlement: ID=456, status=active",
    "✓ Confirmed active entitlement after activation"
  ],
  "entitlement": { /* if active */ },
  "message": "error message if any"
}
```

### 2. Improved Logging Throughout
Added structured logging with `[MEDSOS]` prefix:
```
[MEDSOS] Creating pending entitlement for user 123, package 1, transaction 456
[MEDSOS] Created pending entitlement 789
[MEDSOS] Activating entitlement 789: 2026-05-19T... + 30 days = 2026-06-18T...
[MEDSOS] Entitlement 789 activated successfully
```

---

## Common Errors Now Handled

| Error | Previous Behavior | Now |
|-------|------------------|-----|
| Package relation missing | Silent return null | Explicit error with entity ID |
| Quota check fails | Could crash | Gracefully returns null |
| Expiry update fails | Silent | Logged, continues entitlement lookup |
| NULL expires_at | Excluded from results | Properly included in OR condition |
| Array/Object mismatch | Type error | Handled with Array.isArray() check |

---

## Files Modified

1. **lib/medsos/entitlements.ts**
   - createPendingMedsosEntitlement() - Added null checks & logging
   - activateMedsosEntitlement() - Fixed relationship handling, improved error messages
   - expireEndedMedsosEntitlements() - Added error checking
   - getActiveMedsosEntitlement() - Fixed NULL expires_at handling, improved relationship parsing

2. **app/api/medsos/entitlement/current/route.ts**
   - Added detailed logging with request ID
   - Added duration tracking
   - Improved error response format

3. **app/api/medsos/entitlement/diagnostics/route.ts** (NEW)
   - Step-by-step diagnostic endpoint
   - Shows exactly where failures occur

---

## Testing Checklist

After deployment, verify:

- [ ] `/api/medsos/entitlement/diagnostics` works (authentication required)
- [ ] Response includes step-by-step logs
- [ ] Errors show specific failure points
- [ ] Server logs show `[MEDSOS]` prefixed messages
- [ ] New purchases create pending entitlements
- [ ] Payment settlement activates entitlements
- [ ] Quota limits are enforced
- [ ] NULL expires_at entries are found and activated
- [ ] Errors are properly caught and reported

---

## Deployment Instructions

1. **Build locally** ✅ (already done)
2. **Push to git**
3. **Deploy to Vercel** - Auto-builds and deploys
4. **Verify production** - Call diagnostics endpoint with auth cookie
5. **Monitor logs** - Look for `[MEDSOS]` tagged messages

---

## Still Pending

- [ ] Database migration: Run `sql/006_medsos.sql` in production Supabase
- [ ] N8N workflow update: Import updated `WF_Social_Media_Analyst (2).json`
- [ ] Environment variables: Ensure `N8N_MEDSOS_WEBHOOK_URL`, `N8N_SHARED_SECRET` set
- [ ] End-to-end test: Test complete payment → analysis flow
