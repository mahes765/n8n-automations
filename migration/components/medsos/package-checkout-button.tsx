"use client";

import { useState } from "react";

export default function PackageCheckoutButton({ packageId }: { packageId: number }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [redirectUrl, setRedirectUrl] = useState("");

  async function checkout() {
    setLoading(true);
    setMessage("");
    setRedirectUrl("");

    const response = await fetch("/api/medsos/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: packageId }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal membuat pembayaran.");
      return;
    }

    if (!data.redirect_url || typeof data.redirect_url !== "string") {
      setMessage("Payment berhasil dibuat, tapi URL Midtrans tidak tersedia.");
      return;
    }

    try {
      const url = new URL(data.redirect_url);

      if (!url.hostname.endsWith("midtrans.com")) {
        setMessage("URL pembayaran tidak valid.");
        return;
      }
    } catch {
      setMessage("URL pembayaran tidak valid.");
      return;
    }

    setRedirectUrl(data.redirect_url);
    setMessage("Mengalihkan ke Midtrans...");
    window.location.assign(data.redirect_url);
  }

  return (
    <div className="stack compact">
      <button type="button" onClick={checkout} disabled={loading}>
        {loading ? "Memproses..." : "Buy package"}
      </button>
      {redirectUrl ? (
        <a className="button secondary" href={redirectUrl}>
          Buka Midtrans
        </a>
      ) : null}
      {message ? <span className="error">{message}</span> : null}
    </div>
  );
}
