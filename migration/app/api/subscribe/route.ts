import { NextRequest } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { json } from "@/lib/http";
import { createMidtransSnap, createOrderId } from "@/lib/midtrans";
import { createPendingSubscription } from "@/lib/subscriptions";
import { supabaseAdmin } from "@/lib/supabase";
import type { SubscriptionPlan } from "@/lib/types";

const schema = z.object({
  plan_id: z.coerce.number().int().positive(),
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return json({ message: "Login diperlukan sebelum melakukan subscribe." }, 401);
  }

  const parsed = schema.safeParse(await request.json());

  if (!parsed.success) {
    return json({ message: "Plan tidak valid." }, 422);
  }

  const { data: planData } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .eq("id", parsed.data.plan_id)
    .single();

  const plan = planData as SubscriptionPlan | null;

  if (!plan) {
    return json({ message: "Plan tidak ditemukan." }, 404);
  }

  const orderId = createOrderId(user.id);
  const { data: transaction, error } = await supabaseAdmin
    .from("transactions")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      midtrans_order_id: orderId,
      status: "pending",
      gross_amount: plan.price,
    })
    .select()
    .single();

  if (error || !transaction) {
    return json({ message: error?.message || "Gagal membuat transaksi." }, 500);
  }

  await createPendingSubscription(user.id, plan.id, transaction.id);
  const payment = await createMidtransSnap(orderId, plan.price, user);

  return json(
    {
      redirect_url: payment.redirect_url,
      snap_token: payment.snap_token,
      transaction_id: transaction.id,
      midtrans_order_id: orderId,
    },
    201,
  );
}
