import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/back-link";
import { FaqAccordion } from "./faq-accordion";

export const metadata: Metadata = {
  title: "FAQ — Precentor",
  description: "Frequently asked questions about Precentor, the church music planning tool.",
};

const FAQS = [
  {
    question: "Is Precentor free?",
    answer:
      "Yes. Precentor is free for individual Church of England parishes. We may introduce optional paid tiers in future for larger organisations, but the core planning features will remain free.",
  },
  {
    question: "Which hymnals are supported?",
    answer:
      "Precentor currently includes the New English Hymnal (NEH) and Ancient & Modern (A&M). We plan to add further hymnals based on demand from parishes.",
  },
  {
    question: "Does it follow the Church of England lectionary?",
    answer:
      "Yes. The Common Worship lectionary calendar is built in, including Principal and Lesser Festivals, readings, collects, liturgical colours, and seasons.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Your data is stored securely on servers hosted in the EU. We use Supabase (built on PostgreSQL) with row-level security. See our Privacy Notice for full details.",
  },
  {
    question: "Can multiple people edit services?",
    answer:
      "Yes. Each church can have Admins, Editors, and Members. Admins and Editors can plan services and manage music. Members can view services and submit their availability.",
  },
  {
    question: "How do the AI music suggestions work?",
    answer:
      "Precentor analyses the lectionary readings, liturgical season, and your church's repertoire history to suggest appropriate hymns, anthems, and settings. All suggestions are recommendations — you always have the final say.",
  },
  {
    question: "Can I generate service sheets?",
    answer:
      "Yes. Once you have planned your music and liturgy for a service, you can generate a formatted service booklet for print or digital distribution.",
  },
  {
    question: "Do I need a CCLI licence?",
    answer:
      "If your church reproduces song lyrics (in service sheets or projected words), you will need the appropriate CCLI licence. Precentor can store your CCLI number for reference but does not replace your licensing obligations.",
  },
];

export default function FaqPage() {
  return (
    <main id="main-content" className="max-w-2xl mx-auto px-4 py-12 space-y-8">
      <BackLink href="/">Back to home</BackLink>

      <div className="space-y-2">
        <h1 className="text-3xl font-heading font-semibold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">
          Common questions about Precentor and how it works.
        </p>
      </div>

      <FaqAccordion items={FAQS} />

      <div className="border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          Can&apos;t find what you&apos;re looking for?{" "}
          <Link href="/contact" className="underline underline-offset-2 hover:text-foreground">
            Contact us
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
