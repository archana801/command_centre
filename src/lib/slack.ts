import crypto from "node:crypto";

/**
 * Best-effort notification — never throws. A Slack outage or missing
 * config must not break the primary action (email sent, reply logged, etc.)
 * that triggered it.
 */
export async function notifySlack(text: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("Slack notification failed:", err);
  }
}

/** Verifies a request actually came from Slack. https://api.slack.com/authentication/verifying-requests-from-slack */
export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  const { signingSecret, timestamp, signature, rawBody } = params;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 60 * 5) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" + crypto.createHmac("sha256", signingSecret).update(base).digest("hex");

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}
