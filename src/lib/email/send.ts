import { Resend } from "resend";

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
    html: `<p>Dear ${name},</p>
<p>The rota for the coming weeks has been published:</p>
<div>${schedule}</div>
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
  const dateList = dates.map((d) => `<li>${d}</li>`).join("");
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Availability reminder — ${churchName}`,
    html: `<p>Dear ${name},</p>
<p>Please submit your availability for the following upcoming services at ${churchName}:</p>
<ul>${dateList}</ul>
<p>— Church Music Planner</p>`,
  });
}

export async function sendInvitation(
  to: string,
  churchName: string,
  inviterName: string
) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `You've been invited to ${churchName}`,
    html: `<p>Hello,</p>
<p>${inviterName} has invited you to join ${churchName} on Church Music Planner.</p>
<p>Sign in to accept:</p>
<p><a href="${process.env.NEXT_PUBLIC_SUPABASE_URL ? "https://precentor.app/login" : "http://localhost:3000/login"}">Sign In</a></p>
<p>— Church Music Planner</p>`,
  });
}
