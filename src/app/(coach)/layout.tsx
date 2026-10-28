import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Brand } from "@/components/layout/brand";
import { NavLinks, SIDEBAR_LABEL, SidebarNav } from "@/components/layout/sidebar-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { GlobalSearch } from "@/components/layout/global-search";
import { NotificationsMenu } from "@/components/layout/notifications-menu";
import { NewContactButton } from "@/components/new-contact-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

// The CRM is private: never indexed.
export const metadata: Metadata = {
  title: { default: "CRM", template: "%s · Jérémy Galéa" },
  robots: { index: false, follow: false },
};

export default function CoachLayout({ children }: LayoutProps<"/">) {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen">
        {/* Desktop sidebar: a 64 px icon strip that opens over the page (no layout shift) when the mouse comes over
            it or the keyboard focus enters it, so the pages get the full width for their data. */}
        <div className="hidden w-16 shrink-0 md:block">
          <aside className="group/sb fixed inset-y-0 left-0 z-40 flex w-16 flex-col overflow-hidden bg-sidebar py-5 transition-[width,box-shadow] duration-200 ease-out hover:w-64 hover:shadow-[8px_0_24px_rgba(23,37,54,0.25)] focus-within:w-64 focus-within:shadow-[8px_0_24px_rgba(23,37,54,0.25)] motion-reduce:transition-none">
            <div className="px-[13px] pb-6">
              <Brand labelClassName={SIDEBAR_LABEL} />
            </div>
            <Suspense fallback={<NavLinks collapsible />}>
              <SidebarNav collapsible />
            </Suspense>

            <div className="mt-auto grid grid-cols-[minmax(0,1fr)] gap-1 px-3">
              <div className="min-w-0 pb-3">
                <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                  <NewContactButton className="w-full justify-start gap-3 overflow-hidden bg-ivory px-3 text-navy hover:bg-white" />
                </Suspense>
              </div>
              <Link
                href="/parametres"
                title="Mon compte"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <UserRound className="size-4 shrink-0" /> <span className={SIDEBAR_LABEL}>Mon compte</span>
              </Link>
            </div>
          </aside>
        </div>

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
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
