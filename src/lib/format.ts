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
