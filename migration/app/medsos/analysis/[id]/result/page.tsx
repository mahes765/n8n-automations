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

export default async function MedsosResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const recommendations = result.recommendations || [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 pb-10">
      {/* Header */}
      <section className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-zinc-900 to-zinc-950 p-8 shadow-2xl lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <span className="inline-flex w-fit rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            Analysis Result
          </span>

          <h1 className="text-4xl font-bold tracking-tight text-white">
            {request.platform.toUpperCase()} Report
          </h1>

          <p className="text-sm text-zinc-400">
            {request.profile_url}
          </p>

          <p className="text-sm text-zinc-500">
            {result.generated_at
              ? new Date(result.generated_at).toLocaleString("id-ID")
              : "-"}
          </p>
        </div>

        <ExportPdfButton />
      </section>

      {/* Metrics */}
      <section className="grid gap-5 md:grid-cols-3">
        <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 p-6 shadow-lg backdrop-blur">
          <span className="text-xs uppercase tracking-wider text-emerald-300">
            Sentiment
          </span>

          <h2 className="mt-3 text-3xl font-bold text-white">
            {result.sentiment_label || "-"}
          </h2>

          <p className="mt-2 text-sm text-zinc-300">
            {asPercent(result.sentiment_score)}
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 p-6 shadow-lg backdrop-blur">
          <span className="text-xs uppercase tracking-wider text-indigo-300">
            Engagement Score
          </span>

          <h2 className="mt-3 text-3xl font-bold text-white">
            {result.engagement_score ?? "-"}
          </h2>

          <p className="mt-2 text-sm text-zinc-300">
            0-100 score
          </p>
        </article>

        <article className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 p-6 shadow-lg backdrop-blur">
          <span className="text-xs uppercase tracking-wider text-cyan-300">
            Platform
          </span>

          <h2 className="mt-3 text-3xl font-bold text-white">
            {request.platform}
          </h2>

          <p className="mt-2 text-sm text-zinc-300">
            Profile analyzed
          </p>
        </article>
      </section>

      {/* AI Summary */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 p-8 shadow-xl">
        <div className="space-y-4">
          <span className="inline-flex rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-purple-300">
            AI Summary
          </span>

          <p className="text-base leading-8 text-zinc-200">
            {result.summary || "Summary belum tersedia."}
          </p>
        </div>
      </section>

      {/* Top Topics */}
      <section className="rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-xl">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-cyan-300">
            Top Topics
          </span>

          <div className="flex flex-wrap gap-3">
            {(result.top_topics || []).slice(0, 10).map((topic, index) => (
              <span
                key={`${topicLabel(topic)}-${index}`}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200 transition hover:bg-cyan-400/20"
              >
                {topicLabel(topic)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Insight */}
      <section className="rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-xl">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-amber-300">
            Audience Insight
          </span>

          <div className="flex flex-col gap-4">
            {Object.entries(result.audience_insight || {}).length ? (
              Object.entries(result.audience_insight || {}).map(
                ([key, value]) => (
                  <div
                    key={key}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5"
                  >
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      {key.replace(/_/g, " ")}
                    </p>

                    <p className="text-sm leading-7 text-zinc-200">
                      {Array.isArray(value)
                        ? value.join(", ")
                        : typeof value === "object"
                        ? JSON.stringify(value)
                        : String(value)}
                    </p>
                  </div>
                )
              )
            ) : (
              <p className="text-zinc-400">
                Audience insight belum tersedia.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="rounded-3xl border border-white/10 bg-zinc-900/70 p-8 shadow-xl">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-300">
            Recommendations
          </span>

          {recommendations.length ? (
            <ul className="flex flex-col gap-4">
              {recommendations.map((item, index) => {
                const cleanText = topicLabel(item).replace(/\*\*/g, "");

                return (
                  <li
                    key={index}
                    className="group rounded-2xl border border-emerald-400/10 bg-emerald-400/5 p-5 transition hover:border-emerald-400/30 hover:bg-emerald-400/10"
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-300">
                        {index + 1}
                      </div>

                      <p className="text-sm leading-7 text-zinc-100">
                        {cleanText}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-zinc-400">
              Recommendation belum tersedia.
            </p>
          )}
        </div>
      </section>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 pt-4">
        <Link
          className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          href="/medsos/history"
        >
          Back to History
        </Link>

        <Link
          className="rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
          href="/medsos/analyze"
        >
          New Analysis
        </Link>
      </div>
    </div>
  );
}