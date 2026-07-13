"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "Europe/London",
];

export default function NewTripPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    city: "",
    start_date: "",
    end_date: "",
    timezone: "America/Chicago",
    team_size: "",
    budget: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ? JSON.stringify(data.error) : "Failed to create trip");
      }
      const { id } = await res.json();
      router.push(`/trips/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="ev-crumb">Trips</div>
      <div className="ev-hd">
        <h2>New trip</h2>
      </div>
      <div className="ev-card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit}>
          <div className="ev-field">
            <label className="ev-label" htmlFor="name">Trip name</label>
            <input
              id="name"
              className="ev-input"
              required
              placeholder="e.g. UK team visits Chicago"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="city">City</label>
            <input
              id="city"
              className="ev-input"
              required
              value={form.city}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
          <div className="ev-field" style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="ev-label" htmlFor="start_date">Start date</label>
              <input
                id="start_date"
                type="date"
                className="ev-input"
                required
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="ev-label" htmlFor="end_date">End date</label>
              <input
                id="end_date"
                type="date"
                className="ev-input"
                required
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
              />
            </div>
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="timezone">Local timezone</label>
            <select
              id="timezone"
              className="ev-select"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="ev-field" style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="ev-label" htmlFor="team_size">Team size (staff)</label>
              <input
                id="team_size"
                className="ev-input"
                value={form.team_size}
                onChange={(e) => update("team_size", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="ev-label" htmlFor="budget">Overall budget</label>
              <input
                id="budget"
                className="ev-input"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </div>
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="notes">
              Notes (accommodation requirements, anything else)
            </label>
            <textarea
              id="notes"
              className="ev-textarea"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </div>
          {error && <div className="ev-error">{error}</div>}
          <div className="ev-modal-actions" style={{ justifyContent: "flex-start" }}>
            <button type="submit" className="ev-btn primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create trip"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
