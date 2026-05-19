import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { activateMedsosEntitlement, getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

/**
 * GET /api/medsos/entitlement/diagnostics
 * 
 * Detailed diagnostic endpoint to trace where exactly the 500 error is happening
 * Returns detailed logs from each step
 */
export async function GET(request: NextRequest) {
  const logs = [] as string[];
  
  try {
    logs.push("=== STEP 1: getCurrentUser() ===");
    let user;
    try {
      user = await getCurrentUser();
      logs.push(`✓ Got user: ${user ? `ID=${user.id}, email=${user.email}` : "null"}`);
    } catch (e) {
      logs.push(`✗ getCurrentUser threw: ${e instanceof Error ? e.message : String(e)}`);
      throw e;
    }

    if (!user) {
      logs.push("✗ User is null - not authenticated");
      return json({ status: "unauthorized", logs }, 401);
    }

    logs.push("\n=== STEP 2: getActiveMedsosEntitlement() ===");
    let entitlement;
    try {
      entitlement = await getActiveMedsosEntitlement(user.id);
      if (entitlement) {
        logs.push(`✓ Found active entitlement: ID=${entitlement.id}, status=${entitlement.status}`);
        logs.push(`  - Quota: ${entitlement.quota_used}/${entitlement.quota_total}`);
        logs.push(`  - Package: ${entitlement.medsos_packages?.name || "N/A"}`);
      } else {
        logs.push("! No active entitlement found, will check for paid transactions");
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logs.push(`✗ getActiveMedsosEntitlement threw error: ${errMsg}`);
      logs.push(`  Stack: ${e instanceof Error ? e.stack : "N/A"}`);
      throw e;
    }

    // If no entitlement, check for paid transactions
    if (!entitlement) {
      logs.push("\n=== STEP 3: Query paid transactions ===");
      try {
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
          logs.push(`✗ Query error: ${txError.message} (code: ${txError.code})`);
          throw txError;
        }

        if (paidTransaction) {
          logs.push(`✓ Found paid transaction: ID=${paidTransaction.id}`);
          logs.push(`  Settlement time: ${paidTransaction.settlement_time}`);

          logs.push("\n=== STEP 4: Auto-activating entitlement ===");
          try {
            const activated = await activateMedsosEntitlement(
              paidTransaction,
              new Date(paidTransaction.settlement_time || new Date())
            );
            if (activated) {
              logs.push(`✓ Successfully activated entitlement: ID=${activated.id}`);
              entitlement = await getActiveMedsosEntitlement(user.id);
              if (entitlement) {
                logs.push(`✓ Confirmed active entitlement after activation`);
              }
            } else {
              logs.push("! Activation returned null");
            }
          } catch (activateErr) {
            const errMsg = activateErr instanceof Error ? activateErr.message : String(activateErr);
            logs.push(`✗ Activation failed: ${errMsg}`);
            logs.push(`  Stack: ${activateErr instanceof Error ? activateErr.stack : "N/A"}`);
          }
        } else {
          logs.push("! No paid transactions found");
        }
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : String(e);
        logs.push(`✗ Transaction query threw: ${errMsg}`);
        throw e;
      }
    }

    logs.push("\n=== FINAL RESULT ===");
    if (entitlement) {
      logs.push("✓ SUCCESS: Entitlement is active");
      return json({
        status: "active",
        logs,
        entitlement: {
          id: entitlement.id,
          quota_total: entitlement.quota_total,
          quota_used: entitlement.quota_used,
          package_name: entitlement.medsos_packages?.name,
          expires_at: entitlement.expires_at,
        },
      });
    } else {
      logs.push("✗ FAILURE: No active entitlement");
      return json({
        status: "inactive",
        logs,
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "N/A";
    
    logs.push("\n=== EXCEPTION CAUGHT ===");
    logs.push(`✗ Error: ${errorMsg}`);
    logs.push(`Stack:\n${errorStack}`);

    return json({
      status: "error",
      message: errorMsg,
      logs,
      timestamp: new Date().toISOString(),
    }, 500);
  }
}
