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
import { Home, Calendar, Users, Music, FileText, Settings } from "lucide-react";

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
    <nav className="flex flex-col flex-1">
      {navGroups.map((group, gi) => (
        <div key={gi}>
          {gi > 0 && <div className="border-t border-border my-3" />}
          {group.label && (
            <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-1 px-2">
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
                    "flex items-center gap-2 px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : isMuted
                      ? "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                      : "hover:bg-sidebar-accent text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
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
      <h2 className="font-heading text-lg font-semibold mb-1 truncate" title={churchName}>
        {churchName}
      </h2>
      <p className="text-xs text-muted-foreground mb-6">{roleLabel}</p>

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
              className="p-1 hover:bg-sidebar-accent transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-56 p-4 flex flex-col">
            {sidebarContent}
          </SheetContent>
        </Sheet>
        <span className="font-heading font-semibold truncate">{churchName}</span>
      </div>
      <aside className="hidden md:flex w-56 border-r border-border bg-sidebar p-4 flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
