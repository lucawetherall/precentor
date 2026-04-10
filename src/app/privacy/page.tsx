export default function PrivacyPage() {
  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-semibold">Privacy Notice</h1>
        <p className="text-sm text-muted-foreground">Last updated: April 2026</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Who is the data controller</h2>
        <p className="text-sm">
          Precentor is a worship and choir planning tool provided to Church of England parishes.
          The data controller for your personal data is your church (the Parochial Church Council, or PCC),
          not Precentor as a service. Your church administrator is responsible for how your data is used
          within this service. Contact your church&apos;s administrator with data-related requests.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">What personal data we collect</h2>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Your name and email address (required to create an account)</li>
          <li>Your role in the church (Admin, Editor, or Member)</li>
          <li>Your voice part (Soprano, Alto, Tenor, Bass) — optional</li>
          <li>Your availability for services (Available, Unavailable, or Tentative)</li>
          <li>Whether you have been assigned to a service rota and whether you confirmed</li>
        </ul>
        <p className="text-sm">We do not collect home addresses, phone numbers, or payment information.</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Lawful basis for processing</h2>
        <p className="text-sm">
          We process your personal data on the basis of <strong>legitimate interests</strong> (UK GDPR
          Article 6(1)(f)) — specifically, the legitimate interest of your church in coordinating worship
          services, managing choir rotas, and organising its ministry. This is consistent with your
          voluntary membership of the church community and the reasonable expectations of church participants.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">How long we keep your data</h2>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>Account and profile data: held while you are a member of at least one church on Precentor</li>
          <li>
            Availability and rota records: held for up to 12 months after the relevant service date, in
            line with Church of England guidance on record keeping for activities (Section 2.8 of CoE
            Safer Environment and Activities guidance)
          </li>
          <li>Invite records: automatically expire after 7 days</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Your rights</h2>
        <p className="text-sm">Under UK data protection law, you have the right to:</p>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li>
            <strong>Access</strong> the personal data we hold about you — use &ldquo;Download my data&rdquo; in{" "}
            <a href="/account" className="underline hover:no-underline">Account Settings</a>
          </li>
          <li><strong>Rectify</strong> inaccurate data — contact your church administrator</li>
          <li>
            <strong>Erasure</strong> (right to be forgotten) — use &ldquo;Delete my account&rdquo; in{" "}
            <a href="/account" className="underline hover:no-underline">Account Settings</a>
          </li>
          <li><strong>Data portability</strong> — export your data as JSON from Account Settings</li>
          <li><strong>Object</strong> to processing — contact your church administrator</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Who we share your data with</h2>
        <ul className="text-sm space-y-1 list-disc pl-5">
          <li><strong>Supabase</strong> — authentication and database hosting</li>
          <li><strong>Resend</strong> — transactional email delivery (invite notifications, rota reminders)</li>
          <li>
            Other members of your church with Admin access can see your name, email, role, and voice part
          </li>
        </ul>
        <p className="text-sm">
          We do not sell your data or share it with third parties for marketing purposes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Security</h2>
        <p className="text-sm">
          Passwords are hashed using bcrypt and never stored in plain text. All connections use TLS
          encryption. Access to personal data is restricted by role-based access control — only members
          of your church can see your data, and only Admins can see email addresses.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Complaints</h2>
        <p className="text-sm">
          If you have concerns about how your data is handled, you may contact the Information
          Commissioner&apos;s Office (ICO) at{" "}
          <a
            href="https://ico.org.uk"
            className="underline hover:no-underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ico.org.uk
          </a>{" "}
          or by calling 0303 123 1113.
        </p>
      </section>
    </main>
  );
}
