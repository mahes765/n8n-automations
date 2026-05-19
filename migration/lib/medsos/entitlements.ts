import { addDays } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import type { MedsosEntitlement, MedsosPackage, Transaction } from "@/lib/types";

export type ActiveMedsosEntitlement = MedsosEntitlement & {
  medsos_packages: Pick<MedsosPackage, "name" | "quota_limit" | "validity_days"> | null;
};

export async function createPendingMedsosEntitlement(
  userId: number,
  packageData: MedsosPackage,
  transactionId: number,
): Promise<MedsosEntitlement> {
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

  if (error || !data) {
    throw error || new Error("Gagal membuat entitlement medsos.");
  }

  return data as MedsosEntitlement;
}

export async function activateMedsosEntitlement(
  transaction: Transaction,
  startDate: Date,
): Promise<MedsosEntitlement | null> {
  const { data: entitlementData, error: entitlementError } = await supabaseAdmin
    .from("medsos_entitlements")
    .select("*, medsos_packages(validity_days)")
    .eq("transaction_id", transaction.id)
    .maybeSingle();

  if (entitlementError || !entitlementData) {
    if (entitlementError) {
      throw entitlementError;
    }

    return null;
  }

  const entitlement = entitlementData as MedsosEntitlement & {
    medsos_packages: Pick<MedsosPackage, "validity_days"> | null;
  };
  const validityDays = entitlement.medsos_packages?.validity_days || 30;
  const expiresAt = addDays(startDate, validityDays);

  const { data, error } = await supabaseAdmin
    .from("medsos_entitlements")
    .update({
      status: "active",
      activated_at: startDate.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", entitlement.id)
    .select()
    .single();

  if (error || !data) {
    throw error || new Error("Gagal mengaktifkan entitlement medsos.");
  }

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
  await supabaseAdmin
    .from("medsos_entitlements")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active")
    .not("expires_at", "is", null)
    .lte("expires_at", new Date().toISOString());
}

export async function getActiveMedsosEntitlement(userId: number): Promise<ActiveMedsosEntitlement | null> {
  await expireEndedMedsosEntitlements(userId);

  const { data, error } = await supabaseAdmin
    .from("medsos_entitlements")
    .select("*, medsos_packages(name, quota_limit, validity_days)")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const entitlement = data as ActiveMedsosEntitlement | null;

  if (!entitlement || entitlement.quota_used >= entitlement.quota_total) {
    return null;
  }

  return entitlement;
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
