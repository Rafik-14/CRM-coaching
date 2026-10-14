import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** JG® line-icon mark: thin navy icon on a soft surface, with the brand's short gold line. */
export function IconMark({ icon: Icon, size = "md", className }: { icon: LucideIcon; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span className={cn("grid shrink-0 justify-items-center gap-1.5", className)} aria-hidden>
      <span
        className={cn(
          "flex items-center justify-center rounded-xl bg-muted text-heading ring-1 ring-border",
          size === "sm" && "size-10",
          size === "md" && "size-14",
          size === "lg" && "size-20",
        )}
      >
        <Icon strokeWidth={1.5} className={cn(size === "sm" && "size-5", size === "md" && "size-6", size === "lg" && "size-9")} />
      </span>
      <span className="h-0.5 w-6 rounded-full bg-gold" />
    </span>
  );
}

/** Empty state: line icon + headline + one line + optional action. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  layout = "vertical",
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  layout?: "vertical" | "horizontal";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-5 py-6",
        layout === "vertical" ? "flex-col text-center" : "flex-col text-center sm:flex-row sm:text-left",
        className,
      )}
    >
      <IconMark icon={icon} size={layout === "vertical" ? "lg" : "md"} />
      <div className={cn("grid max-w-sm gap-1.5", layout === "vertical" && "justify-items-center")}>
        <p className="font-heading text-base font-semibold text-heading">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
