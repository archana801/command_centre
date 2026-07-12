import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, tabForCategory } from "@/lib/sheets";
import { candidateCategorySchema, candidateInputSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const category = candidateCategorySchema.safeParse(
    req.nextUrl.searchParams.get("category")
  );
  if (!category.success) {
    return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
  }

  const body = await req.json();
  const parsed = candidateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  const candidateId = generateId(category.data);
  await appendRow(tabForCategory(category.data), {
    id: candidateId,
    event_id: eventId,
    ...parsed.data,
    status: "candidate",
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ id: candidateId }, { status: 201 });
}
