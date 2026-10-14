import { cn } from "@/lib/utils";

// Stage colour keys are stored in the DB; they map to JG® brand tints (no extra hues).
const colors: Record<string, string> = {
  slate: "bg-muted text-foreground ring-border",
  blue: "bg-primary/8 text-heading ring-primary/20 dark:bg-primary/12",
  amber: "bg-gold/15 text-heading ring-gold/50",
  emerald: "bg-success/10 text-success ring-success/30",
  violet: "bg-primary text-primary-foreground ring-primary",
  rose: "bg-destructive/10 text-destructive ring-destructive/25",
};

export const stageDot: Record<string, string> = {
  slate: "bg-muted-foreground/50",
  blue: "bg-primary/60",
  amber: "bg-gold",
  emerald: "bg-success",
  violet: "bg-primary",
  rose: "bg-destructive/70",
};

export function StageBadge({ name, color }: { name: string | null; color: string | null }) {
  if (!name) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        colors[color ?? "slate"] ?? colors.slate,
      )}
    >
      {name}
    </span>
  );
}
