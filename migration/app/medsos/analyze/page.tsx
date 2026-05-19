import AnalysisForm from "@/components/medsos/analysis-form";
import PaymentPolling from "@/components/medsos/payment-polling";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MedsosAnalyzePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const isPaymentFinish = params.payment === "finish";

  let entitlement = null;

  try {
    entitlement = await getActiveMedsosEntitlement(user.id);
  } catch (error) {
    console.error("Error fetching entitlement:", error);
    entitlement = null;
  }

  // Jika baru bayar tapi entitlement belum active, page akan polling di client-side
  if (!entitlement && !isPaymentFinish) {
    redirect("/medsos/packages");
  }

  return (
    <div className="stack page-gap">
      <section className="page-heading">
        <span className="eyebrow">New Analysis</span>
        <h1>Submit Social Media Profiles</h1>
        <p className="muted">Tambahkan satu atau lebih profile URL, lalu frontend meneruskan request ke backend dan n8n.</p>
      </section>

      {isPaymentFinish && !entitlement ? (
        <PaymentPolling />
      ) : entitlement ? (
        <section className="two-column">
          <AnalysisForm />
          <aside className="card stack">
            <span className="eyebrow">Quota</span>
            <h2>{entitlement.quota_total - entitlement.quota_used} analysis remaining</h2>
            <p className="muted">
              Package: {entitlement.medsos_packages?.name || "-"} · expires{" "}
              {entitlement.expires_at ? new Date(entitlement.expires_at).toLocaleDateString("id-ID") : "-"}
            </p>
            <Link className="button secondary" href="/medsos/history">
              View history
            </Link>
          </aside>
        </section>
      ) : null}
    </div>
  );
}
