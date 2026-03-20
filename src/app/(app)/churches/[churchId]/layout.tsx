import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { churches, churchMemberships, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { Calendar, Music, Users, FileText, Settings, ChevronLeft } from "lucide-react";

interface Props {
  children: React.ReactNode;
  params: Promise<{ churchId: string }>;
}

export default async function ChurchLayout({ children, params }: Props) {
  const { churchId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let church: any = null;
  let membership: any = null;

  try {
    const dbUser = await db.select().from(users).where(eq(users.supabaseId, user.id)).limit(1);
    if (dbUser.length > 0) {
      const result = await db
        .select({
          church: churches,
          membership: churchMemberships,
        })
        .from(churchMemberships)
        .innerJoin(churches, eq(churchMemberships.churchId, churches.id))
        .where(
          and(
            eq(churchMemberships.userId, dbUser[0].id),
            eq(churchMemberships.churchId, churchId)
          )
        )
        .limit(1);

      if (result.length > 0) {
        church = result[0].church;
        membership = result[0].membership;
      }
    }
  } catch { /* DB not available */ }

  if (!church) {
    redirect("/churches");
  }

  const navItems = [
    { href: `/churches/${churchId}/sundays`, label: "Sundays", icon: Calendar },
    { href: `/churches/${churchId}/rota`, label: "Rota", icon: Users },
    { href: `/churches/${churchId}/repertoire`, label: "Repertoire", icon: Music },
    { href: `/churches/${churchId}/service-sheets`, label: "Service Sheets", icon: FileText },
    { href: `/churches/${churchId}/members`, label: "Members", icon: Users },
    { href: `/churches/${churchId}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-border bg-sidebar p-4 flex flex-col">
        <Link href="/churches" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          All Churches
        </Link>

        <h2 className="font-heading text-lg font-semibold mb-1 truncate">{church.name}</h2>
        <p className="text-xs text-muted-foreground mb-6">{membership.role}</p>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-sidebar-accent transition-colors"
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1">{children}</main>
    </div>
  );
}
