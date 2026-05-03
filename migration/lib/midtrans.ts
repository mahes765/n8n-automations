import { createHash, randomBytes } from "node:crypto";
import { appUrl, requireEnv } from "@/lib/env";
import { activateSubscription, markPending } from "@/lib/subscriptions";
import { supabaseAdmin } from "@/lib/supabase";
import type { SubscriptionPlan, Transaction, User } from "@/lib/types";

type MidtransWebhookPayload = {
  order_id?: string;
  transaction_status?: string;
  payment_type?: string;
  settlement_time?: string;
  gross_amount?: string | number;
  status_code?: string;
  signature_key?: string;
  [key: string]: unknown;
};

export function createOrderId(userId: number): string {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  return `ORDER-${userId}-${timestamp}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function validMidtransSignature(payload: MidtransWebhookPayload, signature?: string | null): boolean {
  const provided = signature || payload.signature_key;

  if (!provided || !payload.order_id || !payload.status_code || payload.gross_amount === undefined) {
    return false;
  }

  const expected = createHash("sha512")
    .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${requireEnv("MIDTRANS_SERVER_KEY")}`)
    .digest("hex");

  return expected === provided;
}

export function mapMidtransStatus(status: string): Transaction["status"] {
  if (status === "settlement" || status === "capture") {
    return "paid";
  }

  if (status === "expire") {
    return "expired";
  }

  if (status === "deny" || status === "cancel" || status === "failure") {
    return "failed";
  }

  return "pending";
}

export async function createMidtransSnap(orderId: string, amount: number, user: User) {
  const serverKey = requireEnv("MIDTRANS_SERVER_KEY");
  const production = process.env.MIDTRANS_IS_PRODUCTION === "true";
  const baseUrl = production ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
  const apiUrl = production
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: user.name,
        email: user.email,
      },
      item_details: [
        {
          id: "subscription",
          price: amount,
          quantity: 1,
          name: "Subscription Plan",
        },
      ],
      callbacks: {
        finish: appUrl("/plans?payment=finish"),
        error: appUrl("/plans?payment=error"),
        pending: appUrl("/plans?payment=pending"),
      },
    }),
  });

  const data = (await response.json()) as { token?: string; redirect_url?: string; error_messages?: string[] };

  if (!response.ok || !data.token) {
    throw new Error(data.error_messages?.join(", ") || "Gagal membuat transaksi Midtrans.");
  }

  return {
    snap_token: data.token,
    redirect_url: data.redirect_url || `${baseUrl}/snap/v2/vtweb/${data.token}`,
  };
}

export async function handleMidtransWebhook(payload: MidtransWebhookPayload, signature?: string | null) {
  if (!validMidtransSignature(payload, signature)) {
    throw new Error("Invalid Midtrans signature.");
  }

  if (!payload.order_id || !payload.transaction_status || payload.gross_amount === undefined) {
    throw new Error("Missing required webhook fields.");
  }

  const { data: transactionData, error: transactionError } = await supabaseAdmin
    .from("transactions")
    .select("*")
    .eq("midtrans_order_id", payload.order_id)
    .single();

  if (transactionError || !transactionData) {
    throw new Error(`Transaction not found for order: ${payload.order_id}`);
  }

  const transaction = transactionData as Transaction;

  if (transaction.status !== "pending") {
    return { transaction, already_processed: true };
  }

  const status = mapMidtransStatus(payload.transaction_status);
  const settlementTime = payload.settlement_time ? new Date(payload.settlement_time) : new Date();

  const { data: updatedData, error: updateError } = await supabaseAdmin
    .from("transactions")
    .update({
      status,
      payment_type: payload.payment_type || null,
      settlement_time: status === "paid" ? settlementTime.toISOString() : null,
      raw_response: payload,
    })
    .eq("id", transaction.id)
    .select()
    .single();

  if (updateError || !updatedData) {
    throw updateError || new Error("Gagal memperbarui transaksi.");
  }

  const updatedTransaction = updatedData as Transaction;

  if (status === "paid") {
    const { data: planData, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("*")
      .eq("id", updatedTransaction.plan_id)
      .single();

    if (planError || !planData) {
      throw planError || new Error("Plan tidak ditemukan.");
    }

    await activateSubscription(updatedTransaction, planData as SubscriptionPlan, settlementTime);
  }

  if (status === "expired") {
    await markPending(updatedTransaction, "expired");
  }

  if (status === "failed") {
    await markPending(updatedTransaction, "inactive");
  }

  return { transaction: updatedTransaction, already_processed: false };
}
