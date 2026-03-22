"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignOutButton } from "@/components/sign-out-button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  href: string;
  label: string;
  iconName: string;
}

// We pass icon names as strings and render them here to keep the server component simple
import { Calendar, Users, Music, FileText, Settings } from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  Calendar,
  Users,
  Music,
  FileText,
  Settings,
};

function NavLinks({
  navItems,
  pathname,
  onNavigate,
}: {
  navItems: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1 flex-1">
      {navItems.map((item) => {
        const Icon = iconMap[item.iconName] || Calendar;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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
                : "hover:bg-sidebar-accent text-foreground"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function ChurchSidebar({
  churchId,
  churchName,
  userRole,
  userEmail,
  navItems,
}: {
  churchId: string;
  churchName: string;
  userRole: string;
  userEmail: string;
  navItems: NavItem[];
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const roleLabel =
    userRole === "ADMIN" ? "Admin" :
    userRole === "EDITOR" ? "Editor" : "Member";

  const sidebarContent = (
    <>
      <Link
        href="/churches"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        onClick={() => setMobileOpen(false)}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
        All Churches
      </Link>

      <h2 className="font-heading text-lg font-semibold mb-1 truncate" title={churchName}>
        {churchName}
      </h2>
      <p className="text-xs text-muted-foreground mb-6">{roleLabel}</p>

      <NavLinks
        navItems={navItems}
        pathname={pathname}
        onNavigate={() => setMobileOpen(false)}
      />

      <div className="mt-auto pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2 truncate">{userEmail}</p>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
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

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 border-r border-border bg-sidebar p-4 flex-col">
        {sidebarContent}
      </aside>
    </>
  );
}
