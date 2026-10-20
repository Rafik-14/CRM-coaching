"use client";

import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { markOnlineNotificationsSeen } from "@/server/actions/notifications";

/**
 * The bell's menu. When it closes after showing online events (bookings, moves, cancellations),
 * they are marked as seen: marking on open would re-render the page and empty the list being read.
 */
export function NotificationsDropdown({ hasOnline, children }: { hasOnline: boolean; children: React.ReactNode }) {
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open && hasOnline) markOnlineNotificationsSeen().catch(() => {});
      }}
    >
      {children}
    </DropdownMenu>
  );
}
