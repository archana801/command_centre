import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, getTripEventBundle, tabForCategory } from "@/lib/sheets";
import { candidateInputSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripEventId } = await params;
  const { tripEvent } = await getTripEventBundle(tripEventId);
  if (!tripEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = candidateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const candidateId = generateId("venue");
  await appendRow(tabForCategory("venue"), {
    id: candidateId,
    trip_id: tripEvent.trip_id,
    trip_event_id: tripEventId,
    ...parsed.data,
    status: "candidate",
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ id: candidateId }, { status: 201 });
}
