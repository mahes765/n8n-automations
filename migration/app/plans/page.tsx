import Link from "next/link";
import { redirect } from "next/navigation";
import { appUrl } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth";
import { daysLeft } from "@/lib/dates";
import { getActiveSubscription } from "@/lib/subscriptions";
import { ensureTelegramLinkToken } from "@/lib/telegram";
import { supabaseAdmin } from "@/lib/supabase";
import type { SubscriptionPlan } from "@/lib/types";
import SubscribeButton from "@/app/plans/subscribe-button";

function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PlansPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabaseAdmin
    .from("subscription_plans")
    .select("*")
    .order("duration_days", { ascending: true });

  const plans = (data || []) as SubscriptionPlan[];
  const activeSubscription = await getActiveSubscription(user.id);
  const token = user.telegram_id ? null : await ensureTelegramLinkToken(user);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const telegramBotUrl = token && botUsername ? `https://t.me/${botUsername}?start=${token}` : null;

  return (
    <div className="stack">
      <section>
        <h1>Pilih Paket Subscription</h1>
        <p className="muted">
          Akses bot Telegram dan workflow n8n aktif setelah webhook pembayaran Midtrans mengonfirmasi transaksi.
        </p>
      </section>

      {activeSubscription ? (
        <section className="card">
          <strong>Subscription aktif</strong>
          <span>
            {activeSubscription.subscription_plans?.name} sampai{" "}
            {activeSubscription.end_date ? new Date(activeSubscription.end_date).toLocaleString("id-ID") : "-"} (
            {daysLeft(activeSubscription.end_date)} hari tersisa)
          </span>
        </section>
      ) : null}

      <section className="plans">
        {plans.map((plan) => (
          <article className="card" key={plan.id}>
            <div>
              <h2>{plan.name}</h2>
              <p className="muted">{plan.duration_days} hari akses</p>
            </div>
            <div className="price">{rupiah(plan.price)}</div>
            <SubscribeButton planId={plan.id} />
          </article>
        ))}
      </section>

      <section className="telegram">
        <h2>Koneksi Telegram</h2>
        {user.telegram_id ? (
          <p>
            Telegram sudah terhubung: <code>{user.telegram_id}</code>
          </p>
        ) : (
          <>
            <p className="muted">
              Kirim kode berikut lewat command <code>/start</code> di bot Telegram agar n8n bisa menghubungkan akun.
            </p>
            <p>
              Kode: <code>{token}</code>
            </p>
            {telegramBotUrl ? (
              <Link className="button" href={telegramBotUrl}>
                Buka Bot Telegram
              </Link>
            ) : (
              <p className="muted">
                Set <code>TELEGRAM_BOT_USERNAME</code> untuk membuat link otomatis. Endpoint publik aplikasi ini:{" "}
                <code>{appUrl()}</code>
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
