"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AnalysisForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/medsos/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: form.get("platform"),
        profile_url: form.get("profile_url"),
        notes: form.get("notes"),
      }),
    });
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message || "Gagal membuat analysis.");
      return;
    }

    router.push(data.redirect_url);
    router.refresh();
  }

  return (
    <form className="card stack" onSubmit={submit}>
      <div className="field">
        <label htmlFor="platform">Platform</label>
        <select id="platform" name="platform" required>
          <option value="instagram">Instagram</option>
          <option value="tiktok">TikTok</option>
          <option value="youtube">YouTube</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="profile_url">Profile URL</label>
        <input
          id="profile_url"
          name="profile_url"
          type="url"
          placeholder="https://instagram.com/example"
          required
        />
      </div>
      <div className="field">
        <label htmlFor="notes">Additional Notes</label>
        <textarea
          id="notes"
          name="notes"
          rows={5}
          placeholder="Focus on engagement and audience sentiment"
        />
      </div>
      {message ? <p className="error">{message}</p> : null}
      <button type="submit" disabled={loading}>
        {loading ? "Submitting..." : "Start Analysis"}
      </button>
    </form>
  );
}
