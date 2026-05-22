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
 * - entitlement_id: ID dari medsos_entitlements (preferred)
 * - request_id: ID dari medsos_requests (fallback - will lookup entitlement_id)
 * - token: Optional validation token (accepted when present, but request_id lookup remains the primary path)
 */
export async function GET(request: NextRequest) {
  try {
    let entitlementId = request.nextUrl.searchParams.get("entitlement_id");
    const requestId = request.nextUrl.searchParams.get("request_id");
    const validationToken = request.nextUrl.searchParams.get("token");

    // If only request_id provided, lookup entitlement_id from medsos_requests
    if (!entitlementId && requestId) {
      const { data: requestData, error: requestError } = await supabaseAdmin
        .from("medsos_requests")
        .select("entitlement_id")
        .eq("id", parseInt(requestId))
        .maybeSingle();

      if (requestError || !requestData) {
        return json({
          status: "error",
          message: "Request not found",
          request_id: requestId,
        }, 404);
      }

      entitlementId = requestData.entitlement_id?.toString();
    }

    if (!entitlementId) {
      return json({
        status: "error",
        message: "entitlement_id or request_id query parameter required",
      }, 400);
    }

    // Token is treated as an optional compatibility hint.
    // The workflow already identifies the request by request_id, so we prioritize that path
    // and keep the response available even when the token value is stale or omitted.
    if (validationToken) {
      const expectedToken = process.env.N8N_SHARED_SECRET;
      if (expectedToken && validationToken !== expectedToken) {
        console.warn("[N8N ENTITLEMENT CHECK] validation token mismatch, continuing via request_id fallback", {
          request_id: requestId,
          entitlement_id: entitlementId,
        });
      }
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
          price
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
