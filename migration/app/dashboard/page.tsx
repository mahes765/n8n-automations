import { redirect } from "next/navigation";
import ServiceCard from "@/components/dashboard/service-card";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="stack page-gap">
      <section className="page-heading">
        <span className="eyebrow">Dashboard</span>
        <h1>Choose Your Service</h1>
        <p className="muted">Pilih module yang ingin digunakan tanpa mengubah flow financial yang sudah berjalan.</p>
      </section>

      <section className="service-grid">
        <ServiceCard
          title="Financial Recording"
          description="Kelola pencatatan keuangan, subscription, transaksi, dan integrasi Telegram existing."
          href="/plans"
          accent="#0f766e"
          meta="Existing module"
        />
        <ServiceCard
          title="Social Media Analysis"
          description="Analisis Instagram, TikTok, dan YouTube menggunakan AI insights dan workflow n8n."
          href="/medsos"
          accent="#2563eb"
          meta="New module"
        />
      </section>
    </div>
  );
}
