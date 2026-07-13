"use client";

import { useMemo, useState } from "react";
import type {
  CandidateRecord,
  PhotoshootRecord,
  PhotoshootRowType,
  PhotoshootStatus,
  ShootType,
  TripEventRecord,
  TripRecord,
} from "@/lib/types";
import { COACHES } from "@/lib/types";
import { formatTimeInTimezone } from "@/lib/format";

type EditForm = {
  row_type: PhotoshootRowType;
  client_name: string;
  client_email: string;
  client_travelling_from: string;
  coach: string;
  shoot_type: ShootType;
  shoot_date: string;
  start_time_local: string;
  end_time_local: string;
  location: string;
  gym_candidate_id: string;
  paid: string;
  rota: string;
  notes: string;
  trip_event_id: string;
  status: PhotoshootStatus;
};

function emptyForm(defaultDate: string): EditForm {
  return {
    row_type: "shoot",
    client_name: "",
    client_email: "",
    client_travelling_from: "",
    coach: "",
    shoot_type: "unknown",
    shoot_date: defaultDate,
    start_time_local: "",
    end_time_local: "",
    location: "",
    gym_candidate_id: "",
    paid: "FALSE",
    rota: "",
    notes: "",
    trip_event_id: "",
    status: "scheduled",
  };
}

function toLocalHHMM(isoUtc: string, timezone: string): string {
  if (!isoUtc) return "";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(isoUtc));
  return formatted;
}

function localHHMMToUtcIso(dateStr: string, hhmm: string, timezone: string): string {
  if (!hhmm) return "";
  const offsetProbe = new Date(`${dateStr}T${hhmm}:00Z`);
  const asLocalString = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(offsetProbe);
  const offsetPart = asLocalString.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = offsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const sign = match?.[1] === "-" ? -1 : 1;
  const hours = match ? parseInt(match[2], 10) : 0;
  const minutes = match?.[3] ? parseInt(match[3], 10) : 0;
  const offsetMinutes = sign * (hours * 60 + minutes);
  return new Date(offsetProbe.getTime() - offsetMinutes * 60_000).toISOString();
}

export default function PhotoshootAgenda({
  tripId,
  trip,
  photoshoots,
  gyms,
  events,
  onReload,
}: {
  tripId: string;
  trip: TripRecord;
  photoshoots: PhotoshootRecord[];
  gyms: CandidateRecord[];
  events: TripEventRecord[];
  onReload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<{
    created: number;
    updated: number;
    canceled: number;
    warnings: string[];
  } | null>(null);
  const [editing, setEditing] = useState<{ id: string | "new"; form: EditForm } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, PhotoshootRecord[]>();
    for (const p of photoshoots) {
      const key = p.shoot_date || "Unscheduled";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [photoshoots]);

  async function runAction<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    setBusy(key);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handleSync() {
    setSyncSummary(null);
    const data = await runAction("sync", async () => {
      const res = await fetch(`/api/trips/${tripId}/sync-calendly`, { method: "POST" });
      if (!res.ok) throw new Error("Calendly sync failed");
      const result = await res.json();
      await onReload();
      return result;
    });
    if (data) setSyncSummary(data);
  }

  function openEdit(p: PhotoshootRecord) {
    setEditing({
      id: p.id,
      form: {
        row_type: p.row_type,
        client_name: p.client_name,
        client_email: p.client_email,
        client_travelling_from: p.client_travelling_from,
        coach: p.coach,
        shoot_type: p.shoot_type,
        shoot_date: p.shoot_date,
        start_time_local: toLocalHHMM(p.start_time, trip.timezone),
        end_time_local: toLocalHHMM(p.end_time, trip.timezone),
        location: p.location,
        gym_candidate_id: p.gym_candidate_id,
        paid: p.paid,
        rota: p.rota,
        notes: p.notes,
        trip_event_id: p.trip_event_id,
        status: p.status,
      },
    });
  }

  function openNew() {
    const defaultDate = grouped[0]?.[0] ?? trip.start_date;
    setEditing({ id: "new", form: emptyForm(defaultDate) });
  }

  async function handleSave() {
    if (!editing) return;
    const f = editing.form;
    const payload = {
      row_type: f.row_type,
      client_name: f.client_name,
      client_email: f.client_email,
      client_travelling_from: f.client_travelling_from,
      coach: f.coach,
      shoot_type: f.shoot_type,
      shoot_date: f.shoot_date,
      start_time: localHHMMToUtcIso(f.shoot_date, f.start_time_local, trip.timezone),
      end_time: localHHMMToUtcIso(f.shoot_date, f.end_time_local, trip.timezone),
      location: f.location,
      gym_candidate_id: f.gym_candidate_id,
      paid: f.paid,
      rota: f.rota,
      notes: f.notes,
      trip_event_id: f.trip_event_id,
      status: f.status,
    };

    await runAction("save", async () => {
      const url =
        editing.id === "new"
          ? `/api/trips/${tripId}/photoshoots`
          : `/api/trips/${tripId}/photoshoots/${editing.id}`;
      const res = await fetch(url, {
        method: editing.id === "new" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Could not save");
      setEditing(null);
      await onReload();
    });
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <button className="ev-btn primary" onClick={handleSync} disabled={busy === "sync"}>
          {busy === "sync" ? "Syncing…" : "Sync from Calendly"}
        </button>
        <button className="ev-btn" onClick={openNew}>
          + Add manually
        </button>
      </div>

      {error && <div className="ev-error">{error}</div>}

      {syncSummary && (
        <div className="ev-card">
          <h3>Calendly sync result</h3>
          <p style={{ fontSize: 12.5, marginBottom: syncSummary.warnings.length ? 8 : 0 }}>
            {syncSummary.created} new, {syncSummary.updated} updated
            {syncSummary.canceled ? `, ${syncSummary.canceled} canceled` : ""}.
          </p>
          {syncSummary.warnings.map((w, i) => (
            <p key={i} style={{ fontSize: 11.5, color: "var(--amb)", margin: "4px 0 0" }}>
              ⚠ {w}
            </p>
          ))}
        </div>
      )}

      {grouped.length === 0 ? (
        <div className="ev-empty">
          No photoshoots yet. Sync from Calendly or add one manually.
        </div>
      ) : (
        grouped.map(([date, rows]) => (
          <div className="ps-day" key={date}>
            <div className="ps-day-hd">
              <span className="date">
                {date === "Unscheduled"
                  ? "Unscheduled"
                  : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
              </span>
            </div>
            <div className="ps-list">
              {rows.map((p) =>
                p.row_type === "shoot" ? (
                  <div className="ps-card" key={p.id} onClick={() => openEdit(p)}>
                    <span className="time">
                      {formatTimeInTimezone(p.start_time, trip.timezone)}
                      {p.end_time ? ` – ${formatTimeInTimezone(p.end_time, trip.timezone)}` : ""}
                    </span>
                    <div className="who">
                      <div className="client">
                        {p.client_name || "(no name)"}
                        {p.shoot_type !== "unknown" && ` · ${p.shoot_type}`}
                      </div>
                      <div className="meta">
                        {p.coach && `Coach: ${p.coach}`}
                        {p.location && ` · ${p.location}`}
                        {p.rota && ` · Rota: ${p.rota}`}
                      </div>
                    </div>
                    <span className={`paid ${p.paid === "TRUE" ? "yes" : "no"}`}>
                      {p.paid === "TRUE" ? "PAID" : "UNPAID"}
                    </span>
                  </div>
                ) : (
                  <div className="ps-divider" key={p.id} onClick={() => openEdit(p)}>
                    <span className="time">
                      {formatTimeInTimezone(p.start_time, trip.timezone)}
                    </span>
                    <span>{p.notes || p.row_type.toUpperCase()}</span>
                  </div>
                )
              )}
            </div>
          </div>
        ))
      )}

      {editing && (
        <div className="ev-modal-backdrop" onClick={() => setEditing(null)}>
          <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editing.id === "new" ? "Add row" : "Edit"}</h3>

            <label className="ev-label">Type</label>
            <select
              className="ev-select"
              value={editing.form.row_type}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  form: { ...editing.form, row_type: e.target.value as PhotoshootRowType },
                })
              }
            >
              <option value="shoot">Shoot</option>
              <option value="break">Break (e.g. lunch)</option>
              <option value="logistics">Logistics (e.g. airport)</option>
            </select>

            <label className="ev-label">Date</label>
            <input
              type="date"
              className="ev-input"
              value={editing.form.shoot_date}
              onChange={(e) =>
                setEditing({ ...editing, form: { ...editing.form, shoot_date: e.target.value } })
              }
            />

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label className="ev-label">Start time</label>
                <input
                  type="time"
                  className="ev-input"
                  value={editing.form.start_time_local}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, start_time_local: e.target.value },
                    })
                  }
                />
              </div>
              <div style={{ flex: 1 }}>
                <label className="ev-label">End time</label>
                <input
                  type="time"
                  className="ev-input"
                  value={editing.form.end_time_local}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, end_time_local: e.target.value },
                    })
                  }
                />
              </div>
            </div>

            {editing.form.row_type === "shoot" ? (
              <>
                <label className="ev-label">Client name</label>
                <input
                  className="ev-input"
                  value={editing.form.client_name}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, client_name: e.target.value } })
                  }
                />
                <label className="ev-label">Client email</label>
                <input
                  className="ev-input"
                  value={editing.form.client_email}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, client_email: e.target.value } })
                  }
                />
                <label className="ev-label">Travelling from</label>
                <input
                  className="ev-input"
                  value={editing.form.client_travelling_from}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      form: { ...editing.form, client_travelling_from: e.target.value },
                    })
                  }
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="ev-label">Coach</label>
                    <select
                      className="ev-select"
                      value={editing.form.coach}
                      onChange={(e) =>
                        setEditing({ ...editing, form: { ...editing.form, coach: e.target.value } })
                      }
                    >
                      <option value="">—</option>
                      {COACHES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ev-label">Shoot type</label>
                    <select
                      className="ev-select"
                      value={editing.form.shoot_type}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          form: { ...editing.form, shoot_type: e.target.value as ShootType },
                        })
                      }
                    >
                      <option value="unknown">—</option>
                      <option value="individual">Individual</option>
                      <option value="couple">Couple</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label className="ev-label">Gym / location</label>
                    <select
                      className="ev-select"
                      value={editing.form.gym_candidate_id}
                      onChange={(e) => {
                        const gym = gyms.find((g) => g.id === e.target.value);
                        setEditing({
                          ...editing,
                          form: {
                            ...editing.form,
                            gym_candidate_id: e.target.value,
                            location: gym ? gym.name : editing.form.location,
                          },
                        });
                      }}
                    >
                      <option value="">Custom location…</option>
                      {gyms.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="ev-label">Event</label>
                    <select
                      className="ev-select"
                      value={editing.form.trip_event_id}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          form: { ...editing.form, trip_event_id: e.target.value },
                        })
                      }
                    >
                      <option value="">—</option>
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="ev-label">Location (override)</label>
                <input
                  className="ev-input"
                  value={editing.form.location}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, location: e.target.value } })
                  }
                />
                <label className="ev-label">Rota (support staff)</label>
                <input
                  className="ev-input"
                  value={editing.form.rota}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, rota: e.target.value } })
                  }
                />
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <input
                    type="checkbox"
                    checked={editing.form.paid === "TRUE"}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        form: { ...editing.form, paid: e.target.checked ? "TRUE" : "FALSE" },
                      })
                    }
                  />
                  <span style={{ fontSize: 12.5 }}>Paid</span>
                </label>
              </>
            ) : (
              <>
                <label className="ev-label">Label</label>
                <input
                  className="ev-input"
                  placeholder="e.g. LUNCH, Airport transfer"
                  value={editing.form.notes}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, notes: e.target.value } })
                  }
                />
              </>
            )}

            {editing.form.row_type === "shoot" && (
              <>
                <label className="ev-label">Notes</label>
                <textarea
                  className="ev-textarea"
                  value={editing.form.notes}
                  onChange={(e) =>
                    setEditing({ ...editing, form: { ...editing.form, notes: e.target.value } })
                  }
                />
              </>
            )}

            <div className="ev-modal-actions">
              <button className="ev-btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="ev-btn primary" onClick={handleSave} disabled={busy === "save"}>
                {busy === "save" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
