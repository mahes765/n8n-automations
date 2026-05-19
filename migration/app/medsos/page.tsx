import { getCurrentUser } from "@/lib/auth";
import { getActiveMedsosEntitlement } from "@/lib/medsos/entitlements";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function MedsosLandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const paymentFinish = params.payment === "finish";

  let entitlement = null;

  try {
    entitlement = await getActiveMedsosEntitlement(user.id);
  } catch {
    entitlement = null;
  }

  // Kalau user sudah punya entitlement aktif (dan bukan dari payment finish callback),
  // langsung arahkan ke analyze tanpa tampil landing page
  if (entitlement && !paymentFinish) {
    redirect("/medsos/analyze");
  }

  return (
    <div className="stack page-gap">
      <section className="hero-panel">
        <div className="stack">
          <span className="eyebrow">Social Media Analysis</span>
          <h1>AI insights untuk Instagram, TikTok, dan YouTube.</h1>
          <p className="muted">
            Jalankan scraping, sentiment analysis, engagement analysis, audience insight, dan AI summary melalui workflow
            n8n yang aman dari backend.
          </p>
          {paymentFinish && !entitlement && (
            <div
              className="card"
              style={{ backgroundColor: "#fef3c7", borderLeft: "4px solid #f59e0b", padding: "12px 16px" }}
            >
              <p className="muted" style={{ margin: 0, fontSize: "14px" }}>
                Pembayaran sedang diproses. Silakan tunggu beberapa saat atau refresh halaman jika entitlement belum
                muncul.
              </p>
            </div>
          )}
          <div className="actions">
            <Link className="button" href="/medsos/packages">
              Choose package
            </Link>
            <Link className="button secondary" href="/medsos/history">
              View history
            </Link>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        {[
          ["Sentiment", "Positive, neutral, negative breakdown untuk memahami persepsi audience."],
          ["Engagement", "Skor ringkas untuk membaca performa interaksi akun."],
          ["Audience", "Insight minat, perilaku, dan peluang konten berikutnya."],
        ].map(([title, description]) => (
          <article className="card" key={title}>
            <h2>{title}</h2>
            <p className="muted">{description}</p>
          </article>
        ))}
      </section>

      <section className="card stack">
        <span className="eyebrow">Supported Platforms</span>
        <div className="platform-list">
          <span className="pill">Instagram</span>
          <span className="pill">TikTok</span>
          <span className="pill">YouTube</span>
        </div>
      </section>
    </div>
  );
}
