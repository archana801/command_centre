import { NextRequest, NextResponse } from "next/server";
import { updateRowById, TABS } from "@/lib/sheets";
import { photoshootPatchSchema } from "@/lib/schemas";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ photoshootId: string }> }
) {
  const { photoshootId } = await params;
  const body = await req.json();
  const parsed = photoshootPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) patch[key] = value;
  }

  await updateRowById(TABS.photoshoots, photoshootId, patch);
  return NextResponse.json({ ok: true });
}
