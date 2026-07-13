import { NextRequest, NextResponse } from "next/server";
import {
  appendRow,
  generateId,
  getTripEventBundle,
  tabForCategory,
  TABS,
  updateRowById,
} from "@/lib/sheets";
import { sendEmail } from "@/lib/gmail";
import { z } from "zod";

const sendSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  candidateName: z.string().default(""),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; candidateId: string }> }
) {
  const { id: tripEventId, candidateId } = await params;
  const { tripEvent } = await getTripEventBundle(tripEventId);
  if (!tripEvent) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { to, subject, body: emailBody, candidateName } = parsed.data;
  const { messageId, threadId } = await sendEmail({ to, subject, body: emailBody });

  const now = new Date().toISOString();
  await appendRow(TABS.outreachLog, {
    id: generateId("outreach"),
    trip_id: tripEvent.trip_id,
    candidate_category: "venue",
    candidate_id: candidateId,
    candidate_name: candidateName,
    recipient_email: to,
    subject,
    gmail_message_id: messageId,
    gmail_thread_id: threadId,
    sent_at: now,
    sent_by: "",
    status: "sent",
    last_reply_summary: "",
    last_checked_at: "",
  });

  await updateRowById(tabForCategory("venue"), candidateId, {
    status: "contacted",
    updated_at: now,
  });

  return NextResponse.json({ ok: true, threadId });
}
