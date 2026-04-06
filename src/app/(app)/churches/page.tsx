import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches, churchMemberships, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Church } from "lucide-react";

export default async function ChurchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  interface UserChurch { id: string; name: string; slug: string; diocese: string | null; role: string; }
  let userChurches: UserChurch[] = [];
  try {
    const dbUser = await db.select().from(users).where(eq(users.supabaseId, user.id)).limit(1);
    if (dbUser.length > 0) {
      userChurches = await db
        .select({
          id: churches.id,
          name: churches.name,
          slug: churches.slug,
          diocese: churches.diocese,
          role: churchMemberships.role,
        })
        .from(churchMemberships)
        .innerJoin(churches, eq(churchMemberships.churchId, churches.id))
        .where(eq(churchMemberships.userId, dbUser[0].id));
    }
  } catch (err) { console.error("Failed to load data:", err); }

  return (
    <main id="main-content" className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-heading font-semibold">Your Churches</h1>
        <Link
          href="/churches/new"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Add Church
        </Link>
      </div>

      {userChurches.length === 0 ? (
        <div className="border border-border bg-card p-8 text-center">
          <Church className="h-12 w-12 mx-auto text-muted-foreground mb-4" strokeWidth={1.5} />
          <p className="text-muted-foreground mb-4">You haven&apos;t joined any churches yet.</p>
          <Link
            href="/churches/new"
            className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm bg-primary text-primary-foreground shadow hover:bg-primary/90 transition-colors"
          >
            Create Your First Church
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {userChurches.map((church: UserChurch) => (
            <Link
              key={church.id}
              href={`/churches/${church.id}/services`}
              className="block border border-border bg-card p-4 shadow-sm hover:border-primary transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-heading font-semibold">{church.name}</h2>
                  {church.diocese && (
                    <p className="text-sm text-muted-foreground">{church.diocese}</p>
                  )}
                </div>
                <span className="text-xs px-2 py-1 border border-border bg-background">
                  {church.role}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
