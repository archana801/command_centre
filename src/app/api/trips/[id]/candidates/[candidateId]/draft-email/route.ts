import { NextRequest, NextResponse } from "next/server";
import { getTripBundle } from "@/lib/sheets";
import { candidateCategorySchema } from "@/lib/schemas";
import { draftOutreachEmail } from "@/lib/anthropic";
import type { CandidateRecord } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const { id: tripId, candidateId } = await params;
  const category = candidateCategorySchema.safeParse(
    req.nextUrl.searchParams.get("category")
  );
  if (!category.success || category.data === "venue") {
    return NextResponse.json(
      { error: "category must be 'accommodation' or 'gym' at the trip level" },
      { status: 400 }
    );
  }

  const bundle = await getTripBundle(tripId);
  if (!bundle.trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const byCategory: Record<string, CandidateRecord[]> = {
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
    {
      name: bundle.trip.name,
      city: bundle.trip.city,
      start_date: bundle.trip.start_date,
      end_date: bundle.trip.end_date,
      capacity: bundle.trip.team_size,
      budget: bundle.trip.budget,
      requirements: bundle.trip.notes,
    },
    candidate.name,
    category.data,
    details
  );

  return NextResponse.json({
    draft,
    recipient: candidate.contact_email || "",
  });
}
