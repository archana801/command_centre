export type TripStatus =
  | "draft"
  | "researching"
  | "planning"
  | "confirmed"
  | "archived";

export type CandidateCategory = "venue" | "accommodation" | "gym";
export type CandidateScope = "trip" | "trip_event";

export type CandidateStatus =
  | "candidate"
  | "contacted"
  | "negotiating"
  | "booked"
  | "rejected";

export type OutreachStatus = "sent" | "replied" | "no_reply" | "bounced";

export type ShootType = "individual" | "couple" | "unknown";
export type PhotoshootRowType = "shoot" | "break" | "logistics";
export type PhotoshootStatus = "scheduled" | "completed" | "canceled" | "no_show";
export type PhotoshootSource = "calendly" | "manual";

export interface TripRecord {
  id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  timezone: string;
  team_size: string;
  budget: string;
  notes: string;
  status: TripStatus;
  created_at: string;
  created_by: string;
  archived_at: string;
}

export interface TripEventRecord {
  id: string;
  trip_id: string;
  name: string;
  city: string;
  start_date: string;
  end_date: string;
  capacity: string;
  budget: string;
  requirements: string;
  status: TripStatus;
  created_at: string;
  created_by: string;
  archived_at: string;
}

export interface CandidateRecord {
  id: string;
  trip_id: string;
  trip_event_id: string;
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
  trip_id: string;
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

export interface PhotoshootRecord {
  id: string;
  trip_id: string;
  trip_event_id: string;
  calendly_event_uri: string;
  row_type: PhotoshootRowType;
  client_name: string;
  client_email: string;
  client_travelling_from: string;
  coach: string;
  shoot_type: ShootType;
  shoot_date: string;
  start_time: string;
  end_time: string;
  location: string;
  gym_candidate_id: string;
  paid: string;
  rota: string;
  notes: string;
  status: PhotoshootStatus;
  source: PhotoshootSource;
  created_at: string;
  updated_at: string;
}

export const CANDIDATE_TABS: {
  category: CandidateCategory;
  tab: string;
  label: string;
  scope: CandidateScope;
}[] = [
  { category: "venue", tab: "Venues", label: "Venues", scope: "trip_event" },
  {
    category: "accommodation",
    tab: "Accommodations",
    label: "Accommodations",
    scope: "trip",
  },
  { category: "gym", tab: "Gyms", label: "Gyms", scope: "trip" },
];

export const COACHES = [
  "Diarmuid",
  "David",
  "Sejal",
  "Michael",
  "Archana",
  "Tanja",
  "Ajay",
  "Sam",
  "Kunal",
  "Max",
  "Paran",
  "Vicki",
  "Teia",
] as const;

export type Coach = (typeof COACHES)[number];
