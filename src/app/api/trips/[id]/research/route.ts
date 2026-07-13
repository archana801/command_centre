import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, getTripBundle, tabForCategory } from "@/lib/sheets";
import { candidateCategorySchema } from "@/lib/schemas";
import { researchCandidates } from "@/lib/anthropic";
import { notifySlack } from "@/lib/slack";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await req.json().catch(() => ({}));
  const category = candidateCategorySchema.safeParse(body.category);
  if (!category.success || category.data === "venue") {
    return NextResponse.json(
      { error: "category must be 'accommodation' or 'gym' at the trip level" },
      { status: 400 }
    );
  }

  const { trip } = await getTripBundle(tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  const result = await researchCandidates(
    {
      name: trip.name,
      city: trip.city,
      start_date: trip.start_date,
      end_date: trip.end_date,
      capacity: trip.team_size,
      budget: trip.budget,
      requirements: trip.notes,
    },
    category.data,
    instructions || undefined
  );

  const now = new Date().toISOString();
  const tab = tabForCategory(category.data);

  const created = [];
  for (const candidate of result.candidates) {
    const candidateId = generateId(category.data);
    await appendRow(tab, {
      id: candidateId,
      trip_id: tripId,
      trip_event_id: "",
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

  if (created.length > 0) {
    await notifySlack(
      `🔍 Found ${created.length} new ${category.data} option${created.length === 1 ? "" : "s"} for *${trip.name}*`
    );
  }

  return NextResponse.json({ candidates: created });
}
