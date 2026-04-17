import "server-only";
import { Resend } from "resend";
import { escapeHtml } from "@/lib/utils/escape-html";

// Lazy-initialise so the module can be imported at build time without an API key
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Sender identity must be a verified domain in production; the resend.dev
// sandbox address only delivers to the account owner. EMAIL_FROM is resolved
// lazily so test/dev environments continue to work without configuration.
function getFromEmail(): string {
  const configured = process.env.EMAIL_FROM?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "EMAIL_FROM is not configured. Set it to a verified sender (e.g. 'Precentor <noreply@precentor.app>').",
    );
  }
  return "Precentor <onboarding@resend.dev>";
}

// Cap email send latency so Resend hanging can't hang the API request that
// triggered the send. The SDK doesn't expose an AbortSignal, so race against
// a timer; on timeout we reject and move on, and the real request is leaked
// into the background rather than blocking the handler.
const SEND_TIMEOUT_MS = 8_000;

async function sendWithTimeout(payload: Parameters<Resend["emails"]["send"]>[0]) {
  const send = getResend().emails.send(payload);
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Email send timed out after ${SEND_TIMEOUT_MS}ms`)),
      SEND_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([send, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function sendRotaNotification(
  to: string,
  name: string,
  schedule: string
) {
  await sendWithTimeout({
    from: getFromEmail(),
    to,
    subject: "Your rota has been published",
    html: `<p>Dear ${escapeHtml(name)},</p>
<p>The rota for the coming weeks has been published:</p>
<div>${escapeHtml(schedule)}</div>
<p>Please check your availability and confirm your attendance.</p>
<p>— Church Music Planner</p>`,
  });
}

export async function sendAvailabilityReminder(
  to: string,
  name: string,
  churchName: string,
  dates: string[]
) {
  const dateList = dates.map((d) => `<li>${escapeHtml(d)}</li>`).join("");
  await sendWithTimeout({
    from: getFromEmail(),
    to,
    subject: `Availability reminder — ${churchName}`,
    html: `<p>Dear ${escapeHtml(name)},</p>
<p>Please submit your availability for the following upcoming services at ${escapeHtml(churchName)}:</p>
<ul>${dateList}</ul>
<p>— Church Music Planner</p>`,
  });
}

export async function sendInvitation(
  to: string,
  churchName: string,
  inviterName: string,
  inviteUrl: string,
) {
  if (!inviteUrl.startsWith("https://") && !inviteUrl.startsWith("http://")) {
    throw new Error("inviteUrl must use http:// or https:// scheme");
  }
  await sendWithTimeout({
    from: getFromEmail(),
    to,
    subject: `You've been invited to ${churchName}`,
    html: `<p>Hello,</p>
<p>${escapeHtml(inviterName)} has invited you to join ${escapeHtml(churchName)} on Precentor.</p>
<p><a href="${escapeHtml(inviteUrl)}">Click here to accept the invite</a></p>
<p>This link expires in 7 days.</p>
<p>— Precentor</p>`,
  });
}
