import { NextRequest, NextResponse } from "next/server";
import { appendRow, readTable, TABS, generateId } from "@/lib/sheets";
import { eventCreateSchema } from "@/lib/schemas";
import type { EventRecord } from "@/lib/types";

export async function GET() {
  const events = await readTable<EventRecord>(TABS.events);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const id = generateId("event");
  await appendRow(TABS.events, {
    id,
    ...parsed.data,
    status: "draft",
    created_at: now,
    created_by: "",
    archived_at: "",
  });

  return NextResponse.json({ id }, { status: 201 });
}
