import { NextRequest, NextResponse } from "next/server";
import { getTripBundle, updateRowById, TABS } from "@/lib/sheets";
import { getThreadReplies } from "@/lib/gmail";
import { summarizeReply } from "@/lib/anthropic";
import { notifySlack } from "@/lib/slack";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const { trip, outreachLog } = await getTripBundle(tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
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

    await notifySlack(
      `📩 *${entry.candidate_name}* replied about *${trip.name}*: ${summary.summary}`
    );
  }

  return NextResponse.json({ updates: results });
}
