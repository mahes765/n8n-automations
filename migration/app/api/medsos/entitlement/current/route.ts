import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import { NextRequest } from "next/server";

/**
 * GET /api/medsos/entitlement/current
 * 
 * Frontend calls this to check current user's entitlement status
 * Used by payment polling component to auto-redirect after payment
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return json({ message: "Unauthorized" }, 401);
    }

    const entitlement = await getActiveMedsosEntitlement(user.id);

    if (!entitlement) {
      return json({
        status: "inactive",
        message: "No active entitlement found",
      });
    }

    return json({
      status: "active",
      id: entitlement.id,
      quota_total: entitlement.quota_total,
      quota_used: entitlement.quota_used,
      package_name: entitlement.medsos_packages?.name,
      expires_at: entitlement.expires_at,
    });
  } catch (error) {
    console.error("Error checking entitlement:", error);
    return json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    }, 500);
  }
}
