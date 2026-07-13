import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  researchResultSchema,
  emailDraftSchema,
  replySummarySchema,
  type ResearchResult,
  type EmailDraft,
  type ReplySummary,
} from "./schemas";
import type { CandidateCategory, EventRecord } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

let cachedClient: Anthropic | null = null;
function getClient(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

const CATEGORY_LABEL: Record<CandidateCategory, string> = {
  venue: "event venues",
  accommodation: "Airbnb-style group accommodation (a house/rental, not a hotel)",
  gym: "gyms suitable for client body-transformation photo/video shoots",
};

function extractText(content: Anthropic.ContentBlock[]): string {
  const block = content.find(
    (b): b is Anthropic.TextBlock => b.type === "text"
  );
  if (!block) throw new Error("No text content in model response");
  return block.text;
}

export async function researchCandidates(
  event: EventRecord,
  category: CandidateCategory,
  instructions?: string
): Promise<ResearchResult> {
  const client = getClient();
  const prompt = `Find ${CATEGORY_LABEL[category]} in ${event.city} for this event:
- Event: ${event.name}
- Dates: ${event.start_date} to ${event.end_date}
- Capacity needed: ${event.capacity}
- Budget: ${event.budget}
- Additional requirements: ${event.requirements || "none"}
${instructions ? `\nThe coordinator also specifically asked: ${instructions}` : ""}

Search the web for real, currently-bookable options. Return each candidate with a fit_rating (1-10) scoring how well it matches the budget, capacity, and location, plus a one or two sentence fit_rationale.`;

  let messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  for (let i = 0; i < 5; i++) {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      output_config: { format: zodOutputFormat(researchResultSchema) },
      messages,
    });
    const response = await stream.finalMessage();

    if (response.stop_reason === "refusal") {
      throw new Error("Research request was declined by the model");
    }
    if (response.stop_reason === "pause_turn") {
      messages = [...messages, { role: "assistant", content: response.content }];
      continue;
    }
    return researchResultSchema.parse(JSON.parse(extractText(response.content)));
  }
  throw new Error("Research call did not complete after multiple continuations");
}

export async function draftOutreachEmail(
  event: EventRecord,
  candidateName: string,
  category: CandidateCategory,
  details: string
): Promise<EmailDraft> {
  const client = getClient();
  const prompt = `Draft a short, friendly outreach email to "${candidateName}" (a ${CATEGORY_LABEL[category]}) about hosting our event "${event.name}" in ${event.city} from ${event.start_date} to ${event.end_date}, for ${event.capacity} people, budget ${event.budget}.
Known details about this candidate: ${details || "none"}
Ask about availability, pricing, and whether they can accommodate our requirements: ${event.requirements || "none"}.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    output_config: { format: zodOutputFormat(emailDraftSchema) },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Email drafting was declined by the model");
  }
  return emailDraftSchema.parse(JSON.parse(extractText(response.content)));
}

export async function summarizeReply(threadText: string): Promise<ReplySummary> {
  const client = getClient();
  const prompt = `Here is an email thread with a venue/accommodation/gym contact:

${threadText}

Summarize their reply in 1-2 sentences, and suggest a status update (candidate, contacted, negotiating, booked, or rejected) with your confidence.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    output_config: { format: zodOutputFormat(replySummarySchema) },
    messages: [{ role: "user", content: prompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error("Reply summarization was declined by the model");
  }
  return replySummarySchema.parse(JSON.parse(extractText(response.content)));
}
