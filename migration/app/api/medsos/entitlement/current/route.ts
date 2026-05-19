import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { activateMedsosEntitlement, getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

/**
 * GET /api/medsos/entitlement/current
 * 
 * Frontend calls this to check current user's entitlement status
 * If payment is settled but entitlement not active, activate it here
 */
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return json({ message: "Unauthorized" }, 401);
        }

        let entitlement = await getActiveMedsosEntitlement(user.id);

        // Jika belum ada entitlement aktif, cek apakah ada transaksi yang sudah paid tapi belum activate
        if (!entitlement) {
            const { data: paidTransaction, error: txError } = await supabaseAdmin
                .from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .eq("product_type", "medsos_package")
                .eq("status", "paid")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!txError && paidTransaction) {
                // Ada transaksi yang paid tapi entitlement belum activate
                // Coba activate sekarang (webhook mungkin delay atau gagal)
                try {
                    const activatedEntitlement = await activateMedsosEntitlement(
                        paidTransaction,
                        new Date(paidTransaction.settlement_time || new Date())
                    );

                    if (activatedEntitlement) {
                        const freshEntitlement = await getActiveMedsosEntitlement(user.id);
                        if (freshEntitlement) {
                            entitlement = freshEntitlement;
                        }
                    }
                } catch (activateError) {
                    console.error("Error auto-activating entitlement:", activateError);
                    // Lanjut tanpa throw, biar return status apa yang ada
                }
            }
        }

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
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "No stack";
        console.error("[MEDSOS ENTITLEMENT ERROR]", {
            message: errorMsg,
            stack: errorStack,
            timestamp: new Date().toISOString(),
        });
        return json({
            status: "error",
            message: errorMsg || "Unknown error occurred while checking entitlement",
            debug_info: process.env.NODE_ENV === "development" ? errorStack : undefined,
        }, 500);
    }
}
