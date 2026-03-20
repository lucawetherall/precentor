import { Music, BookOpen, Users, Calendar } from "lucide-react";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="max-w-2xl text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl font-heading font-semibold tracking-tight">
            Precentor
          </h1>
          <p className="text-xl text-muted-foreground">
            AI-powered music and liturgy planning for Church of England parishes
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          <div className="flex flex-col items-center gap-2 p-4 border border-border bg-card shadow-sm">
            <Calendar className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-body">Lectionary</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border border-border bg-card shadow-sm">
            <Music className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-body">Music Planning</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border border-border bg-card shadow-sm">
            <Users className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-body">Choir Rota</span>
          </div>
          <div className="flex flex-col items-center gap-2 p-4 border border-border bg-card shadow-sm">
            <BookOpen className="h-6 w-6 text-primary" strokeWidth={1.5} />
            <span className="text-sm font-body">Service Sheets</span>
          </div>
        </div>

        <div className="pt-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2 text-sm font-body bg-primary text-primary-foreground border border-primary hover:bg-[#6B4423] transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    </main>
  );
}
