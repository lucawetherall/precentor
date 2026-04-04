import { Resend } from "resend";
import { escapeHtml } from "@/lib/utils/escape-html";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Precentor <onboarding@resend.dev>";

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
  inviterName: string,
  inviteUrl: string,
) {
  if (!inviteUrl.startsWith("https://") && !inviteUrl.startsWith("http://")) {
    throw new Error("inviteUrl must use http:// or https:// scheme");
  }
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to ${churchName}`,
    html: `<p>Hello,</p>
<p>${escapeHtml(inviterName)} has invited you to join ${escapeHtml(churchName)} on Precentor.</p>
<p><a href="${escapeHtml(inviteUrl)}">Click here to accept the invite</a></p>
<p>This link expires in 7 days.</p>
<p>— Precentor</p>`,
  });
}
