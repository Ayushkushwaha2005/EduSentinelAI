/*
 * Transactional mail. Production uses Resend when RESEND_API_KEY is set;
 * without it (local dev, no provider configured) the message is logged to
 * the server console so flows remain fully testable (SN-004).
 */
export async function sendMail(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[mail:dev] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "EduSentinel AI <no-reply@edusentinel.ai>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error("[mail] send failed:", res.status, await res.text());
  }
}

export function appUrl(path: string) {
  return `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;
}
