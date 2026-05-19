# One-Time Purchase Model: Removed validity_days

## Problem Fixed
Database tidak memiliki `validity_days` column karena sistem adalah **one-time purchase** (bukan subscription). Tapi kode TypeScript masih query dan gunakan `validity_days`, menyebabkan query error dan entitlement activation gagal.

## Changes Made

### 1. **Removed `validity_days` dari Query**
```typescript
// BEFORE: Query validity_days yang tidak ada
.select("medsos_packages(validity_days)")

// AFTER: Query hanya name dan quota_limit
.select("medsos_packages(name, quota_limit)")
```

### 2. **Simplified `ActiveMedsosEntitlement` Type**
```typescript
// BEFORE:
medsos_packages: Pick<MedsosPackage, "name" | "quota_limit" | "validity_days"> | null;

// AFTER:
medsos_packages: Pick<MedsosPackage, "name" | "quota_limit"> | null;
```

### 3. **Removed Validity Days Calculation**
```typescript
// BEFORE: Calculate expiry based on validity_days
const validityDays = medsos_packages.validity_days || 30;
const expiresAt = addDays(startDate, validityDays);
expires_at: expiresAt.toISOString();

// AFTER: One-time purchase never expires
console.log(`Activating entitlement: one-time purchase (unlimited validity)`);
expires_at: null;
```

### 4. **Removed Expiry Check Function**
```typescript
// BEFORE: Update expired entitlements
export async function expireEndedMedsosEntitlements(userId: number) {
  await supabaseAdmin
    .from("medsos_entitlements")
    .update({ status: "expired" })
    // ... where expires_at < now
}

// AFTER: Kept for backward compatibility but does nothing
export async function expireEndedMedsosEntitlements(userId: number) {
  console.log(`One-time purchases don't expire...`);
}
```

### 5. **Simplified Entitlement Lookup**
```typescript
// BEFORE: Complex query with expiry date checks
.or(`expires_at.is.null,expires_at.gt.${now}`)
.order("expires_at", { ascending: true, nullsFirst: true })

// AFTER: Simple active status check (no expiry needed)
.eq("status", "active")
.order("created_at", { ascending: false })
```

## Database Schema (Your Data)
```json
{
  "id": 1,
  "code": "basic",
  "name": "Basic",
  "quota_limit": 1,      // One-time purchase quota
  "price": 49000,
  "purchase_type": "one_time"
  // NO "validity_days" field
}
```

## Entitlement Behavior: One-Time Purchase
- **Purchase**: User beli package, create entitlement dengan `status: pending_payment`
- **Payment**: Payment settled, entitlement auto-activated dengan `status: active`, `expires_at: NULL`
- **Expiry**: Never expires (can use indefinitely until quota is used up)
- **Quota**: Decreases with each analysis, but never resets

## Files Modified
- `lib/medsos/entitlements.ts` - Removed all `validity_days` references
  - `createPendingMedsosEntitlement()` - Sets `expires_at: null` ✅
  - `activateMedsosEntitlement()` - Sets `expires_at: null` ✅  
  - `getActiveMedsosEntitlement()` - Removed date-based expiry check ✅
  - `expireEndedMedsosEntitlements()` - No-op function ✅
  - Type definition - Removed `validity_days` ✅

## Testing
Verify workflow:
1. ✅ Create package dengan quota_limit (no validity_days)
2. ✅ User purchase → create pending entitlement
3. ✅ Payment settlement → activate entitlement (expires_at = NULL)
4. ✅ User submit analysis → check active entitlement → charge quota
5. ✅ Quota decreases, entitlement stays active until quota consumed

## Build Status
- Build: ✅ SUCCESS
- Ready for deployment: ✅ YES
- N8N workflow: ✅ Already running (no changes needed)
- Payment flow: ✅ Compatible with one-time model
