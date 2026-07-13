import { NextRequest, NextResponse } from "next/server";
import { getTripBundle, appendRow, updateRowById, generateId, TABS } from "@/lib/sheets";
import { tripLocalToUtcIso } from "@/lib/format";
import {
  getOrganizationUri,
  listScheduledEvents,
  listInvitees,
  buildCalendlySyncPatch,
  coachMatchesRoster,
} from "@/lib/calendly";
import { calendlySyncPatchSchema } from "@/lib/schemas";
import { notifySlack } from "@/lib/slack";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params;
  const { trip, photoshoots } = await getTripBundle(tripId);
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const minTime = tripLocalToUtcIso(trip.start_date, "00:00", trip.timezone);
  const maxTime = tripLocalToUtcIso(trip.end_date, "23:59", trip.timezone);

  const orgUri = await getOrganizationUri();
  const events = await listScheduledEvents(orgUri, minTime, maxTime);

  const existingByUri = new Map(
    photoshoots.filter((p) => p.calendly_event_uri).map((p) => [p.calendly_event_uri, p])
  );

  let created = 0;
  let updated = 0;
  let canceled = 0;
  const warnings: string[] = [];

  for (const event of events) {
    if (event.event_memberships.length !== 1) {
      warnings.push(
        `"${event.name}" has ${event.event_memberships.length} coaches assigned — expected exactly 1, using the first.`
      );
    }
    const coachRaw = event.event_memberships[0]?.user_name ?? "";
    if (coachRaw && !coachMatchesRoster(coachRaw)) {
      warnings.push(`Coach "${coachRaw}" on "${event.name}" isn't in the known roster — kept as-is.`);
    }

    const invitees = await listInvitees(event.uri);
    const invitee = invitees.find((i) => i.status === "active") ?? invitees[0] ?? null;

    const patch = calendlySyncPatchSchema.parse(
      buildCalendlySyncPatch(event, invitee, trip.timezone)
    );

    const existing = existingByUri.get(event.uri);
    if (existing) {
      await updateRowById(TABS.photoshoots, existing.id, patch);
      if (patch.status === "canceled" && existing.status !== "canceled") canceled++;
      else updated++;
    } else {
      const now = new Date().toISOString();
      await appendRow(TABS.photoshoots, {
        id: generateId("shoot"),
        trip_id: tripId,
        trip_event_id: "",
        calendly_event_uri: event.uri,
        row_type: "shoot",
        client_travelling_from: "",
        location: "",
        gym_candidate_id: "",
        paid: "FALSE",
        rota: "",
        notes: "",
        source: "calendly",
        created_at: now,
        updated_at: now,
        ...patch,
      });
      created++;
    }
  }

  if (created > 0 || updated > 0) {
    await notifySlack(
      `📅 Calendly sync for *${trip.name}*: ${created} new, ${updated} updated${canceled ? `, ${canceled} canceled` : ""}`
    );
  }

  return NextResponse.json({ created, updated, canceled, warnings });
}
