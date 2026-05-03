"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Register gagal.");
      return;
    }

    router.push(data.redirect_url || "/plans");
    router.refresh();
  }

  return (
    <form className="panel stack" onSubmit={submit}>
      <div>
        <h1>Register</h1>
        <p className="muted">Buat akun baru untuk mulai berlangganan.</p>
      </div>
      <div className="field">
        <label htmlFor="name">Nama</label>
        <input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {message ? <p className="error">{message}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Memproses..." : "Register"}
      </button>
    </form>
  );
}
