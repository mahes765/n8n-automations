import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import { supabaseAdmin } from "@/lib/supabase";
import { NextRequest } from "next/server";

/**
 * GET /api/debug/entitlement-flow
 * 
 * TEST ENDPOINT - Debug entitlement activation flow
 * Shows step-by-step what happens when user's entitlement is checked
 * 
 * Use this to diagnose:
 * - Why payment polling shows "Unknown error"
 * - Whether getCurrentUser() works
 * - Whether getActiveMedsosEntitlement() finds entitlement
 * - Whether auto-activation works
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return json({ message: "This endpoint is only available in development" }, 403);
  }

  const steps = [] as Array<{
    step: string;
    status: "success" | "error" | "info";
    data?: unknown;
    error?: string;
  }>;

  try {
    // Step 1: Get current user
    steps.push({ step: "1. getCurrentUser()", status: "info" });
    let user;
    try {
      user = await getCurrentUser();
      if (user) {
        steps.push({
          step: "1. getCurrentUser() result",
          status: "success",
          data: { user_id: user.id, email: user.email },
        });
      } else {
        steps.push({
          step: "1. getCurrentUser() result",
          status: "error",
          error: "No user found (not authenticated)",
        });
        return json({ steps, status: "error", message: "User not authenticated" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({
        step: "1. getCurrentUser() error",
        status: "error",
        error: msg,
      });
      throw e;
    }

    // Step 2: Check active entitlement
    steps.push({ step: "2. getActiveMedsosEntitlement()", status: "info" });
    let entitlement;
    try {
      entitlement = await getActiveMedsosEntitlement(user.id);
      if (entitlement) {
        steps.push({
          step: "2. getActiveMedsosEntitlement() result",
          status: "success",
          data: {
            id: entitlement.id,
            status: entitlement.status,
            quota_total: entitlement.quota_total,
            quota_used: entitlement.quota_used,
            expires_at: entitlement.expires_at,
          },
        });
        return json({
          steps,
          status: "success",
          message: "Entitlement is active",
          entitlement: {
            id: entitlement.id,
            quota_remaining: entitlement.quota_total - entitlement.quota_used,
            expires_at: entitlement.expires_at,
          },
        });
      } else {
        steps.push({
          step: "2. getActiveMedsosEntitlement() result",
          status: "info",
          data: null,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({
        step: "2. getActiveMedsosEntitlement() error",
        status: "error",
        error: msg,
      });
      throw e;
    }

    // Step 3: Check for paid transaction
    steps.push({ step: "3. Query paid transactions", status: "info" });
    let paidTransaction;
    try {
      const { data, error: txError } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("product_type", "medsos_package")
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (txError) {
        steps.push({
          step: "3. Query paid transactions error",
          status: "error",
          error: txError.message,
        });
        throw txError;
      }

      if (data) {
        paidTransaction = data;
        steps.push({
          step: "3. Query paid transactions result",
          status: "success",
          data: {
            id: data.id,
            status: data.status,
            gross_amount: data.gross_amount,
            settlement_time: data.settlement_time,
          },
        });
      } else {
        steps.push({
          step: "3. Query paid transactions result",
          status: "info",
          data: null,
          error: "No paid transaction found",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      steps.push({
        step: "3. Query paid transactions error",
        status: "error",
        error: msg,
      });
      throw e;
    }

    return json({
      steps,
      status: "info",
      message: paidTransaction
        ? "Paid transaction found but no active entitlement (would trigger auto-activation on real endpoint)"
        : "No paid transaction found - user needs to pay for package",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    steps.push({
      step: "ERROR",
      status: "error",
      error: errorMsg,
    });

    return json({
      steps,
      status: "error",
      message: errorMsg,
      debug_info: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined,
    }, 500);
  }
}
