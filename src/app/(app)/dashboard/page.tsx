import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Church } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-heading font-semibold mb-4">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome, {user.email}. Your churches and upcoming services will appear
        here.
      </p>

      <div className="grid gap-4 max-w-2xl">
        <Link
          href="/churches"
          className="flex items-center gap-4 border border-border bg-card p-6 shadow-sm hover:border-primary transition-colors"
        >
          <Church className="h-8 w-8 text-muted-foreground flex-shrink-0" strokeWidth={1.5} />
          <div>
            <h2 className="text-lg font-heading font-semibold">Manage your churches</h2>
            <p className="text-sm text-muted-foreground">
              View, create, and manage churches and their members.
            </p>
          </div>
        </Link>
      </div>
    </main>
  );
}
