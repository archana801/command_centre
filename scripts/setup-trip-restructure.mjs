import { google } from "googleapis";

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

if (!email || !rawKey || !spreadsheetId) {
  console.error(
    "Missing one of GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_SPREADSHEET_ID"
  );
  process.exit(1);
}

const auth = new google.auth.JWT({
  email,
  key: rawKey.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const HEADERS = {
  Trips: [
    "id", "name", "city", "start_date", "end_date", "timezone",
    "team_size", "budget", "notes", "status", "created_at", "created_by", "archived_at",
  ],
  Events: [
    "id", "trip_id", "name", "city", "start_date", "end_date",
    "capacity", "budget", "requirements", "status", "created_at", "created_by", "archived_at",
  ],
  Venues: [
    "id", "trip_id", "trip_event_id", "name", "address", "website", "contact_email",
    "contact_phone", "capacity_or_rooms", "price_estimate", "fit_rating", "fit_rationale",
    "source_url", "status", "created_at", "updated_at",
  ],
  Accommodations: [
    "id", "trip_id", "trip_event_id", "name", "address", "website", "contact_email",
    "contact_phone", "capacity_or_rooms", "price_estimate", "fit_rating", "fit_rationale",
    "source_url", "status", "created_at", "updated_at",
  ],
  Gyms: [
    "id", "trip_id", "trip_event_id", "name", "address", "website", "contact_email",
    "contact_phone", "capacity_or_rooms", "price_estimate", "fit_rating", "fit_rationale",
    "source_url", "status", "created_at", "updated_at",
  ],
  OutreachLog: [
    "id", "trip_id", "candidate_category", "candidate_id", "candidate_name",
    "recipient_email", "subject", "gmail_message_id", "gmail_thread_id", "sent_at",
    "sent_by", "status", "last_reply_summary", "last_checked_at",
  ],
  Photoshoots: [
    "id", "trip_id", "trip_event_id", "calendly_event_uri", "row_type", "client_name",
    "client_email", "client_travelling_from", "coach", "shoot_type", "shoot_date",
    "start_time", "end_time", "location", "gym_candidate_id", "paid", "rota", "notes",
    "status", "source", "created_at", "updated_at",
  ],
};

const meta = await sheets.spreadsheets.get({ spreadsheetId });
const existingTitles = new Set(
  (meta.data.sheets ?? []).map((s) => s.properties?.title)
);

const newSheets = Object.keys(HEADERS).filter((title) => !existingTitles.has(title));
if (newSheets.length > 0) {
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: newSheets.map((title) => ({ addSheet: { properties: { title } } })),
    },
  });
  console.log(`Created sheets: ${newSheets.join(", ")}`);
}

for (const [tab, header] of Object.entries(HEADERS)) {
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [header] },
  });

  // Restructured tabs may have leftover test rows in the OLD column shape — clear them
  // so nothing is misinterpreted under the new headers. Fresh tabs have nothing to clear.
  if (existingTitles.has(tab)) {
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${tab}!A2:Z1000`,
    });
  }
  const clearedNote = existingTitles.has(tab) ? ", data rows cleared" : " (new sheet)";
  console.log(`${tab}: header set (${header.length} columns)${clearedNote}`);
}

console.log("\nDone. Trips/Photoshoots created; Events/Venues/Accommodations/Gyms/OutreachLog re-headered.");
