import { COACHES } from "./types";
import type { ShootType, PhotoshootStatus } from "./types";
import type { CalendlySyncPatch } from "./schemas";

const CALENDLY_BASE = "https://api.calendly.com";

function getToken(): string {
  const token = process.env.CALENDLY_API_TOKEN;
  if (!token) throw new Error("Missing CALENDLY_API_TOKEN env var");
  return token;
}

async function calendlyFetch(
  path: string,
  params?: Record<string, string>
): Promise<any> {
  const url = new URL(path.startsWith("http") ? path : `${CALENDLY_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  }
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    throw new Error(`Calendly API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

let cachedOrgUri: string | null = null;

export async function getOrganizationUri(): Promise<string> {
  if (cachedOrgUri) return cachedOrgUri;
  const data = await calendlyFetch("/users/me");
  cachedOrgUri = data.resource.current_organization as string;
  return cachedOrgUri;
}

export interface CalendlyEventMembership {
  user: string;
  user_email: string;
  user_name: string;
}

export interface CalendlyScheduledEvent {
  uri: string;
  name: string;
  status: string;
  start_time: string;
  end_time: string;
  event_type: string;
  event_memberships: CalendlyEventMembership[];
}

/** Lists scheduled events across the whole org in a time range, following cursor pagination. */
export async function listScheduledEvents(
  orgUri: string,
  minTimeUtc: string,
  maxTimeUtc: string
): Promise<CalendlyScheduledEvent[]> {
  const events: CalendlyScheduledEvent[] = [];
  let nextPageUrl: string | null = null;
  let isFirstPage = true;

  while (isFirstPage || nextPageUrl) {
    let data: any;
    if (nextPageUrl) {
      data = await calendlyFetch(nextPageUrl);
    } else {
      data = await calendlyFetch("/scheduled_events", {
        organization: orgUri,
        min_start_time: minTimeUtc,
        max_start_time: maxTimeUtc,
        status: "active",
        count: "100",
      });
    }
    events.push(...(data.collection as CalendlyScheduledEvent[]));
    nextPageUrl = data.pagination?.next_page ?? null;
    isFirstPage = false;
  }

  return events;
}

export interface CalendlyQuestionAnswer {
  question: string;
  answer: string;
  position: number;
}

export interface CalendlyInvitee {
  uri: string;
  email: string;
  name: string;
  status: string;
  questions_and_answers: CalendlyQuestionAnswer[];
}

/** Fetches invitees for one scheduled event. Must NOT include an `organization` param — Calendly 400s if it's present here. */
export async function listInvitees(eventUri: string): Promise<CalendlyInvitee[]> {
  const eventUuid = eventUri.split("/").pop();
  const data = await calendlyFetch(`/scheduled_events/${eventUuid}/invitees`);
  return data.collection as CalendlyInvitee[];
}

export function matchCoach(rawName: string): string {
  const trimmed = rawName.trim();
  const match = COACHES.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  return match ?? trimmed;
}

export function coachMatchesRoster(rawName: string): boolean {
  const trimmed = rawName.trim().toLowerCase();
  return COACHES.some((c) => c.toLowerCase() === trimmed);
}

const SHOOT_TYPE_QUESTION_PATTERN = /shoot type|individual or couple|solo or couple/i;

export function extractShootType(qna: CalendlyQuestionAnswer[]): ShootType {
  const match = qna.find((q) => SHOOT_TYPE_QUESTION_PATTERN.test(q.question));
  if (!match) return "unknown";
  const answer = match.answer.toLowerCase();
  if (answer.includes("couple")) return "couple";
  if (answer.includes("individual") || answer.includes("solo")) return "individual";
  return "unknown";
}

function toTripLocalDate(isoUtc: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(isoUtc));
}

/**
 * Builds ONLY the fields a Calendly sync is allowed to write (see
 * calendlySyncPatchSchema) — deliberately excludes location, gym_candidate_id,
 * paid, rota, notes, client_travelling_from, and trip_event_id so that
 * re-syncing an already-imported booking can never clobber manual edits.
 */
export function buildCalendlySyncPatch(
  event: CalendlyScheduledEvent,
  invitee: CalendlyInvitee | null,
  tripTimezone: string
): CalendlySyncPatch {
  const coachRaw = event.event_memberships[0]?.user_name ?? "";
  const status: PhotoshootStatus = event.status === "canceled" ? "canceled" : "scheduled";

  return {
    client_name: invitee?.name ?? "",
    client_email: invitee?.email ?? "",
    coach: matchCoach(coachRaw),
    shoot_type: invitee ? extractShootType(invitee.questions_and_answers) : "unknown",
    shoot_date: toTripLocalDate(event.start_time, tripTimezone),
    start_time: event.start_time,
    end_time: event.end_time,
    status,
  };
}
