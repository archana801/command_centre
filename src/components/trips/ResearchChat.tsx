"use client";

import { useState } from "react";
import type { CandidateCategory } from "@/lib/types";

export type ChatMessage = { role: "user" | "assistant"; text: string };

const CHAT_PLACEHOLDER: Record<CandidateCategory, string> = {
  venue: "e.g. rooftop space, near downtown, under $8k…",
  accommodation: "e.g. walkable to the venue, at least 4 bedrooms…",
  gym: "e.g. open 24/7, has a photo-friendly space for shoots…",
};

export default function ResearchChat({
  category,
  messages,
  busy,
  onSend,
}: {
  category: CandidateCategory;
  messages: ChatMessage[];
  busy: boolean;
  onSend: (instructions: string) => void;
}) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    onSend(input);
    setInput("");
  }

  return (
    <div className="ev-card ev-chat">
      <h3>Ask Claude to research</h3>
      {(messages.length > 0 || busy) && (
        <div className="ev-chat-log">
          {messages.map((m, i) => (
            <div key={i} className={`ev-chat-msg ${m.role}`}>
              {m.text}
            </div>
          ))}
          {busy && <div className="ev-chat-msg assistant pending">Searching…</div>}
        </div>
      )}
      <form onSubmit={handleSubmit} className="ev-chat-form">
        <input
          className="ev-input"
          placeholder={CHAT_PLACEHOLDER[category]}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button type="submit" className="ev-btn primary" disabled={busy}>
          {busy ? "Researching…" : "Research"}
        </button>
      </form>
      <p className="ev-chat-hint">
        Leave blank for a general search based on the saved location, budget, and capacity.
      </p>
    </div>
  );
}
