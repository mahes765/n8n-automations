-- Fix quota charging timing issue
-- Problem: Entitlements marked as 'consumed' immediately on request creation
-- Solution: Revert to 'active' for requests without completed analysis

-- 1. Check how many need fixing
SELECT 
  e.id,
  e.user_id,
  e.status,
  e.quota_total,
  e.quota_used,
  mr.id as request_id,
  mr.status as request_status,
  ar.id as result_id
FROM medsos_entitlements e
LEFT JOIN medsos_requests mr ON mr.entitlement_id = e.id
LEFT JOIN medsos_analysis_results ar ON ar.request_id = mr.id
WHERE e.status = 'consumed'
  AND e.quota_total = 1
  AND e.quota_used = 1
  AND ar.id IS NULL
ORDER BY e.created_at DESC;

-- 2. FIX: Revert consumed status to active for requests WITHOUT completed results
-- This is SAFE because:
-- - Only affects one_time purchases (quota_total=1)
-- - Only reverts if no result exists yet
-- - Financial transactions remain unchanged
UPDATE medsos_entitlements e
SET 
  status = 'active',
  quota_used = 0,
  updated_at = now()
WHERE e.id IN (
  SELECT DISTINCT e.id
  FROM medsos_entitlements e
  LEFT JOIN medsos_requests mr ON mr.entitlement_id = e.id
  LEFT JOIN medsos_analysis_results ar ON ar.request_id = mr.id
  WHERE e.status = 'consumed'
    AND e.quota_total = 1
    AND ar.id IS NULL
)
AND e.status = 'consumed'
AND NOT EXISTS (
  SELECT 1
  FROM medsos_requests mr2
  INNER JOIN medsos_analysis_results ar2 ON ar2.request_id = mr2.id
  WHERE mr2.entitlement_id = e.id
);

-- 3. Verify fix
SELECT 
  e.id,
  e.user_id,
  e.status,
  e.quota_total,
  e.quota_used,
  COUNT(DISTINCT mr.id) as request_count,
  COUNT(DISTINCT ar.id) as result_count
FROM medsos_entitlements e
LEFT JOIN medsos_requests mr ON mr.entitlement_id = e.id
LEFT JOIN medsos_analysis_results ar ON ar.request_id = mr.id
WHERE e.product_type = 'medsos_package'
   OR e.quota_total = 1
GROUP BY e.id
ORDER BY e.created_at DESC
LIMIT 10;
