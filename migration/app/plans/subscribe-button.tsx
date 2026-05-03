"use client";

import { useState } from "react";

export default function SubscribeButton({ planId }: { planId: number }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function subscribe() {
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Subscribe gagal.");
      return;
    }

    window.location.href = data.redirect_url;
  }

  return (
    <div className="stack">
      <button type="button" onClick={subscribe} disabled={loading}>
        {loading ? "Membuat pembayaran..." : "Subscribe"}
      </button>
      {message ? <small className="error">{message}</small> : null}
    </div>
  );
}
