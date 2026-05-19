"use client";

import { useEffect, useState } from "react";

export default function PaymentPolling() {
  const [isChecking, setIsChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 60; // 2 minutes dengan interval 2 detik

  useEffect(() => {
    const checkEntitlement = async () => {
      if (attempts >= maxAttempts) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch("/api/medsos/entitlement/current", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === "active") {
            // Entitlement sudah active, refresh page untuk menampilkan form
            window.location.reload();
          }
        }
      } catch (error) {
        console.error("Error checking entitlement:", error);
      }

      setAttempts((prev) => prev + 1);
    };

    const interval = setInterval(() => {
      checkEntitlement();
    }, 2000); // Check setiap 2 detik

    return () => clearInterval(interval);
  }, [attempts, maxAttempts]);

  const timeLeft = Math.max(0, (maxAttempts - attempts) * 2);
  const progressPercent = (attempts / maxAttempts) * 100;

  return (
    <section className="card stack" style={{ textAlign: "center", padding: "32px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, marginBottom: "8px" }}>Pembayaran Sedang Diproses</h2>
        <p className="muted" style={{ margin: 0 }}>
          Mohon tunggu sebentar, kami sedang mengaktifkan entitlement Anda...
        </p>
      </div>

      <div
        style={{
          width: "100%",
          height: "4px",
          backgroundColor: "#e5e7eb",
          borderRadius: "2px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            backgroundColor: "#3b82f6",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <p className="muted" style={{ fontSize: "12px", margin: 0 }}>
        {isChecking ? `Menunggu aktivasi... (${timeLeft}s)` : "Waktu tunggu habis"}
      </p>

      {!isChecking && (
        <div style={{ marginTop: "24px" }}>
          <p className="muted" style={{ margin: 0, marginBottom: "12px" }}>
            Entitlement belum teraktivasi setelah 2 menit.
          </p>
          <button
            className="button"
            onClick={() => window.location.reload()}
            style={{ marginRight: "8px" }}
          >
            Cek Lagi
          </button>
          <a href="/medsos" className="button secondary" style={{ display: "inline-block" }}>
            Kembali ke Menu
          </a>
        </div>
      )}
    </section>
  );
}
