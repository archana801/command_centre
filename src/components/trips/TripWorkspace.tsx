"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  CandidateRecord,
  CandidateStatus,
  OutreachLogRecord,
  PhotoshootRecord,
  TripEventRecord,
  TripRecord,
} from "@/lib/types";
import { formatCountdown } from "@/lib/format";
import CandidateTable, { EMPTY_CANDIDATE_FORM } from "./CandidateTable";
import ResearchChat, { type ChatMessage } from "./ResearchChat";
import EmailDraftModal, { type EmailDraft } from "./EmailDraftModal";
import PhotoshootAgenda from "./PhotoshootAgenda";

type Bundle = {
  trip: TripRecord;
  events: TripEventRecord[];
  accommodations: CandidateRecord[];
  gyms: CandidateRecord[];
  photoshoots: PhotoshootRecord[];
  outreachLog: OutreachLogRecord[];
};

type TripCandidateCategory = "accommodation" | "gym";
type Tab = "overview" | "events" | "accommodations" | "gyms" | "photoshoots";

const EMPTY_EVENT_FORM = {
  name: "",
  city: "",
  start_date: "",
  end_date: "",
  capacity: "",
  budget: "",
  requirements: "",
};

export default function TripWorkspace({
  tripId,
  initialBundle,
}: {
  tripId: string;
  initialBundle: Bundle;
}) {
  const router = useRouter();
  const [bundle, setBundle] = useState(initialBundle);
  const [tab, setTab] = useState<Tab>("overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_CANDIDATE_FORM);
  const [chats, setChats] = useState<Record<TripCandidateCategory, ChatMessage[]>>({
    accommodation: [],
    gym: [],
  });
  const [draftFor, setDraftFor] = useState<{ candidate: CandidateRecord; category: TripCandidateCategory } | null>(
    null
  );
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [replyUpdates, setReplyUpdates] = useState<
    { candidateName: string; summary: string; suggested_status: string }[] | null
  >(null);
  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const [newEventForm, setNewEventForm] = useState(EMPTY_EVENT_FORM);

  async function reload() {
    const res = await fetch(`/api/trips/${tripId}`);
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

  function candidatesFor(category: TripCandidateCategory): CandidateRecord[] {
    return category === "accommodation" ? bundle.accommodations : bundle.gyms;
  }

  async function handleResearch(category: TripCandidateCategory, instructions: string) {
    const trimmed = instructions.trim();
    if (trimmed) {
      setChats((c) => ({ ...c, [category]: [...c[category], { role: "user", text: trimmed }] }));
    }
    const data = await runAction(`research-${category}`, async () => {
      const res = await fetch(`/api/trips/${tripId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, instructions: trimmed }),
      });
      if (!res.ok) throw new Error("Research request failed");
      const result = await res.json();
      await reload();
      return result;
    });
    if (!data) return;
    const count = data.candidates?.length ?? 0;
    setChats((c) => ({
      ...c,
      [category]: [
        ...c[category],
        {
          role: "assistant",
          text:
            count > 0
              ? `Found ${count} option${count === 1 ? "" : "s"} and added ${count === 1 ? "it" : "them"} to the table below.`
              : "Didn't find any matching options for that — try adjusting the request.",
        },
      ],
    }));
  }

  async function handleAddCandidate(category: TripCandidateCategory) {
    await runAction("add-candidate", async () => {
      const res = await fetch(`/api/trips/${tripId}/candidates?category=${category}`, {
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
    category: TripCandidateCategory,
    candidateId: string,
    status: CandidateStatus
  ) {
    await runAction(`status-${candidateId}`, async () => {
      const res = await fetch(`/api/trips/${tripId}/candidates/${candidateId}?category=${category}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status");
      await reload();
    });
  }

  async function openDraft(category: TripCandidateCategory, candidate: CandidateRecord) {
    setDraftFor({ candidate, category });
    setDraft(null);
    await runAction(`draft-${candidate.id}`, async () => {
      const res = await fetch(
        `/api/trips/${tripId}/candidates/${candidate.id}/draft-email?category=${category}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Could not draft email");
      const data = await res.json();
      setDraft({ subject: data.draft.subject, body: data.draft.body, to: data.recipient });
    });
  }

  async function handleSend() {
    if (!draftFor || !draft) return;
    await runAction(`send-${draftFor.candidate.id}`, async () => {
      const res = await fetch(
        `/api/trips/${tripId}/candidates/${draftFor.candidate.id}/send-email?category=${draftFor.category}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: draft.to,
            subject: draft.subject,
            body: draft.body,
            candidateName: draftFor.candidate.name,
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
      const res = await fetch(`/api/trips/${tripId}/check-replies`, { method: "POST" });
      if (!res.ok) throw new Error("Could not check replies");
      const data = await res.json();
      setReplyUpdates(data.updates);
      await reload();
    });
  }

  async function handleArchive() {
    if (!confirm("Archive this trip? It will be removed from the active list.")) return;
    await runAction("archive", async () => {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
      if (!res.ok) throw new Error("Could not archive trip");
      router.push("/trips");
    });
  }

  async function handleCreateEvent() {
    await runAction("add-event", async () => {
      const res = await fetch(`/api/trips/${tripId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEventForm),
      });
      if (!res.ok) throw new Error("Could not create event");
      setNewEventForm(EMPTY_EVENT_FORM);
      setShowNewEventForm(false);
      await reload();
    });
  }

  const { trip } = bundle;
  const countdown = formatCountdown(trip.start_date);

  return (
    <>
      <div className="ev-crumb">Trips</div>
      <div className="ev-hd">
        <h2>{trip.name}</h2>
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
        {trip.city} · {trip.start_date} → {trip.end_date} · team {trip.team_size || "—"} · budget{" "}
        {trip.budget || "—"}
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
        <button className={`ev-tab ${tab === "events" ? "on" : ""}`} onClick={() => setTab("events")}>
          Events ({bundle.events.length})
        </button>
        <button
          className={`ev-tab ${tab === "accommodations" ? "on" : ""}`}
          onClick={() => setTab("accommodations")}
        >
          Accommodations ({bundle.accommodations.length})
        </button>
        <button className={`ev-tab ${tab === "gyms" ? "on" : ""}`} onClick={() => setTab("gyms")}>
          Gyms ({bundle.gyms.length})
        </button>
        <button
          className={`ev-tab ${tab === "photoshoots" ? "on" : ""}`}
          onClick={() => setTab("photoshoots")}
        >
          Photoshoots ({bundle.photoshoots.length})
        </button>
      </div>

      {tab === "overview" && (
        <div className="ev-card">
          <h3>Notes</h3>
          <p style={{ fontSize: 12.5 }}>{trip.notes || "None specified."}</p>
        </div>
      )}

      {tab === "events" && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <button className="ev-btn primary" onClick={() => setShowNewEventForm((s) => !s)}>
              {showNewEventForm ? "Cancel" : "+ New event"}
            </button>
          </div>

          {showNewEventForm && (
            <div className="ev-card">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {(
                  [
                    ["name", "Name"],
                    ["city", "City"],
                    ["start_date", "Start date"],
                    ["end_date", "End date"],
                    ["capacity", "Capacity"],
                    ["budget", "Budget"],
                    ["requirements", "Requirements"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key} style={{ flex: "1 1 200px" }}>
                    <label className="ev-label">{label}</label>
                    <input
                      type={key === "start_date" || key === "end_date" ? "date" : "text"}
                      className="ev-input"
                      value={newEventForm[key]}
                      onChange={(e) => setNewEventForm({ ...newEventForm, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="ev-modal-actions" style={{ justifyContent: "flex-start" }}>
                <button
                  className="ev-btn primary"
                  onClick={handleCreateEvent}
                  disabled={busy === "add-event" || !newEventForm.name}
                >
                  {busy === "add-event" ? "Creating…" : "Create event"}
                </button>
              </div>
            </div>
          )}

          {bundle.events.length === 0 ? (
            <div className="ev-empty">No events yet for this trip.</div>
          ) : (
            <table className="ev-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dates</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bundle.events.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <strong>{e.name}</strong>
                    </td>
                    <td>
                      {e.start_date} → {e.end_date}
                    </td>
                    <td>{e.capacity}</td>
                    <td>
                      <span className="ev-tag ev-t-contacted">{e.status}</span>
                    </td>
                    <td>
                      <Link className="ev-btn ghost" href={`/trips/${tripId}/events/${e.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {(tab === "accommodations" || tab === "gyms") &&
        (() => {
          const category: TripCandidateCategory = tab === "accommodations" ? "accommodation" : "gym";
          return (
            <>
              <ResearchChat
                key={category}
                category={category}
                messages={chats[category]}
                busy={busy === `research-${category}`}
                onSend={(instructions) => handleResearch(category, instructions)}
              />
              <CandidateTable
                candidates={candidatesFor(category)}
                busy={busy}
                showAddForm={showAddForm}
                addForm={addForm}
                setAddForm={setAddForm}
                onToggleAddForm={() => setShowAddForm((s) => !s)}
                onAddCandidate={() => handleAddCandidate(category)}
                onStatusChange={(id, status) => handleStatusChange(category, id, status)}
                onDraft={(c) => openDraft(category, c)}
              />
            </>
          );
        })()}

      {tab === "photoshoots" && (
        <PhotoshootAgenda
          tripId={tripId}
          trip={trip}
          photoshoots={bundle.photoshoots}
          gyms={bundle.gyms}
          events={bundle.events}
          onReload={reload}
        />
      )}

      {draftFor && (
        <EmailDraftModal
          candidateName={draftFor.candidate.name}
          draft={draft}
          busy={busy === `send-${draftFor.candidate.id}`}
          onChange={setDraft}
          onCancel={() => setDraftFor(null)}
          onSend={handleSend}
        />
      )}
    </>
  );
}
