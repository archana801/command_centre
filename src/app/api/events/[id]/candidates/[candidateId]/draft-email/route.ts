import { NextRequest, NextResponse } from "next/server";
import { getEventBundle } from "@/lib/sheets";
import { candidateCategorySchema } from "@/lib/schemas";
import { draftOutreachEmail } from "@/lib/anthropic";
import type { CandidateRecord } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const { id: eventId, candidateId } = await params;
  const category = candidateCategorySchema.safeParse(
    req.nextUrl.searchParams.get("category")
  );
  if (!category.success) {
    return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
  }

  const bundle = await getEventBundle(eventId);
  if (!bundle.event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const byCategory: Record<string, CandidateRecord[]> = {
    venue: bundle.venues,
    accommodation: bundle.accommodations,
    gym: bundle.gyms,
  };
  const candidate = byCategory[category.data].find((c) => c.id === candidateId);
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
    bundle.event,
    candidate.name,
    category.data,
    details
  );

  return NextResponse.json({
    draft,
    recipient: candidate.contact_email || "",
  });
}
