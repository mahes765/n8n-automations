"use client";

import { useEffect, useState } from "react";

interface PollStatus {
  status: "checking" | "active" | "timeout" | "error";
  message?: string;
}

export default function PaymentPolling() {
  const [isChecking, setIsChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [pollStatus, setPollStatus] = useState<PollStatus>({ status: "checking" });
  const maxAttempts = 60; // 2 minutes dengan interval 2 detik

  const checkEntitlement = async () => {
    try {
      const response = await fetch("/api/medsos/entitlement/current", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.status === "active") {
        // Entitlement sudah active
        setPollStatus({ status: "active" });
        setTimeout(() => {
          window.location.reload();
        }, 500);
        return true;
      } else if (!response.ok) {
        setPollStatus({
          status: "error",
          message: `Error: ${data.message || "Gagal cek entitlement"}`,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[PAYMENT POLLING ERROR]", errorMsg, error);
      setPollStatus({
        status: "error",
        message: `Network error: ${errorMsg || "Unknown error"}`,
      });
    }
    return false;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const startPolling = async () => {
      // Initial check immediately
      const isActive = await checkEntitlement();
      if (isActive) return;

      // Then poll every 2 seconds
      interval = setInterval(() => {
        setAttempts((prev) => {
          const nextAttempt = prev + 1;

          if (nextAttempt >= maxAttempts) {
            setIsChecking(false);
            setPollStatus({
              status: "timeout",
              message: "Timeout menunggu aktivasi entitlement",
            });
            return prev;
          }

          return nextAttempt;
        });
      }, 2000);
    };

    startPolling();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  // Trigger check on every attempt change
  useEffect(() => {
    if (attempts > 0 && attempts < maxAttempts) {
      checkEntitlement();
    }
  }, [attempts]);

  const timeLeft = Math.max(0, (maxAttempts - attempts) * 2);
  const progressPercent = (attempts / maxAttempts) * 100;

  return (
    <section className="card stack" style={{ textAlign: "center", padding: "32px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0, marginBottom: "8px" }}>Pembayaran Sedang Diproses</h2>
        <p className="muted" style={{ margin: 0 }}>
          {pollStatus.status === "checking"
            ? "Mohon tunggu sebentar, kami sedang mengaktifkan entitlement Anda..."
            : pollStatus.status === "error"
              ? pollStatus.message
              : "Entitlement berhasil diaktifkan, redirect..."}
        </p>
      </div>

      {pollStatus.status === "checking" && (
        <>
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
            Percobaan {attempts + 1}/{maxAttempts} ({timeLeft}s)
          </p>
        </>
      )}

      {pollStatus.status === "timeout" && (
        <div style={{ marginTop: "24px" }}>
          <p className="muted" style={{ margin: 0, marginBottom: "12px" }}>
            Timeout menunggu aktivasi (2 menit). Pembayaran mungkin masih diproses server.
          </p>
          <button
            className="button"
            onClick={() => {
              setAttempts(0);
              setPollStatus({ status: "checking" });
              setIsChecking(true);
              checkEntitlement();
            }}
            style={{ marginRight: "8px" }}
          >
            Cek Lagi
          </button>
          <a href="/medsos" className="button secondary" style={{ display: "inline-block" }}>
            Kembali ke Menu
          </a>
        </div>
      )}

      {pollStatus.status === "error" && (
        <div style={{ marginTop: "24px" }}>
          <p
            className="muted"
            style={{
              margin: 0,
              marginBottom: "12px",
              fontSize: "12px",
              color: "#dc2626",
            }}
          >
            {pollStatus.message}
          </p>
          <button
            className="button"
            onClick={() => {
              setAttempts(0);
              setPollStatus({ status: "checking" });
              setIsChecking(true);
              checkEntitlement();
            }}
            style={{ marginRight: "8px" }}
          >
            Retry
          </button>
          <a href="/medsos/packages" className="button secondary" style={{ display: "inline-block" }}>
            Pilih Package Lain
          </a>
        </div>
      )}
    </section>
  );
}
