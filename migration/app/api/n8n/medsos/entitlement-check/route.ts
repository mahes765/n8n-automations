import { json } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

/**
 * GET /api/n8n/medsos/entitlement-check
 * 
 * Endpoint khusus untuk N8N workflow
 * Tidak memerlukan authenticated user session
 * 
 * Query params:
 * - entitlement_id: ID dari medsos_entitlements
 * - token: Optional validation token
 */
export async function GET(request: NextRequest) {
  try {
    const entitlementId = request.nextUrl.searchParams.get("entitlement_id");
    const validationToken = request.nextUrl.searchParams.get("token");

    if (!entitlementId) {
      return json({
        status: "error",
        message: "entitlement_id query parameter required",
      }, 400);
    }

    // Validate token if provided
    const expectedToken = process.env.N8N_SHARED_SECRET;
    if (expectedToken && validationToken !== expectedToken) {
      return json({
        status: "error",
        message: "Invalid or missing validation token",
      }, 401);
    }

    // Query entitlement with related package info
    const { data: entitlementData, error: entError } = await supabaseAdmin
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
        medsos_packages (
          id,
          name,
          code,
          price,
          validity_days
        )
      `
      )
      .eq("id", parseInt(entitlementId))
      .maybeSingle();

    if (entError) {
      console.error("[N8N ENTITLEMENT CHECK ERROR]", entError);
      return json({
        status: "error",
        message: "Database query failed",
        error_code: entError.code,
      }, 500);
    }

    if (!entitlementData) {
      return json({
        status: "inactive",
        message: "Entitlement not found",
      });
    }

    const entitlement = entitlementData as any;

    // Check if entitlement is expired
    const now = new Date();
    const expiresAt = entitlement.expires_at ? new Date(entitlement.expires_at) : null;
    const isExpired = expiresAt && expiresAt < now;

    if (isExpired) {
      return json({
        status: "expired",
        message: "Entitlement has expired",
        expires_at: entitlement.expires_at,
      });
    }

    // Check if quota is full
    const quotaFull = entitlement.quota_used >= entitlement.quota_total;

    return json({
      status: entitlement.status === "active" ? "active" : "inactive",
      id: entitlement.id,
      user_id: entitlement.user_id,
      quota_total: entitlement.quota_total,
      quota_used: entitlement.quota_used,
      quota_available: entitlement.quota_total - entitlement.quota_used,
      quota_full: quotaFull,
      package_name: (entitlement.medsos_packages as any)?.name,
      activated_at: entitlement.activated_at,
      expires_at: entitlement.expires_at,
      is_expired: isExpired,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[N8N ENTITLEMENT CHECK EXCEPTION]", {
      message: errorMsg,
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    return json({
      status: "error",
      message: errorMsg || "Internal server error",
    }, 500);
  }
}
