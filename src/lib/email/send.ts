import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Church Music Planner <noreply@precentor.app>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendRotaNotification(
  to: string,
  name: string,
  schedule: string
) {
  await resend.emails.send({
    from: FROM_EMAIL,
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
  await resend.emails.send({
    from: FROM_EMAIL,
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
  inviterName: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "https://precentor.app" : "http://localhost:3000");
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to ${churchName}`,
    html: `<p>Hello,</p>
<p>${escapeHtml(inviterName)} has invited you to join ${escapeHtml(churchName)} on Church Music Planner.</p>
<p>Sign in to accept:</p>
<p><a href="${appUrl}/login">Sign In</a></p>
<p>— Church Music Planner</p>`,
  });
}
