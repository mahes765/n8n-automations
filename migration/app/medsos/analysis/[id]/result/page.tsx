import { getCurrentUser } from "@/lib/auth";
import { getMedsosResult } from "@/lib/medsos/requests";
import Link from "next/link";
import { redirect } from "next/navigation";
import ExportPdfButton from "./export-pdf-button";

function asPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function topicLabel(topic: unknown): string {
  if (typeof topic === "string") {
    return topic;
  }

  if (topic && typeof topic === "object" && "label" in topic) {
    return String(topic.label);
  }

  return JSON.stringify(topic);
}

export default async function MedsosResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  const requestId = Number(id);

  if (!Number.isInteger(requestId) || requestId <= 0) {
    redirect("/medsos/history");
  }

  const data = await getMedsosResult(user.id, requestId);

  if (!data) {
    redirect("/medsos/history");
  }

  if (!data.result) {
    redirect(`/medsos/analysis/${requestId}`);
  }

  const { request, result } = data;
  const sentiment = result.sentiment_breakdown || {};
  const recommendations = result.recommendations || [];

  return (
    <div className="stack page-gap">
      <section className="row-between page-heading">
        <div>
          <span className="eyebrow">Analysis Result</span>
          <h1>{request.platform.toUpperCase()} Report</h1>
          <p className="muted">
            {request.profile_url} · {result.generated_at ? new Date(result.generated_at).toLocaleString("id-ID") : "-"}
          </p>
        </div>
        <ExportPdfButton />
      </section>

      <section className="metric-grid">
        <article className="card">
          <span className="eyebrow">Sentiment</span>
          <h2>{result.sentiment_label || "-"}</h2>
          <p className="muted">{asPercent(result.sentiment_score)}</p>
        </article>
        <article className="card">
          <span className="eyebrow">Engagement Score</span>
          <h2>{result.engagement_score ?? "-"}</h2>
          <p className="muted">0-100 score</p>
        </article>
        <article className="card">
          <span className="eyebrow">Platform</span>
          <h2>{request.platform}</h2>
          <p className="muted">Profile analyzed</p>
        </article>
      </section>

      <section className="card stack">
        <span className="eyebrow">AI Summary</span>
        <p className="summary-text">{result.summary || "Summary belum tersedia."}</p>
      </section>

      <section className="single-column">
        <article className="card stack">
          <span className="eyebrow">Top Topics</span>
          <div className="tag-cloud">
            {(result.top_topics || []).slice(0, 10).map((topic, index) => (
              <span className="pill" key={`${topicLabel(topic)}-${index}`}>
                {topicLabel(topic)}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="two-column">
        <article className="card stack">
          <span className="eyebrow">Audience Insight</span>

          <div className="flex flex-col gap-3">
            {Object.entries(result.audience_insight || {}).length ? (
              Object.entries(result.audience_insight || {}).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm"
                >
                  <strong className="capitalize">
                    {key.replace(/_/g, " ")}:
                  </strong>{" "}
                  {Array.isArray(value)
                    ? value.join(", ")
                    : typeof value === "object"
                      ? JSON.stringify(value)
                      : String(value)}
                </div>
              ))
            ) : (
              <p>Audience insight belum tersedia.</p>
            )}
          </div>
        </article>

        <article className="card stack">
          <span className="eyebrow">Recommendations</span>

          <ul className="feature-list">
            {recommendations.length ? (
              recommendations.map((item, index) => (
                <li key={index}>{topicLabel(item)}</li>
              ))
            ) : (
              <li>Recommendation belum tersedia.</li>
            )}
          </ul>
        </article>
      </section>

      <div className="actions">
        <Link className="button secondary" href="/medsos/history">
          Back to history
        </Link>
        <Link className="button" href="/medsos/analyze">
          New analysis
        </Link>
      </div>
    </div>
  );
}
