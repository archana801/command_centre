import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, getEventBundle, tabForCategory } from "@/lib/sheets";
import { candidateCategorySchema } from "@/lib/schemas";
import { researchCandidates } from "@/lib/anthropic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const body = await req.json().catch(() => ({}));
  const category = candidateCategorySchema.safeParse(body.category);
  if (!category.success) {
    return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
  }

  const { event } = await getEventBundle(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const result = await researchCandidates(event, category.data);
  const now = new Date().toISOString();
  const tab = tabForCategory(category.data);

  const created = [];
  for (const candidate of result.candidates) {
    const candidateId = generateId(category.data);
    await appendRow(tab, {
      id: candidateId,
      event_id: eventId,
      name: candidate.name,
      address: candidate.address,
      website: candidate.website,
      contact_email: candidate.contact_email,
      contact_phone: candidate.contact_phone,
      capacity_or_rooms: candidate.capacity_or_rooms,
      price_estimate: candidate.price_estimate,
      fit_rating: String(candidate.fit_rating),
      fit_rationale: candidate.fit_rationale,
      source_url: candidate.source_url,
      status: "candidate",
      created_at: now,
      updated_at: now,
    });
    created.push({ id: candidateId, ...candidate });
  }

  return NextResponse.json({ candidates: created });
}
