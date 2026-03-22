import { Music, BookOpen, Users, Calendar, Sparkles, FileText, ArrowRight, Church } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-8 py-24 sm:py-32 text-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-5xl sm:text-6xl font-heading font-semibold tracking-tight">
            Precentor
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg mx-auto">
            AI-powered music and liturgy planning for Church of England parishes.
            Plan services, manage your choir, and generate service sheets — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-body border border-border hover:bg-muted transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 bg-muted/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-heading font-semibold text-center mb-12">
            Everything you need for church music planning
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="border border-border bg-card p-6 shadow-sm">
              <Calendar className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold mb-2">Lectionary Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Common Worship lectionary built in. See readings, collects, liturgical colours, and seasons for every Sunday.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm">
              <Music className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold mb-2">Music Planning</h3>
              <p className="text-sm text-muted-foreground">
                Plan hymns, anthems, mass settings, and organ voluntaries for every service. Search NEH and A&M hymnals.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm">
              <Sparkles className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold mb-2">AI Suggestions</h3>
              <p className="text-sm text-muted-foreground">
                Get intelligent music suggestions based on the readings, season, and your church&apos;s repertoire history.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm">
              <Users className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold mb-2">Choir Rota</h3>
              <p className="text-sm text-muted-foreground">
                Track availability, assign singers to services, and manage your choir with voice part grouping.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm">
              <FileText className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold mb-2">Service Sheets</h3>
              <p className="text-sm text-muted-foreground">
                Generate print-ready PDF and Word service sheets from your planned music, automatically formatted.
              </p>
            </div>
            <div className="border border-border bg-card p-6 shadow-sm">
              <BookOpen className="h-7 w-7 text-primary mb-3" strokeWidth={1.5} />
              <h3 className="font-heading font-semibold mb-2">Repertoire Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Automatically log what you perform. See your most-played pieces and avoid repeating music too often.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-8 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-heading font-semibold text-center mb-12">
            Get started in three steps
          </h2>
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-heading font-semibold text-sm">
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
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-heading font-semibold text-sm">
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
              <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary text-primary-foreground font-heading font-semibold text-sm">
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

      {/* CTA */}
      <section className="px-8 py-16 bg-muted/50">
        <div className="max-w-2xl mx-auto text-center">
          <Church className="h-10 w-10 mx-auto text-primary mb-4" strokeWidth={1.5} />
          <h2 className="text-2xl font-heading font-semibold mb-3">
            Ready to simplify your music planning?
          </h2>
          <p className="text-muted-foreground mb-6">
            Free for individual parishes. Set up your church in minutes.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors"
          >
            Create Your Church
            <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 border-t border-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span className="font-heading font-semibold text-foreground text-sm">Precentor</span>
          <span>&copy; {new Date().getFullYear()} Precentor. Built for the Church of England.</span>
        </div>
      </footer>
    </main>
  );
}
