"use client";

import { useState } from "react";
import Link from "next/link";
import type { CandidateRecord, CandidateStatus, TripEventRecord } from "@/lib/types";
import CandidateTable, { EMPTY_CANDIDATE_FORM } from "./CandidateTable";
import ResearchChat, { type ChatMessage } from "./ResearchChat";
import EmailDraftModal, { type EmailDraft } from "./EmailDraftModal";

type Bundle = { tripEvent: TripEventRecord; venues: CandidateRecord[] };

export default function TripEventWorkspace({
  tripId,
  tripEventId,
  initialBundle,
}: {
  tripId: string;
  tripEventId: string;
  initialBundle: Bundle;
}) {
  const [bundle, setBundle] = useState(initialBundle);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_CANDIDATE_FORM);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [draftFor, setDraftFor] = useState<CandidateRecord | null>(null);
  const [draft, setDraft] = useState<EmailDraft | null>(null);

  async function reload() {
    const res = await fetch(`/api/trip-events/${tripEventId}`);
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

  async function handleResearch(instructions: string) {
    const trimmed = instructions.trim();
    if (trimmed) setChat((c) => [...c, { role: "user", text: trimmed }]);
    const data = await runAction("research-venue", async () => {
      const res = await fetch(`/api/trip-events/${tripEventId}/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: trimmed }),
      });
      if (!res.ok) throw new Error("Research request failed");
      const result = await res.json();
      await reload();
      return result;
    });
    if (!data) return;
    const count = data.candidates?.length ?? 0;
    setChat((c) => [
      ...c,
      {
        role: "assistant",
        text:
          count > 0
            ? `Found ${count} option${count === 1 ? "" : "s"} and added ${count === 1 ? "it" : "them"} to the table below.`
            : "Didn't find any matching options for that — try adjusting the request.",
      },
    ]);
  }

  async function handleAddCandidate() {
    await runAction("add-candidate", async () => {
      const res = await fetch(`/api/trip-events/${tripEventId}/candidates`, {
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

  async function handleStatusChange(candidateId: string, status: CandidateStatus) {
    await runAction(`status-${candidateId}`, async () => {
      const res = await fetch(`/api/trip-events/${tripEventId}/candidates/${candidateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Could not update status");
      await reload();
    });
  }

  async function openDraft(candidate: CandidateRecord) {
    setDraftFor(candidate);
    setDraft(null);
    await runAction(`draft-${candidate.id}`, async () => {
      const res = await fetch(
        `/api/trip-events/${tripEventId}/candidates/${candidate.id}/draft-email`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Could not draft email");
      const data = await res.json();
      setDraft({ subject: data.draft.subject, body: data.draft.body, to: data.recipient });
    });
  }

  async function handleSend() {
    if (!draftFor || !draft) return;
    await runAction(`send-${draftFor.id}`, async () => {
      const res = await fetch(
        `/api/trip-events/${tripEventId}/candidates/${draftFor.id}/send-email`,
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

  const { tripEvent, venues } = bundle;

  return (
    <>
      <div className="ev-crumb">
        <Link href={`/trips/${tripId}`} style={{ color: "inherit" }}>
          Trip
        </Link>{" "}
        / Event
      </div>
      <div className="ev-hd">
        <h2>{tripEvent.name}</h2>
      </div>
      <p className="ev-sub">
        {tripEvent.city} · {tripEvent.start_date} → {tripEvent.end_date} · capacity{" "}
        {tripEvent.capacity} · budget {tripEvent.budget}
      </p>

      {error && <div className="ev-error">{error}</div>}

      {tripEvent.requirements && (
        <div className="ev-card">
          <h3>Requirements</h3>
          <p style={{ fontSize: 12.5 }}>{tripEvent.requirements}</p>
        </div>
      )}

      <ResearchChat
        category="venue"
        messages={chat}
        busy={busy === "research-venue"}
        onSend={handleResearch}
      />
      <CandidateTable
        candidates={venues}
        busy={busy}
        showAddForm={showAddForm}
        addForm={addForm}
        setAddForm={setAddForm}
        onToggleAddForm={() => setShowAddForm((s) => !s)}
        onAddCandidate={handleAddCandidate}
        onStatusChange={handleStatusChange}
        onDraft={openDraft}
      />

      {draftFor && (
        <EmailDraftModal
          candidateName={draftFor.name}
          draft={draft}
          busy={busy === `send-${draftFor.id}`}
          onChange={setDraft}
          onCancel={() => setDraftFor(null)}
          onSend={handleSend}
        />
      )}
    </>
  );
}
