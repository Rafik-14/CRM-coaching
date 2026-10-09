import { Suspense } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Brand } from "@/components/layout/brand";
import { NavLinks, SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { NewContactButton } from "@/components/new-contact-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function CoachLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar py-5 md:flex">
        <div className="px-5 pb-6">
          <Brand />
        </div>
        <Suspense fallback={<NavLinks />}>
          <SidebarNav />
        </Suspense>

        <div className="mt-auto grid gap-1 px-3">
          <div className="px-1 pb-3">
            <Suspense fallback={<Skeleton className="h-9 w-full" />}>
              <NewContactButton className="w-full" />
            </Suspense>
          </div>
          <Link
            href="/parametres"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <UserRound className="size-4" /> Mon compte
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur md:px-8">
          <MobileNav />
          <GlobalSearch />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
              <NotificationsMenu />
            </Suspense>
            <Suspense fallback={<Skeleton className="h-9 w-36" />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
