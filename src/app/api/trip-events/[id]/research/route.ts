import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, getTripEventBundle, tabForCategory } from "@/lib/sheets";
import { researchCandidates } from "@/lib/anthropic";
import { notifySlack } from "@/lib/slack";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripEventId } = await params;
  const { tripEvent } = await getTripEventBundle(tripEventId);
  if (!tripEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";

  const result = await researchCandidates(
    {
      name: tripEvent.name,
      city: tripEvent.city,
      start_date: tripEvent.start_date,
      end_date: tripEvent.end_date,
      capacity: tripEvent.capacity,
      budget: tripEvent.budget,
      requirements: tripEvent.requirements,
    },
    "venue",
    instructions || undefined
  );

  const now = new Date().toISOString();
  const tab = tabForCategory("venue");

  const created = [];
  for (const candidate of result.candidates) {
    const candidateId = generateId("venue");
    await appendRow(tab, {
      id: candidateId,
      trip_id: tripEvent.trip_id,
      trip_event_id: tripEventId,
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
      `🔍 Found ${created.length} new venue option${created.length === 1 ? "" : "s"} for *${tripEvent.name}*`
    );
  }

  return NextResponse.json({ candidates: created });
}
