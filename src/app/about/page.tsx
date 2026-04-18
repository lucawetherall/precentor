import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";

export const metadata: Metadata = {
  title: "About — Precentor",
  description:
    "Precentor is an AI-powered church music and service planning tool built for Church of England parishes.",
};

export default function AboutPage() {
  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <BackLink href="/">Back to home</BackLink>

      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-semibold">About Precentor</h1>
        <p className="text-muted-foreground">
          Making church music planning simpler, one parish at a time.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">What is Precentor?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Precentor is an AI-powered tool for planning church services, managing
          choir rotas, and selecting music — built specifically for the Church of
          England. It brings together the Common Worship lectionary, popular
          hymnals (including NEH and A&amp;M), and intelligent music suggestions
          into a single, easy-to-use platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Who is it for?</h2>
        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            <strong className="text-foreground">Directors of Music</strong> —
            Plan hymns, anthems, and voluntaries for every service with AI
            suggestions tailored to the lectionary readings and liturgical season.
          </p>
          <p>
            <strong className="text-foreground">Choir Members</strong> — See
            upcoming services, submit availability, and view your rota in one
            place.
          </p>
          <p>
            <strong className="text-foreground">Clergy</strong> — Review service
            plans, track music selections, and generate print-ready service
            sheets.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">Our values</h2>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc list-inside">
          <li>
            <strong className="text-foreground">Privacy-first</strong> — your
            parish data stays private. We collect only what&apos;s needed to run
            the service.
          </li>
          <li>
            <strong className="text-foreground">Parish-focused</strong> — built
            around real workflows of church music directors, not generic project
            management.
          </li>
          <li>
            <strong className="text-foreground">Anglican tradition</strong> —
            the Common Worship calendar, collects, and readings are built in, not
            bolted on.
          </li>
          <li>
            <strong className="text-foreground">Free for parishes</strong> —
            Precentor is free to use for individual Church of England parishes.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-heading font-medium">What hymnals are supported?</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Precentor currently supports the <em>New English Hymnal</em> (NEH) and{" "}
          <em>Ancient &amp; Modern</em> (A&amp;M). Additional hymnals may be
          added in future based on parish demand.
        </p>
      </section>

      <div className="border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          Have questions?{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Get in touch
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
