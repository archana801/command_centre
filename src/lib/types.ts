export type EventStatus =
  | "draft"
  | "researching"
  | "planning"
  | "confirmed"
  | "archived";

export type CandidateCategory = "venue" | "accommodation" | "gym";

export type CandidateStatus =
  | "candidate"
  | "contacted"
  | "negotiating"
  | "booked"
  | "rejected";

export type OutreachStatus = "sent" | "replied" | "no_reply" | "bounced";

export interface EventRecord {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  capacity: string;
  budget: string;
  requirements: string;
  status: EventStatus;
  created_at: string;
  created_by: string;
  archived_at: string;
}

export interface CandidateRecord {
  id: string;
  event_id: string;
  name: string;
  address: string;
  website: string;
  contact_email: string;
  contact_phone: string;
  capacity_or_rooms: string;
  price_estimate: string;
  fit_rating: string;
  fit_rationale: string;
  source_url: string;
  status: CandidateStatus;
  created_at: string;
  updated_at: string;
}

export interface OutreachLogRecord {
  id: string;
  event_id: string;
  candidate_category: CandidateCategory;
  candidate_id: string;
  candidate_name: string;
  recipient_email: string;
  subject: string;
  gmail_message_id: string;
  gmail_thread_id: string;
  sent_at: string;
  sent_by: string;
  status: OutreachStatus;
  last_reply_summary: string;
  last_checked_at: string;
}

export const CANDIDATE_TABS: { category: CandidateCategory; tab: string; label: string }[] = [
  { category: "venue", tab: "Venues", label: "Venues" },
  { category: "accommodation", tab: "Accommodations", label: "Accommodations" },
  { category: "gym", tab: "Gyms", label: "Gyms" },
];
