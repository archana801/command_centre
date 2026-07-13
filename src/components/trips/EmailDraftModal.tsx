"use client";

export interface EmailDraft {
  subject: string;
  body: string;
  to: string;
}

export default function EmailDraftModal({
  candidateName,
  draft,
  busy,
  onChange,
  onCancel,
  onSend,
}: {
  candidateName: string;
  draft: EmailDraft | null;
  busy: boolean;
  onChange: (draft: EmailDraft) => void;
  onCancel: () => void;
  onSend: () => void;
}) {
  return (
    <div className="ev-modal-backdrop" onClick={onCancel}>
      <div className="ev-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Email to {candidateName}</h3>
        {!draft ? (
          <p className="ev-empty">Drafting…</p>
        ) : (
          <>
            <label className="ev-label">To</label>
            <input
              className="ev-input"
              value={draft.to}
              onChange={(e) => onChange({ ...draft, to: e.target.value })}
            />
            <label className="ev-label">Subject</label>
            <input
              className="ev-input"
              value={draft.subject}
              onChange={(e) => onChange({ ...draft, subject: e.target.value })}
            />
            <label className="ev-label">Body</label>
            <textarea
              className="ev-textarea"
              style={{ minHeight: 180 }}
              value={draft.body}
              onChange={(e) => onChange({ ...draft, body: e.target.value })}
            />
            <div className="ev-modal-actions">
              <button className="ev-btn ghost" onClick={onCancel}>
                Cancel
              </button>
              <button className="ev-btn primary" onClick={onSend} disabled={busy || !draft.to}>
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
