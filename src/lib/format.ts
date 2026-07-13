export function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil(
    (Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      msPerDay
  );
}

export function formatCountdown(startDate: string): { value: string; label: string } {
  const days = daysUntil(startDate);
  if (days === null) return { value: "—", label: "no date set" };
  if (days > 0) return { value: String(days), label: days === 1 ? "day to go" : "days to go" };
  if (days === 0) return { value: "Today", label: "event starts today" };
  return { value: `${Math.abs(days)}d`, label: "since start" };
}

/** UTC offset in minutes for a given IANA timezone, on a specific date (DST-aware). */
function getUtcOffsetMinutes(dateStr: string, timezone: string): number {
  const dt = new Date(`${dateStr}T12:00:00Z`); // noon UTC avoids DST-transition edge cases at midnight
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "shortOffset",
  }).formatToParts(dt);
  const offsetPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+0";
  const match = offsetPart.match(/GMT([+-])(\d+)(?::(\d+))?/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  return sign * (hours * 60 + minutes);
}

/** Converts a trip-local wall-clock date+time to a correct UTC ISO string. */
export function tripLocalToUtcIso(dateStr: string, time: string, timezone: string): string {
  const offsetMinutes = getUtcOffsetMinutes(dateStr, timezone);
  const asIfUtc = new Date(`${dateStr}T${time}:00Z`);
  return new Date(asIfUtc.getTime() - offsetMinutes * 60_000).toISOString();
}

/** Formats a UTC ISO timestamp as a time string in the given IANA timezone, e.g. "2:30 PM". */
export function formatTimeInTimezone(isoUtc: string, timezone: string): string {
  if (!isoUtc) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoUtc));
}
