import { NextRequest, NextResponse } from "next/server";
import { appendRow, readTable, TABS, generateId } from "@/lib/sheets";
import { tripCreateSchema } from "@/lib/schemas";
import type { TripRecord } from "@/lib/types";

export async function GET() {
  const trips = await readTable<TripRecord>(TABS.trips);
  return NextResponse.json({ trips });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = tripCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = generateId("trip");
  await appendRow(TABS.trips, {
    id,
    ...parsed.data,
    status: "draft",
    created_at: now,
    created_by: "",
    archived_at: "",
  });

  return NextResponse.json({ id }, { status: 201 });
}
