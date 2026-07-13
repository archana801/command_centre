import { NextRequest, NextResponse } from "next/server";
import { updateRowById, tabForCategory } from "@/lib/sheets";
import { candidateInputSchema, candidateStatusSchema } from "@/lib/schemas";

const patchSchema = candidateInputSchema.partial().extend({
  status: candidateStatusSchema.optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  const { candidateId } = await params;
  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, string> = { updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) patch[key] = value;
  }

  await updateRowById(tabForCategory("venue"), candidateId, patch);
  return NextResponse.json({ ok: true });
}
