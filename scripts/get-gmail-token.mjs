import http from "node:http";
import { google } from "googleapis";

const clientId = process.env.GMAIL_CLIENT_ID;
const clientSecret = process.env.GMAIL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error(
    "Missing GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET.\n" +
      "Add them to .env.local first, then run:\n" +
      "  node --env-file=.env.local scripts/get-gmail-token.mjs"
  );
  process.exit(1);
}

const redirectUri = "http://localhost:3999/oauth2callback";
const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/gmail.readonly",
  ],
});

console.log("\n1. Open this URL in a browser, and sign in as the SHARED INBOX (e.g. events@kmakfitness.com):\n");
console.log(authUrl);
console.log("\n2. Approve access. You'll be redirected back here automatically.\n");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  const code = url.searchParams.get("code");

  if (!code) {
    res.end("No authorization code found in the callback. Check the terminal and try again.");
    return;
  }

  res.end("Success! You can close this tab and return to the terminal.");
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  console.log("\nAdd this line to .env.local:\n");
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  process.exit(0);
});

server.listen(3999, () => {
  console.log("Waiting for the OAuth redirect on http://localhost:3999 ...");
});
