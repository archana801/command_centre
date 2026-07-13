import { NextRequest, NextResponse } from "next/server";
import { readTable, TABS } from "@/lib/sheets";
import { verifySlackSignature } from "@/lib/slack";
import { formatCountdown } from "@/lib/format";
import type { TripRecord } from "@/lib/types";

export async function POST(req: NextRequest) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    return NextResponse.json({ error: "Slack integration not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  const valid = verifySlackSignature({ signingSecret, timestamp, signature, rawBody });
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const trips = await readTable<TripRecord>(TABS.trips);
  const active = trips.filter((t) => t.status !== "archived");

  if (active.length === 0) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "No active trips right now.",
    });
  }

  const lines = active.map((t) => {
    const countdown = formatCountdown(t.start_date);
    return `*${t.name}* — ${t.city} · ${countdown.value} ${countdown.label} · _${t.status}_`;
  });

  return NextResponse.json({
    response_type: "ephemeral",
    blocks: [
      { type: "section", text: { type: "mrkdwn", text: "*Active trips*" } },
      { type: "section", text: { type: "mrkdwn", text: lines.join("\n") } },
    ],
  });
}
