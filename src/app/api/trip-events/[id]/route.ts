import { NextRequest, NextResponse } from "next/server";
import { getTripEventBundle, updateRowById, TABS } from "@/lib/sheets";
import { tripStatusSchema } from "@/lib/schemas";
import { z } from "zod";

const patchSchema = z.object({
  status: tripStatusSchema.optional(),
  archived_at: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bundle = await getTripEventBundle(id);
  if (!bundle.tripEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(bundle);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, string> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.status === "archived") patch.archived_at = new Date().toISOString();
  if (parsed.data.archived_at) patch.archived_at = parsed.data.archived_at;

  await updateRowById(TABS.events, id, patch);
  return NextResponse.json({ ok: true });
}
