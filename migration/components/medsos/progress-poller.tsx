"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { MedsosRequest } from "@/lib/types";

type EventRow = {
  id: number;
  message: string | null;
  step_name: string | null;
  status: string | null;
  created_at: string;
};

const steps = [
  "Request received",
  "Validating URL",
  "Scraping social media",
  "AI processing",
  "Generating report",
  "Report completed",
];

export default function ProgressPoller({
  requestId,
  initialAnalysis,
  initialEvents,
}: {
  requestId: number;
  initialAnalysis: MedsosRequest;
  initialEvents: EventRow[];
}) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    if (analysis.status === "completed" || analysis.status === "failed" || analysis.status === "cancelled") {
      return;
    }

    const interval = window.setInterval(async () => {
      const response = await fetch(`/api/medsos/analysis/${requestId}`);

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setAnalysis(data.analysis);
      setEvents(data.events || []);
    }, 7000);

    return () => window.clearInterval(interval);
  }, [analysis.status, requestId]);

  const completed = analysis.status === "completed";
  const failed = analysis.status === "failed";

  return (
    <section className="card stack">
      <div className="row-between">
        <div>
          <span className={`status-badge ${failed ? "danger" : completed ? "success" : ""}`}>{analysis.status}</span>
          <h1>Analysis Progress</h1>
          <p className="muted">{analysis.current_step || "Waiting for progress update"}</p>
        </div>
        <strong>{analysis.progress_percent}%</strong>
      </div>

      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${analysis.progress_percent}%` }} />
      </div>

      <div className="timeline">
        {steps.map((step) => {
          const done = events.some((event) => event.message === step || event.step_name === step);
          const active = analysis.current_step === step;

          return (
            <div className={`timeline-row ${done || active ? "active" : ""}`} key={step}>
              <span>{done ? "✓" : active ? "●" : "○"}</span>
              <p>{step}</p>
            </div>
          );
        })}
      </div>

      {failed ? (
        <div className="notice danger">
          <strong>Analysis failed</strong>
          <p>{analysis.error_message || "Workflow gagal diproses. Silakan coba submit analysis baru."}</p>
        </div>
      ) : null}

      {completed ? (
        <Link className="button" href={`/medsos/analysis/${requestId}/result`}>
          View Result
        </Link>
      ) : null}
    </section>
  );
}
