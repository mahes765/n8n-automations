import { json } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

/**
 * GET /api/medsos/entitlement/[id]
 * 
 * N8n calls this to verify entitlement status before starting analysis
 * Requires: Authorization header with n8n token
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // Verify n8n auth token
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.N8N_AUTH_TOKEN;

    if (!authHeader || !expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return json({ message: "Unauthorized" }, 401);
    }

    const { id } = await params;
    const entitlementId = parseInt(id, 10);

    if (!entitlementId || isNaN(entitlementId)) {
        return json({ message: "Invalid entitlement ID" }, 400);
    }

    const { data: entitlement, error } = await supabaseAdmin
        .from("medsos_entitlements")
        .select("id, status, quota_total, quota_used, activated_at, expires_at, user_id, package_id")
        .eq("id", entitlementId)
        .maybeSingle();

    if (error) {
        return json({ message: error.message }, 500);
    }

    if (!entitlement) {
        return json({ message: "Entitlement not found" }, 404);
    }

    // Check if expired
    const now = new Date();
    const expiresAt = entitlement.expires_at ? new Date(entitlement.expires_at) : null;
    const isExpired = expiresAt && now > expiresAt;

    const status = isExpired ? "expired" : entitlement.status;

    return json({
        id: entitlement.id,
        status,
        quota_total: entitlement.quota_total,
        quota_used: entitlement.quota_used,
        quota_available: entitlement.quota_used < entitlement.quota_total,
        activated_at: entitlement.activated_at,
        expires_at: entitlement.expires_at,
        user_id: entitlement.user_id,
        package_id: entitlement.package_id,
    });
}
