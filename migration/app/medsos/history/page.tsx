import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMedsosHistory } from "@/lib/medsos/requests";

export default async function MedsosHistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const history = await getMedsosHistory(user.id);

  return (
    <div className="stack page-gap">
      <section className="row-between page-heading">
        <div>
          <span className="eyebrow">History</span>
          <h1>Analysis History</h1>
          <p className="muted">Semua analysis milik user aktif.</p>
        </div>
        <Link className="button" href="/medsos/analyze">
          New analysis
        </Link>
      </section>

      <section className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Platform</th>
              <th>Profile</th>
              <th>Status</th>
              <th>Created</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {history.map((item) => (
              <tr key={item.id}>
                <td>{item.platform}</td>
                <td className="truncate">{item.profile_url}</td>
                <td>
                  <span className={`status-badge ${item.status === "failed" ? "danger" : ""}`}>{item.status}</span>
                </td>
                <td>{new Date(item.created_at).toLocaleString("id-ID")}</td>
                <td>
                  {item.status === "completed" ? (
                    <Link href={`/medsos/analysis/${item.id}/result`}>View result</Link>
                  ) : (
                    <Link href={`/medsos/analysis/${item.id}`}>View progress</Link>
                  )}
                </td>
              </tr>
            ))}
            {!history.length ? (
              <tr>
                <td colSpan={5}>Belum ada analysis.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
