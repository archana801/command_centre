import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, TABS } from "@/lib/sheets";
import { tripEventCreateSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const body = await req.json();
  const parsed = tripEventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = generateId("tevent");
  await appendRow(TABS.events, {
    id,
    trip_id: tripId,
    ...parsed.data,
    status: "draft",
    created_at: now,
    created_by: "",
    archived_at: "",
  });

  return NextResponse.json({ id }, { status: 201 });
}
