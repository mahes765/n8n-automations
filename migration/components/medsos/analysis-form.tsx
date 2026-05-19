"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AnalysisForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [profileUrls, setProfileUrls] = useState([""]);

  function updateProfileUrl(index: number, value: string) {
    setProfileUrls((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  function addProfileUrl() {
    setProfileUrls((current) => [...current, ""]);
  }

  function removeProfileUrl(index: number) {
    setProfileUrls((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    const normalizedProfileUrls = profileUrls.map((profileUrl) => profileUrl.trim());

    if (normalizedProfileUrls.some((profileUrl) => !profileUrl)) {
      setLoading(false);
      setMessage("Semua profile URL yang ditambahkan harus diisi.");
      return;
    }

    const response = await fetch("/api/medsos/analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: form.get("platform"),
        profile_urls: normalizedProfileUrls,
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
        <div className="row-between" style={{ alignItems: "center" }}>
          <label>Profile URLs</label>
          <button type="button" className="button secondary" onClick={addProfileUrl}>
            + Tambah URL
          </button>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          {profileUrls.map((profileUrl, index) => (
            <div key={`${index}`} className="row-between" style={{ gap: 12, alignItems: "center" }}>
              <input
                id={`profile_url_${index}`}
                name={`profile_url_${index}`}
                type="url"
                placeholder="https://instagram.com/example"
                value={profileUrl}
                onChange={(event) => updateProfileUrl(index, event.target.value)}
                required
              />
              {profileUrls.length > 1 ? (
                <button type="button" className="button secondary" onClick={() => removeProfileUrl(index)}>
                  Hapus
                </button>
              ) : null}
            </div>
          ))}
        </div>
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
