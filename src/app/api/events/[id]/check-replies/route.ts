import { NextRequest, NextResponse } from "next/server";
import { getEventBundle, updateRowById, TABS } from "@/lib/sheets";
import { getThreadReplies } from "@/lib/gmail";
import { summarizeReply } from "@/lib/anthropic";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const { event, outreachLog } = await getEventBundle(eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const results = [];
  const now = new Date().toISOString();

  for (const entry of outreachLog) {
    if (entry.status !== "sent" || !entry.gmail_thread_id) continue;

    const replies = await getThreadReplies(entry.gmail_thread_id);
    if (replies.length === 0) {
      await updateRowById(TABS.outreachLog, entry.id, { last_checked_at: now });
      continue;
    }

    const summary = await summarizeReply(replies.join("\n\n---\n\n"));
    await updateRowById(TABS.outreachLog, entry.id, {
      status: "replied",
      last_reply_summary: summary.summary,
      last_checked_at: now,
    });

    results.push({
      outreachId: entry.id,
      candidateId: entry.candidate_id,
      candidateCategory: entry.candidate_category,
      candidateName: entry.candidate_name,
      ...summary,
    });
  }

  return NextResponse.json({ updates: results });
}
