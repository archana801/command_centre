import { NextRequest, NextResponse } from "next/server";
import { getTripEventBundle } from "@/lib/sheets";
import { draftOutreachEmail } from "@/lib/anthropic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const { id: tripEventId, candidateId } = await params;
  const { tripEvent, venues } = await getTripEventBundle(tripEventId);
  if (!tripEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const candidate = venues.find((c) => c.id === candidateId);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const details = [
    candidate.address && `Address: ${candidate.address}`,
    candidate.website && `Website: ${candidate.website}`,
    candidate.price_estimate && `Estimated price: ${candidate.price_estimate}`,
  ]
    .filter(Boolean)
    .join(". ");

  const draft = await draftOutreachEmail(
    {
      name: tripEvent.name,
      city: tripEvent.city,
      start_date: tripEvent.start_date,
      end_date: tripEvent.end_date,
      capacity: tripEvent.capacity,
      budget: tripEvent.budget,
      requirements: tripEvent.requirements,
    },
    candidate.name,
    "venue",
    details
  );

  return NextResponse.json({
    draft,
    recipient: candidate.contact_email || "",
  });
}
