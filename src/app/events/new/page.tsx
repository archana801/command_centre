"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    city: "",
    start_date: "",
    end_date: "",
    capacity: "",
    budget: "",
    requirements: "",
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
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ? JSON.stringify(data.error) : "Failed to create event");
      }
      const { id } = await res.json();
      router.push(`/events/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="ev-crumb">Events</div>
      <div className="ev-hd">
        <h2>New event</h2>
      </div>
      <div className="ev-card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit}>
          <div className="ev-field">
            <label className="ev-label" htmlFor="name">Event name</label>
            <input
              id="name"
              className="ev-input"
              required
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
          <div className="ev-field" style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label className="ev-label" htmlFor="capacity">Capacity (people)</label>
              <input
                id="capacity"
                className="ev-input"
                required
                value={form.capacity}
                onChange={(e) => update("capacity", e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="ev-label" htmlFor="budget">Budget</label>
              <input
                id="budget"
                className="ev-input"
                required
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </div>
          </div>
          <div className="ev-field">
            <label className="ev-label" htmlFor="requirements">
              Requirements (bedrooms/bathrooms needed, gym policies, anything else)
            </label>
            <textarea
              id="requirements"
              className="ev-textarea"
              value={form.requirements}
              onChange={(e) => update("requirements", e.target.value)}
            />
          </div>
          {error && <div className="ev-error">{error}</div>}
          <div className="ev-modal-actions" style={{ justifyContent: "flex-start" }}>
            <button type="submit" className="ev-btn primary" disabled={submitting}>
              {submitting ? "Creating…" : "Create event"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
