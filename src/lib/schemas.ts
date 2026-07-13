import { z } from "zod";

export const tripStatusSchema = z.enum([
  "draft",
  "researching",
  "planning",
  "confirmed",
  "archived",
]);

export const tripCreateSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  timezone: z.string().min(1),
  team_size: z.string().default(""),
  budget: z.string().default(""),
  notes: z.string().default(""),
});
export type TripCreateInput = z.infer<typeof tripCreateSchema>;

export const tripEventCreateSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  capacity: z.string().min(1),
  budget: z.string().min(1),
  requirements: z.string().default(""),
});
export type TripEventCreateInput = z.infer<typeof tripEventCreateSchema>;

export const candidateCategorySchema = z.enum(["venue", "accommodation", "gym"]);

export const candidateInputSchema = z.object({
  name: z.string().min(1),
  address: z.string().default(""),
  website: z.string().default(""),
  contact_email: z.string().default(""),
  contact_phone: z.string().default(""),
  capacity_or_rooms: z.string().default(""),
  price_estimate: z.string().default(""),
  fit_rating: z.string().default(""),
  fit_rationale: z.string().default(""),
  source_url: z.string().default(""),
});
export type CandidateInput = z.infer<typeof candidateInputSchema>;

export const candidateStatusSchema = z.enum([
  "candidate",
  "contacted",
  "negotiating",
  "booked",
  "rejected",
]);

// --- Photoshoots ---

export const shootTypeSchema = z.enum(["individual", "couple", "unknown"]);
export const photoshootRowTypeSchema = z.enum(["shoot", "break", "logistics"]);
export const photoshootStatusSchema = z.enum([
  "scheduled",
  "completed",
  "canceled",
  "no_show",
]);

export const photoshootInputSchema = z.object({
  trip_event_id: z.string().default(""),
  row_type: photoshootRowTypeSchema.default("shoot"),
  client_name: z.string().default(""),
  client_email: z.string().default(""),
  client_travelling_from: z.string().default(""),
  coach: z.string().default(""),
  shoot_type: shootTypeSchema.default("unknown"),
  shoot_date: z.string().min(1),
  start_time: z.string().default(""),
  end_time: z.string().default(""),
  location: z.string().default(""),
  gym_candidate_id: z.string().default(""),
  paid: z.string().default("FALSE"),
  rota: z.string().default(""),
  notes: z.string().default(""),
});
export type PhotoshootInput = z.infer<typeof photoshootInputSchema>;

export const photoshootPatchSchema = photoshootInputSchema.partial().extend({
  status: photoshootStatusSchema.optional(),
});

/**
 * The only fields a Calendly sync is allowed to write. Deliberately excludes
 * location/gym_candidate_id/paid/rota/notes/client_travelling_from/trip_event_id
 * so a re-sync can never clobber manual edits.
 */
export const calendlySyncPatchSchema = z.object({
  client_name: z.string(),
  client_email: z.string(),
  coach: z.string(),
  shoot_type: shootTypeSchema,
  shoot_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  status: photoshootStatusSchema,
});
export type CalendlySyncPatch = z.infer<typeof calendlySyncPatchSchema>;

// --- Claude structured-output schemas ---

export const researchCandidateSchema = z.object({
  name: z.string(),
  address: z.string(),
  website: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  capacity_or_rooms: z.string(),
  price_estimate: z.string(),
  fit_rating: z.number().min(1).max(10),
  fit_rationale: z.string(),
  source_url: z.string(),
});

export const researchResultSchema = z.object({
  candidates: z.array(researchCandidateSchema),
});
export type ResearchResult = z.infer<typeof researchResultSchema>;

export const emailDraftSchema = z.object({
  subject: z.string(),
  body: z.string(),
});
export type EmailDraft = z.infer<typeof emailDraftSchema>;

export const replySummarySchema = z.object({
  summary: z.string(),
  suggested_status: candidateStatusSchema,
  confidence: z.enum(["low", "medium", "high"]),
});
export type ReplySummary = z.infer<typeof replySummarySchema>;
