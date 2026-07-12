import { google, gmail_v1 } from "googleapis";

let cachedClient: gmail_v1.Gmail | null = null;

function getGmailClient(): gmail_v1.Gmail {
  if (cachedClient) return cachedClient;

  const clientId = process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN env vars"
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  cachedClient = google.gmail({ version: "v1", auth });
  return cachedClient;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeHeaderWord(text: string): string {
  return /^[\x00-\x7F]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, "utf-8").toString("base64")}?=`;
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ messageId: string; threadId: string }> {
  const gmail = getGmailClient();
  const sender = process.env.GMAIL_SENDER_ADDRESS;
  if (!sender) throw new Error("Missing GMAIL_SENDER_ADDRESS env var");

  const message = [
    `From: ${sender}`,
    `To: ${params.to}`,
    `Subject: ${encodeHeaderWord(params.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "",
    params.body,
  ].join("\r\n");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: base64UrlEncode(message) },
  });

  return {
    messageId: res.data.id ?? "",
    threadId: res.data.threadId ?? "",
  };
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
    "utf-8"
  );
}

function extractPlainText(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const text = extractPlainText(part);
    if (text) return text;
  }
  return "";
}

/** Returns the thread's messages excluding the ones sent from our own address. */
export async function getThreadReplies(threadId: string): Promise<string[]> {
  const gmail = getGmailClient();
  const sender = process.env.GMAIL_SENDER_ADDRESS;
  const res = await gmail.users.threads.get({ userId: "me", id: threadId });

  const messages = res.data.messages ?? [];
  const replies: string[] = [];

  for (const msg of messages) {
    const fromHeader = msg.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === "from"
    )?.value;
    if (sender && fromHeader?.includes(sender)) continue;

    const text = extractPlainText(msg.payload ?? undefined);
    if (text) replies.push(text);
  }

  return replies;
}
