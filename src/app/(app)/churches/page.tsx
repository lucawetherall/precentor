import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { churches, churchMemberships, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Plus, Church } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge, type StatusKind } from "@/components/status-badge";

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
  } catch (err) { logger.error("[churches/page] Failed to load data", err); }

  return (
    <main id="main-content" className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <PageHeader
        eyebrow="Parishes"
        title="Your Churches"
        subtitle="The parishes you sing for or look after"
        actions={
          <Link
            href="/churches/new"
            className={buttonVariants({ variant: "default", size: "default" })}
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Add Church
          </Link>
        }
      />

      {userChurches.length === 0 ? (
        <EmptyState
          icon={Church}
          title="No churches yet"
          description="Create your first church to start planning services."
          action={
            <Link
              href="/churches/new"
              className={buttonVariants({ variant: "default", size: "default" })}
            >
              Create Your First Church
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4">
          {userChurches.map((church: UserChurch) => (
            <Link
              key={church.id}
              href={`/churches/${church.id}/services`}
              className="block rounded-md border border-border border-t-2 border-t-primary/70 bg-card p-5 shadow-sm transition-all hover:border-primary hover:border-t-primary hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex items-center gap-3">
                  <Church className="h-5 w-5 text-primary flex-shrink-0" strokeWidth={1.5} aria-hidden="true" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-heading font-semibold truncate leading-tight">{church.name}</h2>
                    {church.diocese && (
                      <p className="text-sm text-muted-foreground italic truncate">{church.diocese}</p>
                    )}
                  </div>
                </div>
                <StatusBadge status={church.role.toLowerCase() as StatusKind} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
