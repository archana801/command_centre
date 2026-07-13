import Link from "next/link";
import { readTable, TABS } from "@/lib/sheets";
import { formatCountdown } from "@/lib/format";
import type { TripRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TripsOverviewPage() {
  const trips = await readTable<TripRecord>(TABS.trips);
  const active = trips.filter((t) => t.status !== "archived");

  return (
    <>
      <div className="ev-crumb">Trips</div>
      <div className="ev-hd">
        <h2>Active trips</h2>
        <Link href="/trips/new" className="ev-btn primary">
          + New trip
        </Link>
      </div>
      <p className="ev-sub">
        Each trip groups its events, accommodation, gyms, and client photoshoots in one
        place — research venues, send outreach, and track the whole visit.
      </p>

      {active.length === 0 ? (
        <div className="ev-card">
          <p className="ev-empty">
            No active trips yet. Create one to start planning events and photoshoots.
          </p>
        </div>
      ) : (
        <div className="ev-grid">
          {active.map((trip) => {
            const countdown = formatCountdown(trip.start_date);
            return (
              <Link key={trip.id} href={`/trips/${trip.id}`} className="ev-eventcard">
                <h4>{trip.name}</h4>
                <div className="city">
                  {trip.city} · {trip.start_date || "no date"} → {trip.end_date}
                </div>
                <div className="ev-countdown">
                  {countdown.value}
                  <small>{countdown.label}</small>
                </div>
                <div className="ev-badges">
                  <span className="ev-tag ev-t-contacted">{trip.status}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
