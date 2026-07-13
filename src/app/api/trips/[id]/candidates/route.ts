import { NextRequest, NextResponse } from "next/server";
import { appendRow, generateId, tabForCategory } from "@/lib/sheets";
import { candidateCategorySchema, candidateInputSchema } from "@/lib/schemas";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const category = candidateCategorySchema.safeParse(
    req.nextUrl.searchParams.get("category")
  );
  if (!category.success || category.data === "venue") {
    return NextResponse.json(
      { error: "category must be 'accommodation' or 'gym' at the trip level" },
      { status: 400 }
    );
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
    trip_id: tripId,
    trip_event_id: "",
    ...parsed.data,
    status: "candidate",
    created_at: now,
    updated_at: now,
  });

  return NextResponse.json({ id: candidateId }, { status: 201 });
}
