import { redirect } from "next/navigation";
import PackageCheckoutButton from "@/components/medsos/package-checkout-button";
import { getCurrentUser } from "@/lib/auth";
import { listMedsosPackages } from "@/lib/medsos/packages";

function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function MedsosPackagesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const packages = await listMedsosPackages();

  return (
    <div className="stack page-gap">
      <section className="page-heading">
        <span className="eyebrow">One-time purchase</span>
        <h1>Choose Analysis Package</h1>
        <p className="muted">Package medsos memakai payment existing dan berubah menjadi entitlement + quota.</p>
      </section>

      <section className="plans">
        {packages.map((packageData) => (
          <article className="card package-card" key={packageData.id}>
            <div>
              <h2>{packageData.name}</h2>
              <p className="muted">{packageData.description}</p>
            </div>
            <div>
              <div className="price">{rupiah(packageData.price)}</div>
              <p className="muted">
                {packageData.quota_limit} analysis · valid {packageData.validity_days} hari
              </p>
            </div>
            <ul className="feature-list">
              {packageData.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <PackageCheckoutButton packageId={packageData.id} />
          </article>
        ))}
      </section>
    </div>
  );
}
