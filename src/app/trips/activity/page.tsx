import { readTable, TABS } from "@/lib/sheets";
import type { TripRecord, OutreachLogRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  const [trips, outreach] = await Promise.all([
    readTable<TripRecord>(TABS.trips),
    readTable<OutreachLogRecord>(TABS.outreachLog),
  ]);

  const tripNameById = new Map(trips.map((t) => [t.id, t.name]));
  const rows = [...outreach].sort((a, b) => (b.sent_at || "").localeCompare(a.sent_at || ""));

  return (
    <>
      <div className="ev-crumb">Trips</div>
      <div className="ev-hd">
        <h2>Activity log</h2>
      </div>
      <p className="ev-sub">Every outreach email sent across all trips, most recent first.</p>

      {rows.length === 0 ? (
        <div className="ev-card">
          <p className="ev-empty">No outreach sent yet.</p>
        </div>
      ) : (
        <table className="ev-table">
          <thead>
            <tr>
              <th>Sent</th>
              <th>Trip</th>
              <th>Candidate</th>
              <th>Category</th>
              <th>Status</th>
              <th>Last reply</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.sent_at ? new Date(r.sent_at).toLocaleString() : ""}</td>
                <td>{tripNameById.get(r.trip_id) ?? r.trip_id}</td>
                <td>{r.candidate_name}</td>
                <td>{r.candidate_category}</td>
                <td>
                  <span className={`ev-tag ev-t-${r.status}`}>{r.status}</span>
                </td>
                <td>{r.last_reply_summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
