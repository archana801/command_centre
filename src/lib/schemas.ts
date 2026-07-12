import { z } from "zod";

export const eventCreateSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  capacity: z.string().min(1),
  budget: z.string().min(1),
  requirements: z.string().default(""),
});
export type EventCreateInput = z.infer<typeof eventCreateSchema>;

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
