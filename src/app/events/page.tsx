import Link from "next/link";
import { readTable, TABS } from "@/lib/sheets";
import { formatCountdown } from "@/lib/format";
import type { EventRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EventsOverviewPage() {
  const events = await readTable<EventRecord>(TABS.events);
  const active = events.filter((e) => e.status !== "archived");

  return (
    <>
      <div className="ev-crumb">Events</div>
      <div className="ev-hd">
        <h2>Active events</h2>
        <Link href="/events/new" className="ev-btn primary">
          + New event
        </Link>
      </div>
      <p className="ev-sub">
        Research venues, accommodation, and gyms for upcoming events, send outreach,
        and track where each booking stands.
      </p>

      {active.length === 0 ? (
        <div className="ev-card">
          <p className="ev-empty">
            No active events yet. Create one to start researching venues, accommodation, and gyms.
          </p>
        </div>
      ) : (
        <div className="ev-grid">
          {active.map((event) => {
            const countdown = formatCountdown(event.start_date);
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="ev-eventcard">
                <h4>{event.name}</h4>
                <div className="city">
                  {event.city} · {event.start_date || "no date"}
                </div>
                <div className="ev-countdown">
                  {countdown.value}
                  <small>{countdown.label}</small>
                </div>
                <div className="ev-badges">
                  <span className="ev-tag ev-t-contacted">{event.status}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
