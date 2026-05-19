import { supabaseAdmin } from "@/lib/supabase";
import type { MedsosEntitlement, MedsosPackage, Transaction } from "@/lib/types";

export type ActiveMedsosEntitlement = MedsosEntitlement & {
  medsos_packages: Pick<MedsosPackage, "name" | "quota_limit"> | null;
};

export async function createPendingMedsosEntitlement(
  userId: number,
  packageData: MedsosPackage,
  transactionId: number,
): Promise<MedsosEntitlement> {
  console.log(`[MEDSOS] Creating pending entitlement for user ${userId}, package ${packageData.id}, transaction ${transactionId}`);
  
  const { data, error } = await supabaseAdmin
    .from("medsos_entitlements")
    .insert({
      user_id: userId,
      transaction_id: transactionId,
      package_id: packageData.id,
      status: "pending_payment",
      quota_total: packageData.quota_limit,
      quota_used: 0,
      expires_at: null,
    })
    .select()
    .single();

  if (error) {
    console.error("[MEDSOS] createPendingMedsosEntitlement error:", error);
    throw error;
  }

  if (!data) {
    throw new Error("Gagal membuat entitlement medsos - no data returned");
  }

  console.log(`[MEDSOS] Created pending entitlement ${data.id}`);
  return data as MedsosEntitlement;
}

export async function activateMedsosEntitlement(
  transaction: Transaction,
  startDate: Date,
): Promise<MedsosEntitlement | null> {
  const { data: entitlementData, error: entitlementError } = await supabaseAdmin
    .from("medsos_entitlements")
    .select(
      `
        id,
        user_id,
        transaction_id,
        package_id,
        status,
        quota_total,
        quota_used,
        activated_at,
        expires_at,
        notes,
        created_at,
        updated_at,
        medsos_packages(
          name,
          quota_limit
        )
      `
    )
    .eq("transaction_id", transaction.id)
    .maybeSingle();

  if (entitlementError) {
    console.error("[MEDSOS] activateMedsosEntitlement query error:", entitlementError);
    throw entitlementError;
  }

  if (!entitlementData) {
    console.log(`[MEDSOS] No entitlement found for transaction ${transaction.id}`);
    return null;
  }

  const entitlement = entitlementData as any;
  const medsos_packages = Array.isArray(entitlement.medsos_packages) 
    ? entitlement.medsos_packages[0]
    : entitlement.medsos_packages;
  
  if (!medsos_packages) {
    throw new Error(`Package not found for entitlement ${entitlement.id}`);
  }

  // One-time purchase: no expiry needed, set expires_at to NULL (unlimited validity)
  console.log(`[MEDSOS] Activating entitlement ${entitlement.id}: one-time purchase (unlimited validity)`);

  const { data, error } = await supabaseAdmin
    .from("medsos_entitlements")
    .update({
      status: "active",
      activated_at: startDate.toISOString(),
      expires_at: null,
    })
    .eq("id", entitlement.id)
    .select()
    .single();

  if (error) {
    console.error("[MEDSOS] activateMedsosEntitlement update error:", error);
    throw error;
  }

  if (!data) {
    throw new Error(`Failed to activate entitlement ${entitlement.id}`);
  }

  console.log(`[MEDSOS] Entitlement ${entitlement.id} activated successfully`);
  return data as MedsosEntitlement;
}

export async function markMedsosPending(
  transaction: Transaction,
  status: "expired" | "cancelled",
): Promise<void> {
  await supabaseAdmin
    .from("medsos_entitlements")
    .update({ status })
    .eq("transaction_id", transaction.id)
    .eq("status", "pending_payment");
}

export async function expireEndedMedsosEntitlements(userId: number): Promise<void> {
  // One-time purchases never expire (expires_at is always NULL)
  // This function is kept for backward compatibility but does nothing
  console.log(`[MEDSOS] One-time purchases don't expire, skipping expiry check for user ${userId}`);
}

export async function getActiveMedsosEntitlement(userId: number): Promise<ActiveMedsosEntitlement | null> {
  // One-time purchases: no expiry check needed
  // All active one-time purchases are valid indefinitely (expires_at is always NULL)

  const { data, error } = await supabaseAdmin
    .from("medsos_entitlements")
    .select(
      `
        id,
        user_id,
        transaction_id,
        package_id,
        status,
        quota_total,
        quota_used,
        activated_at,
        expires_at,
        notes,
        created_at,
        updated_at,
        medsos_packages(
          name,
          quota_limit
        )
      `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[MEDSOS] getActiveMedsosEntitlement query error:", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  const entitlement = data as any;
  const medsos_packages = Array.isArray(entitlement.medsos_packages)
    ? entitlement.medsos_packages[0]
    : entitlement.medsos_packages;

  // Check if quota is available
  if (entitlement.quota_used >= entitlement.quota_total) {
    console.log(`[MEDSOS] Entitlement ${entitlement.id} has no quota available (${entitlement.quota_used}/${entitlement.quota_total})`);
    return null;
  }

  return {
    ...entitlement,
    medsos_packages
  } as ActiveMedsosEntitlement;
}

export async function chargeMedsosQuota(entitlementId: number): Promise<void> {
  const { data: entitlement, error: readError } = await supabaseAdmin
    .from("medsos_entitlements")
    .select("*")
    .eq("id", entitlementId)
    .single();

  if (readError || !entitlement) {
    throw readError || new Error("Entitlement tidak ditemukan.");
  }

  const current = entitlement as MedsosEntitlement;

  if (current.status !== "active" || current.quota_used >= current.quota_total) {
    throw new Error("Quota medsos tidak tersedia.");
  }

  const nextQuotaUsed = current.quota_used + 1;
  const nextStatus = nextQuotaUsed >= current.quota_total ? "consumed" : "active";

  const { error } = await supabaseAdmin
    .from("medsos_entitlements")
    .update({
      quota_used: nextQuotaUsed,
      status: nextStatus,
    })
    .eq("id", entitlementId);

  if (error) {
    throw error;
  }
}
