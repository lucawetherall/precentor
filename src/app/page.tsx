import { Music, BookOpen, Users, Calendar, Sparkles, FileText, ArrowRight, Church } from "lucide-react";
import Link from "next/link";
import { Ornament } from "@/components/ui/ornament";
import { Footer } from "@/components/footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Precentor",
  description: "AI-powered liturgical music and service planning for Church of England parishes",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "GBP",
  },
};

export default function Home() {
  return (
    <main id="main-content" className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 sm:px-8 py-20 sm:py-28 lg:py-36 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
        <div className="max-w-2xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 small-caps text-xs text-primary border border-primary/30 bg-primary/5 mb-2 rounded-full">
            <Sparkles className="h-3 w-3" strokeWidth={1.5} aria-hidden="true" />
            AI-powered church music planning
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-semibold tracking-tight text-balance">
            Your next Sunday, planned in minutes
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto text-balance">
            Precentor brings AI-powered music suggestions, the Common Worship
            lectionary, and choir management into one place — so you can spend
            less time planning and more time making music.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors shadow-md rounded-md"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 text-sm font-body border border-border hover:bg-muted transition-colors rounded-md"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 sm:px-8 py-12 sm:py-16 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-center mb-8 sm:mb-12">
            Everything you need for church music planning
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-border bg-card p-6 shadow-sm rounded-md">
              <Calendar className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Lectionary Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Common Worship lectionary built in. See readings, collects, liturgical colours, and seasons for every Sunday.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md">
              <Music className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Music Planning</h3>
              <p className="text-sm text-muted-foreground">
                Plan hymns, anthems, mass settings, and organ voluntaries for every service. Search NEH and A&M hymnals.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md">
              <Sparkles className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">AI Suggestions</h3>
              <p className="text-sm text-muted-foreground">
                Get intelligent music suggestions based on the readings, season, and your church&apos;s repertoire history.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md">
              <Users className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Choir Rota</h3>
              <p className="text-sm text-muted-foreground">
                Track availability, assign singers to services, and manage your choir with voice part grouping.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md">
              <FileText className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Service Sheets</h3>
              <p className="text-sm text-muted-foreground">
                Generate print-ready PDF and Word service sheets from your planned music, automatically formatted.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md">
              <BookOpen className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Repertoire Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Automatically log what you perform. See your most-played pieces and avoid repeating music too often.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="max-w-3xl mx-auto">
          <Ornament variant="fleuron" className="my-0 mb-8" />
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-center mb-8 sm:mb-12">
            Get started in three steps
          </h2>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-heading font-semibold text-sm rounded-full">
                1
              </span>
              <div>
                <h3 className="font-heading font-semibold mb-1">Create your church</h3>
                <p className="text-sm text-muted-foreground">
                  Sign up and set up your parish with diocese, address, and CCLI details. Invite your choir members.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-heading font-semibold text-sm rounded-full">
                2
              </span>
              <div>
                <h3 className="font-heading font-semibold mb-1">Plan your services</h3>
                <p className="text-sm text-muted-foreground">
                  Browse the lectionary, create services for each Sunday, and fill in music slots with help from AI suggestions.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-heading font-semibold text-sm rounded-full">
                3
              </span>
              <div>
                <h3 className="font-heading font-semibold mb-1">Manage your choir</h3>
                <p className="text-sm text-muted-foreground">
                  Collect availability, assign rotas, and generate service sheets — all from one dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who is Precentor for? (C14 — personas) */}
      <section className="px-4 sm:px-8 py-12 sm:py-16 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-heading font-semibold text-center mb-8 sm:mb-12">
            Who is Precentor for?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="border border-border bg-card p-6 shadow-sm rounded-md text-center">
              <Music className="h-8 w-8 text-primary mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Director of Music</h3>
              <p className="text-sm text-muted-foreground">
                Plan every service from a single dashboard. AI suggests hymns based on the readings and season, so you can focus on rehearsal.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Choir Member</h3>
              <p className="text-sm text-muted-foreground">
                See what&apos;s coming up, submit your availability, and view your rota — all from your phone.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm rounded-md text-center">
              <Church className="h-8 w-8 text-primary mx-auto mb-3" strokeWidth={1.5} aria-hidden="true" />
              <h3 className="font-heading font-semibold mb-2">Vicar</h3>
              <p className="text-sm text-muted-foreground">
                Review service plans at a glance, see music choices alongside readings, and approve service sheets before print.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing hint (C16) */}
      <section className="px-4 sm:px-8 py-12 sm:py-16">
        <div className="max-w-md mx-auto">
          <div className="border border-border bg-card p-8 shadow-sm rounded-md text-center">
            <h2 className="text-2xl font-heading font-semibold mb-2">Free for parishes</h2>
            <p className="text-muted-foreground text-sm mb-4">
              Everything you need to plan services, manage your choir, and generate
              service sheets — at no cost.
            </p>
            <ul className="text-sm text-muted-foreground space-y-2 text-left mb-6">
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5" aria-hidden="true">&#10003;</span>
                Unlimited services and music planning
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5" aria-hidden="true">&#10003;</span>
                AI-powered hymn and anthem suggestions
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5" aria-hidden="true">&#10003;</span>
                Choir rota and availability tracking
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5" aria-hidden="true">&#10003;</span>
                Service sheet generation
              </li>
              <li className="flex items-start gap-2">
                <span className="text-success mt-0.5" aria-hidden="true">&#10003;</span>
                Common Worship lectionary built in
              </li>
            </ul>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center w-full px-8 py-3 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors rounded-md shadow-md"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 sm:px-8 py-12 sm:py-16 bg-muted/50">
        <div className="max-w-2xl mx-auto text-center">
          <Ornament variant="fleuron" className="my-0 mb-6" />
          <h2 className="text-2xl font-heading font-semibold mb-3">
            Ready to simplify your music planning?
          </h2>
          <p className="text-muted-foreground mb-6">
            Set up your church in minutes. No credit card needed.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-primary-hover transition-colors rounded-md shadow-md"
          >
            Create Your Church
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
