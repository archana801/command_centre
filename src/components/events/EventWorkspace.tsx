"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CandidateCategory,
  CandidateRecord,
  CandidateStatus,
  EventRecord,
  OutreachLogRecord,
} from "@/lib/types";
import { CANDIDATE_TABS } from "@/lib/types";
import { formatCountdown } from "@/lib/format";

type Bundle = {
  event: EventRecord;
  venues: CandidateRecord[];
  accommodations: CandidateRecord[];
  gyms: CandidateRecord[];
  outreachLog: OutreachLogRecord[];
};

const STATUS_OPTIONS: CandidateStatus[] = [
  "candidate",
  "contacted",
  "negotiating",
  "booked",
  "rejected",
];

function candidatesFor(bundle: Bundle, category: CandidateCategory): CandidateRecord[] {
  switch (category) {
    case "venue":
      return bundle.venues;
    case "accommodation":
      return bundle.accommodations;
    case "gym":
      return bundle.gyms;
  }
}

const EMPTY_CANDIDATE_FORM = {
  name: "",
  address: "",
  website: "",
  contact_email: "",
  contact_phone: "",
  capacity_or_rooms: "",
  price_estimate: "",
};

export default function EventWorkspace({
  eventId,
  initialBundle,
}: {
  eventId: string;
  initialBundle: Bundle;
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);
  const [tab, setTab] = useState<CandidateCategory | "overview">("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_CANDIDATE_FORM);
  const [draftFor, setDraftFor] = useState<CandidateRecord | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string; to: string } | null>(null);
  const [replyUpdates, setReplyUpdates] = useState<
    { candidateName: string; summary: string; suggested_status: string }[] | null
  >(null);

  async function reload() {
    const res = await fetch(`/api/events/${eventId}`);
    if (res.ok) setBundle(await res.json());
  }

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

  async function handleResearch(category: CandidateCategory) {
    await runAction(`research-${category}`, async () => {
      const res = await fetch(`/api/events/${eventId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error("Research request failed");
      await reload();
    });
  }

  async function handleAddCandidate(category: CandidateCategory) {
    await runAction("add-candidate", async () => {
      const res = await fetch(`/api/events/${eventId}/candidates?category=${category}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (!res.ok) throw new Error("Could not add candidate");
      setAddForm(EMPTY_CANDIDATE_FORM);
      setShowAddForm(false);
      await reload();
    });
  }

  async function handleStatusChange(
    category: CandidateCategory,
    candidateId: string,
    status: CandidateStatus
  ) {
    await runAction(`status-${candidateId}`, async () => {
      const res = await fetch(
        `/api/events/${eventId}/candidates/${candidateId}?category=${category}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) throw new Error("Could not update status");
      await reload();
    });
  }

  async function openDraft(category: CandidateCategory, candidate: CandidateRecord) {
    setDraftFor(candidate);
    setDraft(null);
    await runAction(`draft-${candidate.id}`, async () => {
      const res = await fetch(
        `/api/events/${eventId}/candidates/${candidate.id}/draft-email?category=${category}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Could not draft email");
      const data = await res.json();
      setDraft({ subject: data.draft.subject, body: data.draft.body, to: data.recipient });
    });
  }

  async function handleSend(category: CandidateCategory) {
    if (!draftFor || !draft) return;
    await runAction(`send-${draftFor.id}`, async () => {
      const res = await fetch(
        `/api/events/${eventId}/candidates/${draftFor.id}/send-email?category=${category}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: draft.to,
            subject: draft.subject,
            body: draft.body,
            candidateName: draftFor.name,
          }),
        }
      );
      if (!res.ok) throw new Error("Could not send email");
      setDraftFor(null);
      setDraft(null);
      await reload();
    });
  }

  async function handleCheckReplies() {
    await runAction("check-replies", async () => {
      const res = await fetch(`/api/events/${eventId}/check-replies`, { method: "POST" });
      if (!res.ok) throw new Error("Could not check replies");
      const data = await res.json();
      setReplyUpdates(data.updates);
      await reload();
    });
  }

  async function handleArchive() {
    if (!confirm("Archive this event? It will be removed from the active list.")) return;
    await runAction("archive", async () => {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Could not archive event");
      router.push("/events");
    });
  }

  const { event } = bundle;
  const countdown = formatCountdown(event.start_date);

  return (
    <>
      <div className="ev-crumb">Events</div>
      <div className="ev-hd">
        <h2>{event.name}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="ev-btn" onClick={handleCheckReplies} disabled={busy === "check-replies"}>
            {busy === "check-replies" ? "Checking…" : "Check replies"}
          </button>
          <button className="ev-btn ghost" onClick={handleArchive} disabled={busy === "archive"}>
            Archive
          </button>
        </div>
      </div>
      <p className="ev-sub">
        {event.city} · {event.start_date} → {event.end_date} · capacity {event.capacity} · budget{" "}
        {event.budget}
      </p>

      <div className="ev-card" style={{ maxWidth: 220 }}>
        <h3>Countdown</h3>
        <div className="ev-countdown">
          {countdown.value}
          <small>{countdown.label}</small>
        </div>
      </div>

      {error && <div className="ev-error">{error}</div>}

      {replyUpdates && replyUpdates.length > 0 && (
        <div className="ev-card">
          <h3>New replies</h3>
          {replyUpdates.map((u, i) => (
            <p key={i} style={{ fontSize: 12, marginBottom: 8 }}>
              <strong>{u.candidateName}:</strong> {u.summary} — suggested status:{" "}
              <em>{u.suggested_status}</em>
            </p>
          ))}
        </div>
      )}

      <div className="ev-tabs">
        <button className={`ev-tab ${tab === "overview" ? "on" : ""}`} onClick={() => setTab("overview")}>
          Overview
        </button>
        {CANDIDATE_TABS.map((c) => (
          <button
            key={c.category}
            className={`ev-tab ${tab === c.category ? "on" : ""}`}
            onClick={() => setTab(c.category)}
          >
            {c.label} ({candidatesFor(bundle, c.category).length})
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="ev-card">
          <h3>Requirements</h3>
          <p style={{ fontSize: 12.5 }}>{event.requirements || "None specified."}</p>
        </div>
      )}

      {tab !== "overview" && (
        <CandidateTab
          category={tab}
          candidates={candidatesFor(bundle, tab)}
          busy={busy}
          showAddForm={showAddForm}
          addForm={addForm}
          setAddForm={setAddForm}
          onToggleAddForm={() => setShowAddForm((s) => !s)}
          onResearch={() => handleResearch(tab)}
          onAddCandidate={() => handleAddCandidate(tab)}
          onStatusChange={(id, status) => handleStatusChange(tab, id, status)}
          onDraft={(c) => openDraft(tab, c)}
        />
      )}

      {draftFor && (
        <div className="ev-modal-backdrop" onClick={() => setDraftFor(null)}>
          <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Email to {draftFor.name}</h3>
            {!draft ? (
              <p className="ev-empty">Drafting…</p>
            ) : (
              <>
                <label className="ev-label">To</label>
                <input
                  className="ev-input"
                  value={draft.to}
                  onChange={(e) => setDraft({ ...draft, to: e.target.value })}
                />
                <label className="ev-label">Subject</label>
                <input
                  className="ev-input"
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                />
                <label className="ev-label">Body</label>
                <textarea
                  className="ev-textarea"
                  style={{ minHeight: 180 }}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                />
                <div className="ev-modal-actions">
                  <button className="ev-btn ghost" onClick={() => setDraftFor(null)}>
                    Cancel
                  </button>
                  <button
                    className="ev-btn primary"
                    onClick={() => handleSend(tab as CandidateCategory)}
                    disabled={busy === `send-${draftFor.id}` || !draft.to}
                  >
                    {busy === `send-${draftFor.id}` ? "Sending…" : "Send"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function CandidateTab({
  category,
  candidates,
  busy,
  showAddForm,
  addForm,
  setAddForm,
  onToggleAddForm,
  onResearch,
  onAddCandidate,
  onStatusChange,
  onDraft,
}: {
  category: CandidateCategory;
  candidates: CandidateRecord[];
  busy: string | null;
  showAddForm: boolean;
  addForm: typeof EMPTY_CANDIDATE_FORM;
  setAddForm: (f: typeof EMPTY_CANDIDATE_FORM) => void;
  onToggleAddForm: () => void;
  onResearch: () => void;
  onAddCandidate: () => void;
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
  onDraft: (candidate: CandidateRecord) => void;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button className="ev-btn primary" onClick={onResearch} disabled={busy === `research-${category}`}>
          {busy === `research-${category}` ? "Researching…" : "Research with Claude"}
        </button>
        <button className="ev-btn" onClick={onToggleAddForm}>
          {showAddForm ? "Cancel" : "+ Add manually"}
        </button>
      </div>

      {showAddForm && (
        <div className="ev-card">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {(
              [
                ["name", "Name"],
                ["address", "Address"],
                ["website", "Website"],
                ["contact_email", "Contact email"],
                ["contact_phone", "Contact phone"],
                ["capacity_or_rooms", "Capacity / rooms"],
                ["price_estimate", "Price estimate"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} style={{ flex: "1 1 200px" }}>
                <label className="ev-label">{label}</label>
                <input
                  className="ev-input"
                  value={addForm[key]}
                  onChange={(e) => setAddForm({ ...addForm, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="ev-modal-actions" style={{ justifyContent: "flex-start" }}>
            <button
              className="ev-btn primary"
              onClick={onAddCandidate}
              disabled={busy === "add-candidate" || !addForm.name}
            >
              {busy === "add-candidate" ? "Adding…" : "Add candidate"}
            </button>
          </div>
        </div>
      )}

      {candidates.length === 0 ? (
        <div className="ev-empty">No candidates yet. Research with Claude or add one manually.</div>
      ) : (
        <table className="ev-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Details</th>
              <th>Price</th>
              <th>Fit</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: 10.5, color: "var(--muted)" }}>{c.address}</div>
                </td>
                <td>
                  {c.capacity_or_rooms}
                  {c.website && (
                    <div style={{ fontSize: 10.5 }}>
                      <a href={c.website} target="_blank" rel="noreferrer" style={{ color: "var(--blue)" }}>
                        website
                      </a>
                    </div>
                  )}
                </td>
                <td>{c.price_estimate}</td>
                <td>{c.fit_rating}</td>
                <td>
                  <select
                    className="ev-select"
                    value={c.status}
                    onChange={(e) => onStatusChange(c.id, e.target.value as CandidateStatus)}
                    disabled={busy === `status-${c.id}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="ev-btn ghost"
                    onClick={() => onDraft(c)}
                    disabled={busy === `draft-${c.id}` || !c.contact_email}
                    title={!c.contact_email ? "No contact email on file" : undefined}
                  >
                    {busy === `draft-${c.id}` ? "Drafting…" : "Draft email"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
