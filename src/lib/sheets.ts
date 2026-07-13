import { google, sheets_v4 } from "googleapis";
import type {
  TripRecord,
  TripEventRecord,
  CandidateRecord,
  OutreachLogRecord,
  PhotoshootRecord,
} from "./types";

const TABS = {
  trips: "Trips",
  events: "Events",
  venues: "Venues",
  accommodations: "Accommodations",
  gyms: "Gyms",
  outreachLog: "OutreachLog",
  photoshoots: "Photoshoots",
} as const;

export type TabName = (typeof TABS)[keyof typeof TABS];
export { TABS };

const CATEGORY_TABS = {
  venue: TABS.venues,
  accommodation: TABS.accommodations,
  gym: TABS.gyms,
} as const;

export function tabForCategory(
  category: keyof typeof CATEGORY_TABS
): TabName {
  return CATEGORY_TABS[category];
}

let cachedClient: sheets_v4.Sheets | null = null;

function getSheetsClient(): sheets_v4.Sheets {
  if (cachedClient) return cachedClient;

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY env vars"
    );
  }

  const auth = new google.auth.JWT({
    email,
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  cachedClient = google.sheets({ version: "v4", auth });
  return cachedClient;
}

function getSpreadsheetId(): string {
  const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!id) throw new Error("Missing GOOGLE_SHEETS_SPREADSHEET_ID env var");
  return id;
}

function rowsToObjects<T>(rows: string[][]): T[] {
  if (rows.length === 0) return [];
  const [header, ...body] = rows;
  return body
    .filter((row) => row.some((cell) => cell !== "" && cell !== undefined))
    .map((row) => {
      const obj: Record<string, string> = {};
      header.forEach((key, i) => {
        obj[key] = row[i] ?? "";
      });
      return obj as T;
    });
}

/** Reads an entire tab as an array of objects keyed by its header row. */
export async function readTable<T>(tab: TabName): Promise<T[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${tab}!A:Z`,
  });
  return rowsToObjects<T>((res.data.values as string[][]) ?? []);
}

/**
 * Fetches a trip's row plus its events/accommodations/gyms/photoshoots/outreach
 * log in a single batchGet call, filtered by trip_id in memory. Avoids N+1 reads
 * for the trip detail page. Venue candidates live under individual TripEvents —
 * see getTripEventBundle.
 */
export async function getTripBundle(tripId: string) {
  const sheets = getSheetsClient();
  const ranges = [
    `${TABS.trips}!A:Z`,
    `${TABS.events}!A:Z`,
    `${TABS.accommodations}!A:Z`,
    `${TABS.gyms}!A:Z`,
    `${TABS.photoshoots}!A:Z`,
    `${TABS.outreachLog}!A:Z`,
  ];
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: getSpreadsheetId(),
    ranges,
  });

  const [tripsRows, eventsRows, accommodationsRows, gymsRows, photoshootsRows, outreachRows] =
    res.data.valueRanges?.map((r) => (r.values as string[][]) ?? []) ?? [];

  const trips = rowsToObjects<TripRecord>(tripsRows ?? []);
  const trip = trips.find((t) => t.id === tripId) ?? null;

  const byTrip = <T extends { trip_id: string }>(rows: string[][]) =>
    rowsToObjects<T>(rows ?? []).filter((r) => r.trip_id === tripId);

  return {
    trip,
    events: byTrip<TripEventRecord>(eventsRows ?? []),
    accommodations: byTrip<CandidateRecord>(accommodationsRows ?? []),
    gyms: byTrip<CandidateRecord>(gymsRows ?? []),
    photoshoots: byTrip<PhotoshootRecord>(photoshootsRows ?? []),
    outreachLog: byTrip<OutreachLogRecord>(outreachRows ?? []),
  };
}

/** Fetches a single TripEvent plus its venue candidates (filtered by trip_event_id). */
export async function getTripEventBundle(tripEventId: string) {
  const sheets = getSheetsClient();
  const ranges = [`${TABS.events}!A:Z`, `${TABS.venues}!A:Z`];
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: getSpreadsheetId(),
    ranges,
  });

  const [eventsRows, venuesRows] =
    res.data.valueRanges?.map((r) => (r.values as string[][]) ?? []) ?? [];

  const events = rowsToObjects<TripEventRecord>(eventsRows ?? []);
  const tripEvent = events.find((e) => e.id === tripEventId) ?? null;

  const venues = rowsToObjects<CandidateRecord>(venuesRows ?? []).filter(
    (v) => v.trip_event_id === tripEventId
  );

  return { tripEvent, venues };
}

async function getHeader(tab: TabName): Promise<string[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSpreadsheetId(),
    range: `${tab}!1:1`,
  });
  const header = (res.data.values?.[0] as string[]) ?? [];
  if (header.length === 0) {
    throw new Error(`Tab "${tab}" has no header row — create it before writing`);
  }
  return header;
}

/** Appends a new row, mapping object keys onto the tab's existing header order. */
export async function appendRow(
  tab: TabName,
  obj: Record<string, string>
): Promise<void> {
  const sheets = getSheetsClient();
  const header = await getHeader(tab);
  const row = header.map((key) => obj[key] ?? "");
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSpreadsheetId(),
    range: `${tab}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

/**
 * Updates a row identified by its `id` column. Sheets has no row-by-ID
 * addressing, so this reads the ID column to find the row index, then
 * updates just that row's changed cells.
 */
export async function updateRowById(
  tab: TabName,
  id: string,
  patch: Record<string, string>
): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = getSpreadsheetId();
  const header = await getHeader(tab);
  const idColIndex = header.indexOf("id");
  if (idColIndex === -1) throw new Error(`Tab "${tab}" has no "id" column`);

  const idColLetter = String.fromCharCode(65 + idColIndex);
  const idColRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!${idColLetter}:${idColLetter}`,
  });
  const idColumn = (idColRes.data.values as string[][]) ?? [];
  const rowIndex = idColumn.findIndex((r) => r[0] === id);
  if (rowIndex === -1) throw new Error(`Row with id "${id}" not found in ${tab}`);

  const rowNumber = rowIndex + 1; // 1-indexed, matches the sheet's actual row
  const currentRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tab}!A${rowNumber}:Z${rowNumber}`,
  });
  const currentRow = (currentRes.data.values?.[0] as string[]) ?? [];

  const merged = header.map((key, i) => patch[key] ?? currentRow[i] ?? "");

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A${rowNumber}:Z${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [merged] },
  });
}

export function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
