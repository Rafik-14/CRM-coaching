import { cn } from "@/lib/utils";
import { Illustration3D } from "./illustration-3d";
import type { IllustrationName } from "./registry";

/** Friendly empty state: 3D illustration + headline + one line + optional action. */
export function EmptyState({
  illustration,
  title,
  description,
  action,
  size = 150,
  layout = "vertical",
  className,
}: {
  illustration: IllustrationName;
  title: string;
  description?: string;
  action?: React.ReactNode;
  size?: number;
  layout?: "vertical" | "horizontal";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-6 py-6",
        layout === "vertical" ? "flex-col text-center" : "flex-col text-center sm:flex-row sm:text-left",
        className,
      )}
    >
      <Illustration3D name={illustration} alt="" height={size} />
      <div className={cn("grid max-w-sm gap-1.5", layout === "vertical" && "justify-items-center")}>
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}
