import { google } from "googleapis";

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const sheets = google.sheets({ version: "v4", auth });
const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

async function getHeader(tab) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!1:1` });
  return res.data.values[0];
}

async function appendRow(tab, obj) {
  const header = await getHeader(tab);
  const row = header.map((k) => obj[k] ?? "");
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });
}

async function readAll(tab) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:Z` });
  const [header, ...body] = res.data.values ?? [[]];
  return body.map((row) => Object.fromEntries(header.map((k, i) => [k, row[i] ?? ""])));
}

const now = new Date().toISOString();
const tripId = "TEST_TRIP_DELETE_ME";
const tripEventId = "TEST_TEVENT_DELETE_ME";

console.log("Creating test Trip...");
await appendRow("Trips", {
  id: tripId, name: "Test Trip", city: "Chicago", start_date: "2026-11-01",
  end_date: "2026-11-10", timezone: "America/Chicago", team_size: "8",
  budget: "20000", notes: "verification run", status: "draft",
  created_at: now, created_by: "", archived_at: "",
});

console.log("Creating test TripEvent...");
await appendRow("Events", {
  id: tripEventId, trip_id: tripId, name: "Test Bootcamp", city: "Chicago",
  start_date: "2026-11-02", end_date: "2026-11-03", capacity: "40",
  budget: "9000", requirements: "", status: "draft",
  created_at: now, created_by: "", archived_at: "",
});

console.log("Creating trip-scoped Accommodation candidate...");
await appendRow("Accommodations", {
  id: "TEST_ACC_DELETE_ME", trip_id: tripId, trip_event_id: "",
  name: "Test House", address: "123 Test St", website: "", contact_email: "",
  contact_phone: "", capacity_or_rooms: "6 bed / 4 bath", price_estimate: "$5000",
  fit_rating: "8", fit_rationale: "", source_url: "", status: "candidate",
  created_at: now, updated_at: now,
});

console.log("Creating trip_event-scoped Venue candidate...");
await appendRow("Venues", {
  id: "TEST_VENUE_DELETE_ME", trip_id: tripId, trip_event_id: tripEventId,
  name: "Test Venue", address: "456 Test Ave", website: "", contact_email: "",
  contact_phone: "", capacity_or_rooms: "150", price_estimate: "$9000",
  fit_rating: "9", fit_rationale: "", source_url: "", status: "candidate",
  created_at: now, updated_at: now,
});

console.log("Creating test Photoshoot...");
await appendRow("Photoshoots", {
  id: "TEST_SHOOT_DELETE_ME", trip_id: tripId, trip_event_id: "",
  calendly_event_uri: "", row_type: "shoot", client_name: "Test Client",
  client_email: "test@example.com", client_travelling_from: "NY",
  coach: "Archana", shoot_type: "individual", shoot_date: "2026-11-02",
  start_time: "2026-11-02T18:00:00.000Z", end_time: "2026-11-02T19:00:00.000Z",
  location: "", gym_candidate_id: "", paid: "FALSE", rota: "", notes: "",
  status: "scheduled", source: "manual", created_at: now, updated_at: now,
});

console.log("\nVerifying getTripBundle-equivalent filtering...");
const [trips, events, accommodations, venues, photoshoots] = await Promise.all([
  readAll("Trips"), readAll("Events"), readAll("Accommodations"), readAll("Venues"), readAll("Photoshoots"),
]);

const trip = trips.find((t) => t.id === tripId);
const tripEvents = events.filter((e) => e.trip_id === tripId);
const tripAccommodations = accommodations.filter((a) => a.trip_id === tripId);
const eventVenues = venues.filter((v) => v.trip_event_id === tripEventId);
const tripPhotoshoots = photoshoots.filter((p) => p.trip_id === tripId);

console.log("Trip found:", !!trip, trip?.name);
console.log("TripEvents for trip:", tripEvents.length, tripEvents[0]?.name);
console.log("Accommodations for trip:", tripAccommodations.length, tripAccommodations[0]?.name);
console.log("Venues for tripEvent:", eventVenues.length, eventVenues[0]?.name);
console.log("Photoshoots for trip:", tripPhotoshoots.length, tripPhotoshoots[0]?.client_name);

const allPass =
  trip?.name === "Test Trip" &&
  tripEvents.length === 1 &&
  tripAccommodations.length === 1 &&
  eventVenues.length === 1 &&
  tripPhotoshoots.length === 1;

console.log(allPass ? "\n✅ ALL CHECKS PASS" : "\n❌ SOMETHING DIDN'T MATCH");

console.log("\nCleaning up test rows...");
async function clearRowsById(tab, ids) {
  const header = await getHeader(tab);
  const idCol = header.indexOf("id");
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:A` });
  const col = res.data.values ?? [];
  for (let i = 0; i < col.length; i++) {
    if (ids.includes(col[i][0])) {
      await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tab}!A${i + 1}:Z${i + 1}` });
    }
  }
}
await clearRowsById("Trips", [tripId]);
await clearRowsById("Events", [tripEventId]);
await clearRowsById("Accommodations", ["TEST_ACC_DELETE_ME"]);
await clearRowsById("Venues", ["TEST_VENUE_DELETE_ME"]);
await clearRowsById("Photoshoots", ["TEST_SHOOT_DELETE_ME"]);
console.log("Done.");
