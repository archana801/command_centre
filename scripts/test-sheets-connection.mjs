import { google } from "googleapis";

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

if (!email || !rawKey || !spreadsheetId) {
  console.error("Missing one of GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_SPREADSHEET_ID");
  process.exit(1);
}

const auth = new google.auth.JWT({
  email,
  key: rawKey.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

const res = await sheets.spreadsheets.values.batchGet({
  spreadsheetId,
  ranges: ["Events!1:1", "Venues!1:1", "Accommodations!1:1", "Gyms!1:1", "OutreachLog!1:1"],
});

for (const range of res.data.valueRanges ?? []) {
  const header = range.values?.[0] ?? [];
  console.log(`${range.range}: ${header.length ? header.join(", ") : "(EMPTY — add the header row!)"}`);
}
console.log("\nConnection OK.");
