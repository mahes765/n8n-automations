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
 * 
 * ⚠️ IMPORTANT: This endpoint requires user authentication (session cookie)
 * For N8N webhook calls: Use /api/n8n/medsos/entitlement-check instead
 */
export async function GET(request: NextRequest) {
    const requestId = Math.random().toString(36).substring(7);
    const startTime = Date.now();
    
    try {
        console.log(`[${requestId}] START: getCurrentUser()`);
        const user = await getCurrentUser();

        if (!user) {
            console.log(`[${requestId}] ERROR: User not authenticated`);
            return json({ 
                status: "error",
                message: "Unauthorized - user not authenticated",
                request_id: requestId,
            }, 401);
        }

        console.log(`[${requestId}] OK: User authenticated (ID: ${user.id})`);
        console.log(`[${requestId}] START: getActiveMedsosEntitlement(${user.id})`);

        let entitlement = await getActiveMedsosEntitlement(user.id);

        if (entitlement) {
            console.log(`[${requestId}] OK: Found active entitlement (ID: ${entitlement.id}, status: ${entitlement.status})`);
        } else {
            console.log(`[${requestId}] INFO: No active entitlement, checking for paid transactions`);
            
            // Jika belum ada entitlement aktif, cek apakah ada transaksi yang sudah paid tapi belum activate
            const { data: paidTransaction, error: txError } = await supabaseAdmin
                .from("transactions")
                .select("*")
                .eq("user_id", user.id)
                .eq("product_type", "medsos_package")
                .eq("status", "paid")
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (txError) {
                console.log(`[${requestId}] ERROR: Transaction query failed - ${txError.message} (code: ${txError.code})`);
                throw new Error(`Transaction query failed: ${txError.message}`);
            }

            if (paidTransaction) {
                console.log(`[${requestId}] OK: Found paid transaction (ID: ${paidTransaction.id}, settlement_time: ${paidTransaction.settlement_time})`);
                console.log(`[${requestId}] START: activateMedsosEntitlement()`);
                
                // Ada transaksi yang paid tapi entitlement belum activate
                // Coba activate sekarang (webhook mungkin delay atau gagal)
                try {
                    const activatedEntitlement = await activateMedsosEntitlement(
                        paidTransaction,
                        new Date(paidTransaction.settlement_time || new Date())
                    );

                    if (activatedEntitlement) {
                        console.log(`[${requestId}] OK: Entitlement activated (ID: ${activatedEntitlement.id})`);
                        const freshEntitlement = await getActiveMedsosEntitlement(user.id);
                        if (freshEntitlement) {
                            console.log(`[${requestId}] OK: Verified activated entitlement`);
                            entitlement = freshEntitlement;
                        } else {
                            console.log(`[${requestId}] WARNING: Activated but cannot verify fresh entitlement`);
                        }
                    } else {
                        console.log(`[${requestId}] WARNING: Activation returned null`);
                    }
                } catch (activateError) {
                    const activateMsg = activateError instanceof Error ? activateError.message : String(activateError);
                    console.error(`[${requestId}] ERROR: Auto-activation failed - ${activateMsg}`);
                    if (activateError instanceof Error) {
                        console.error(`[${requestId}] Stack:`, activateError.stack);
                    }
                    // Lanjut tanpa throw, biar return status apa yang ada
                }
            } else {
                console.log(`[${requestId}] INFO: No paid transactions found`);
            }
        }

        if (!entitlement) {
            console.log(`[${requestId}] RESULT: No active entitlement (status: inactive)`);
            return json({
                status: "inactive",
                message: "No active entitlement found",
                request_id: requestId,
                duration_ms: Date.now() - startTime,
            });
        }

        const packageName = entitlement.medsos_packages?.name || "Unknown Package";
        console.log(`[${requestId}] RESULT: Active entitlement (package: ${packageName}, quota: ${entitlement.quota_used}/${entitlement.quota_total})`);

        return json({
            status: "active",
            id: entitlement.id,
            quota_total: entitlement.quota_total,
            quota_used: entitlement.quota_used,
            package_name: packageName,
            expires_at: entitlement.expires_at,
            request_id: requestId,
            duration_ms: Date.now() - startTime,
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : "No stack trace";
        const duration = Date.now() - startTime;
        
        console.error(`[${requestId}] EXCEPTION caught after ${duration}ms:`, {
            message: errorMsg,
            stack: errorStack,
            timestamp: new Date().toISOString(),
        });

        return json({
            status: "error",
            message: errorMsg || "Unknown error occurred while checking entitlement",
            error_type: error instanceof Error ? error.constructor.name : "Unknown",
            request_id: requestId,
            duration_ms: duration,
            debug_info: process.env.NODE_ENV === "development" ? {
                error_message: errorMsg,
                error_stack: errorStack,
                timestamp: new Date().toISOString(),
            } : undefined,
        }, 500);
    }
}
