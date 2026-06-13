"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Home, Calendar, Users, Music, FileText, Settings, LayoutGrid } from "lucide-react";
import { Ornament } from "@/components/ui/ornament";

const ICON_STROKE = 1.5;
const SIDEBAR_WIDTH = "w-60";

interface NavItem {
  href: string;
  label: string;
  iconName: string;
  exactMatch?: boolean;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Home,
  Calendar,
  Users,
  Music,
  FileText,
  Settings,
  LayoutGrid,
};

function NavGroups({
  navGroups,
  pathname,
  onNavigate,
}: {
  navGroups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Church navigation" className="flex flex-col flex-1">
      {navGroups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="border-t border-border my-3" />}
          {group.label && (
            <p className="small-caps text-xs text-muted-foreground mb-1 px-2">
              {group.label}
            </p>
          )}
          <div className="flex flex-col gap-1">
            {group.items.map((item) => {
              const Icon = iconMap[item.iconName] || Calendar;
              const isActive = item.exactMatch
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              const isMuted = !!group.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-sm px-2 py-2.5 md:py-1.5 text-sm transition-colors min-h-[44px] md:min-h-0",
                    isActive
                      ? "bg-primary/[0.07] text-primary font-medium"
                      : isMuted
                      ? "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      : "hover:bg-sidebar-accent text-foreground"
                  )}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rotate-45 bg-primary"
                    />
                  )}
                  <Icon className="h-4 w-4" strokeWidth={ICON_STROKE} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function ChurchSidebar({
  churchName,
  userRole,
  userEmail,
  navGroups,
}: {
  churchId: string;
  churchName: string;
  userRole: string;
  userEmail: string;
  navGroups: NavGroup[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel =
    userRole === "ADMIN" ? "Admin" :
    userRole === "EDITOR" ? "Editor" : "Member";

  const sidebarContent = (
    <>
      <div className="mb-5 pb-4 border-b border-border/70">
        <Link
          href="/dashboard"
          title="All churches"
          onClick={() => setMobileOpen(false)}
          className="block hover:text-primary transition-colors"
        >
          <Ornament
            variant="fleur-de-lis"
            className="my-0 mb-2 justify-start text-primary/75 [&_span]:h-6 [&_span]:w-6"
          />
          <h2 className="font-heading text-lg font-semibold leading-tight text-balance">
            {churchName}
          </h2>
        </Link>
        <p className="small-caps text-xs text-muted-foreground mt-0.5">{roleLabel}</p>
      </div>

      <NavGroups
        navGroups={navGroups}
        pathname={pathname}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="mt-auto pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2 truncate">{userEmail}</p>
        <Link
          href="/account"
          className="block text-xs text-muted-foreground hover:text-foreground mb-2 underline hover:no-underline"
        >
          Account settings
        </Link>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <>
      <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-sidebar">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button
              className="p-2 hover:bg-sidebar-accent transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" strokeWidth={ICON_STROKE} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className={cn(SIDEBAR_WIDTH, "p-4 flex flex-col")}>
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <span className="font-heading font-semibold truncate">{churchName}</span>
      </div>
      <aside className={cn("hidden md:flex border-r border-border bg-sidebar p-4 flex-col", SIDEBAR_WIDTH)}>
        {sidebarContent}
      </aside>
    </>
  );
}
