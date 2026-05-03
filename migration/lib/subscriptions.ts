import { addDays, daysLeft } from "@/lib/dates";
import { supabaseAdmin } from "@/lib/supabase";
import type { ActiveSubscription, SubscriptionPlan, Transaction, User } from "@/lib/types";

export async function createPendingSubscription(
  userId: number,
  planId: number,
  transactionId: number,
): Promise<void> {
  const { error } = await supabaseAdmin.from("subscriptions").insert({
    user_id: userId,
    plan_id: planId,
    transaction_id: transactionId,
    status: "pending",
    start_date: null,
    end_date: null,
  });

  if (error) {
    throw error;
  }
}

export async function activateSubscription(
  transaction: Transaction,
  plan: SubscriptionPlan,
  startDate: Date,
): Promise<void> {
  const endDate = addDays(startDate, plan.duration_days);

  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "inactive",
      start_date: null,
      end_date: null,
    })
    .eq("user_id", transaction.user_id)
    .eq("status", "active");

  const { data: pending } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("user_id", transaction.user_id)
    .eq("plan_id", transaction.plan_id)
    .eq("transaction_id", transaction.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (pending) {
    await supabaseAdmin
      .from("subscriptions")
      .update({
        status: "active",
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      })
      .eq("id", pending.id);
    return;
  }

  await supabaseAdmin.from("subscriptions").insert({
    user_id: transaction.user_id,
    plan_id: transaction.plan_id,
    transaction_id: transaction.id,
    status: "active",
    start_date: startDate.toISOString(),
    end_date: endDate.toISOString(),
  });
}

export async function expireEndedSubscriptions(userId: number): Promise<void> {
  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("user_id", userId)
    .eq("status", "active")
    .not("end_date", "is", null)
    .lte("end_date", new Date().toISOString());
}

export async function markPending(transaction: Transaction, status: "inactive" | "expired"): Promise<void> {
  const values =
    status === "inactive"
      ? { status, start_date: null, end_date: null }
      : { status, end_date: new Date().toISOString() };

  await supabaseAdmin
    .from("subscriptions")
    .update(values)
    .eq("user_id", transaction.user_id)
    .eq("transaction_id", transaction.id)
    .eq("status", "pending");
}

export async function getActiveSubscription(userId: number): Promise<ActiveSubscription | null> {
  await expireEndedSubscriptions(userId);

  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("*, subscription_plans(name, duration_days)")
    .eq("user_id", userId)
    .eq("status", "active")
    .gt("end_date", new Date().toISOString())
    .order("end_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as ActiveSubscription | null;
}

export async function telegramSubscriptionStatus(telegramId: string) {
  const cleanTelegramId = telegramId.trim();

  if (!/^[0-9]+$/.test(cleanTelegramId)) {
    return {
      active: false,
      telegram_id: cleanTelegramId,
      user_id: null,
      status: "invalid_telegram_id",
      message: "Telegram ID tidak valid.",
    };
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("telegram_id", cleanTelegramId)
    .maybeSingle();

  const targetUser = user as User | null;

  if (!targetUser) {
    return {
      active: false,
      telegram_id: cleanTelegramId,
      user_id: null,
      status: "not_registered",
      message: "Telegram ID belum terdaftar.",
    };
  }

  const active = await getActiveSubscription(targetUser.id);

  if (active) {
    return {
      active: true,
      telegram_id: cleanTelegramId,
      user_id: targetUser.id,
      status: "active",
      plan: active.subscription_plans?.name ?? null,
      start_date: active.start_date,
      end_date: active.end_date,
      days_left: daysLeft(active.end_date),
      message: "Subscription aktif.",
    };
  }

  const { data: latest } = await supabaseAdmin
    .from("subscriptions")
    .select("*, subscription_plans(name)")
    .eq("user_id", targetUser.id)
    .order("end_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestSubscription = latest as ActiveSubscription | null;

  return {
    active: false,
    telegram_id: cleanTelegramId,
    user_id: targetUser.id,
    status: latestSubscription?.status ?? "no_subscription",
    plan: latestSubscription?.subscription_plans?.name ?? null,
    start_date: latestSubscription?.start_date ?? null,
    end_date: latestSubscription?.end_date ?? null,
    days_left: 0,
    message: "Subscription tidak aktif atau sudah berakhir.",
  };
}
