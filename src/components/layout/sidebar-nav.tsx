"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

/**
 * Labels of the desktop sidebar: hidden while it is a thin icon strip, shown once it opens
 * (mouse over it, or keyboard focus inside it — not a mouse click, so it closes after navigating). The parent <aside> carries the `group/sb` class.
 */
export const SIDEBAR_LABEL =
  "whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover/sb:opacity-100 group-has-[:focus-visible]/sb:opacity-100";

/** Reads the URL to highlight the active link. Render inside <Suspense> (Cache Components). */
export function SidebarNav({ onNavigate, collapsible }: { onNavigate?: () => void; collapsible?: boolean }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} onNavigate={onNavigate} collapsible={collapsible} />;
}

/** Plain links without active state: used as the static-shell fallback. */
export function NavLinks({
  pathname,
  onNavigate,
  collapsible,
}: {
  pathname?: string;
  onNavigate?: () => void;
  /** Desktop icon strip: labels only show once the sidebar opens. */
  collapsible?: boolean;
}) {
  return (
    <nav className="grid gap-1 px-3">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = !!pathname && (pathname === href || pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            title={collapsible ? label : undefined}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              // Active: lighter navy + gold marker and icon (gold as accent only, never as text).
              active &&
                "bg-sidebar-accent text-sidebar-accent-foreground before:absolute before:top-2 before:bottom-2 before:left-0 before:w-0.5 before:rounded-full before:bg-sidebar-primary",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active && "text-sidebar-primary")} />
            <span className={collapsible ? SIDEBAR_LABEL : undefined}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
