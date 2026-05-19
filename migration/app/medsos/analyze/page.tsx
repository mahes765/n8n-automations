import Link from "next/link";
import { redirect } from "next/navigation";
import AnalysisForm from "@/components/medsos/analysis-form";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";

export default async function MedsosAnalyzePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const entitlement = await getActiveMedsosEntitlement(user.id);

  if (!entitlement) {
    redirect("/medsos/packages");
  }

  return (
    <div className="stack page-gap">
      <section className="page-heading">
        <span className="eyebrow">New Analysis</span>
        <h1>Submit Social Media Profile</h1>
        <p className="muted">Frontend mengirim ke backend, lalu backend meneruskan request ke n8n.</p>
      </section>

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
    </div>
  );
}
