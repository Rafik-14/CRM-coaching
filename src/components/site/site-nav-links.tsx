"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SITE_NAV, isActive } from "./nav";

/** Desktop navigation. The active page gets a gold underline (not colour alone) and aria-current. */
export function SiteNavLinks() {
  const pathname = usePathname();
  return <NavList pathname={pathname} />;
}

export function NavList({ pathname }: { pathname?: string }) {
  return (
    <ul className="flex items-center gap-x-[clamp(0.5rem,0.8vw,1.375rem)]">
      {SITE_NAV.map((item) => {
        const active = pathname ? isActive(pathname, item.href) : false;
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center font-heading text-[13.5px] font-medium whitespace-nowrap 2xl:text-[14px] text-navy transition-colors duration-200 hover:text-gold",
                "after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:bg-gold after:transition-opacity after:duration-200",
                active ? "after:opacity-100" : "after:opacity-0",
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
