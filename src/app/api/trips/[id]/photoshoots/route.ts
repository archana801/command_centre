import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, TABS } from "@/lib/sheets";
import { photoshootInputSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await req.json();
  const parsed = photoshootInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = generateId("shoot");
  await appendRow(TABS.photoshoots, {
    id,
    trip_id: tripId,
    calendly_event_uri: "",
    ...parsed.data,
    status: "scheduled",
    source: "manual",
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ id }, { status: 201 });
}
