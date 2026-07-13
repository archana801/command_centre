"use client";

import type { CandidateRecord, CandidateStatus } from "@/lib/types";

export const EMPTY_CANDIDATE_FORM = {
  name: "",
  address: "",
  website: "",
  contact_email: "",
  contact_phone: "",
  capacity_or_rooms: "",
  price_estimate: "",
};

const STATUS_OPTIONS: CandidateStatus[] = [
  "candidate",
  "contacted",
  "negotiating",
  "booked",
  "rejected",
];

export default function CandidateTable({
  candidates,
  busy,
  showAddForm,
  addForm,
  setAddForm,
  onToggleAddForm,
  onAddCandidate,
  onStatusChange,
  onDraft,
}: {
  candidates: CandidateRecord[];
  busy: string | null;
  showAddForm: boolean;
  addForm: typeof EMPTY_CANDIDATE_FORM;
  setAddForm: (f: typeof EMPTY_CANDIDATE_FORM) => void;
  onToggleAddForm: () => void;
  onAddCandidate: () => void;
  onStatusChange: (candidateId: string, status: CandidateStatus) => void;
  onDraft: (candidate: CandidateRecord) => void;
}) {
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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
