import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = {
  title: "Contact — Precentor",
  description: "Get in touch with the Precentor team for support, feedback, or questions.",
};

export default function ContactPage() {
  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <BackLink href="/">Back to home</BackLink>

      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-semibold">Contact</h1>
        <p className="text-muted-foreground">
          We&apos;d love to hear from you.
        </p>
      </div>

      <section className="border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-primary" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium">Email</p>
            <a
              href="mailto:hello@precentor.app"
              className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              hello@precentor.app
            </a>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">What can we help with?</h2>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
          <li>Setting up your parish on Precentor</li>
          <li>Technical support and bug reports</li>
          <li>Feature requests and feedback</li>
          <li>Questions about data and privacy</li>
          <li>CCLI and copyright licensing queries</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Response time</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We aim to respond to all enquiries within 48 hours during the working
          week. For urgent matters relating to a service this week, please note
          this in your subject line.
        </p>
      </section>

      <div className="border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          You may also find answers in our{" "}
          <Link href="/faq" className="underline underline-offset-2 hover:text-foreground">
            frequently asked questions
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
