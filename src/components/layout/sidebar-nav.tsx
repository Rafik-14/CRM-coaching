"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

/** Reads the URL to highlight the active link. Render inside <Suspense> (Cache Components). */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} onNavigate={onNavigate} />;
}

/** Plain links without active state: used as the static-shell fallback. */
export function NavLinks({ pathname, onNavigate }: { pathname?: string; onNavigate?: () => void }) {
  return (
    <nav className="grid gap-1 px-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              // Active: lighter navy + gold marker and icon (gold as accent only, never as text).
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary",
            )}
          >
            <Icon className={cn("size-4", active && "text-sidebar-primary")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
