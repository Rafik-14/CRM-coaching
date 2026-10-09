import { HeartHandshake } from "lucide-react";

/** Logo block. Lives on the sidebar, which stays graphite in both themes. */
export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <HeartHandshake className="size-5" />
      </span>
      <span className="grid leading-tight">
        <span className="font-semibold text-sidebar-accent-foreground">CRM Coaching</span>
        <span className="text-xs text-sidebar-foreground/70">Espace coach</span>
      </span>
    </div>
  );
}
