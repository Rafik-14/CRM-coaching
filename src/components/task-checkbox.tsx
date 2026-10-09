"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTask } from "@/server/actions/contacts";

export function TaskCheckbox({ id, done }: { id: string; done: boolean }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimisticDone}
      aria-label={optimisticDone ? "Marquer comme à faire" : "Marquer comme fait"}
      onClick={() =>
        startTransition(async () => {
          setOptimisticDone(!optimisticDone);
          await toggleTask(id, !optimisticDone);
        })
      }
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
        optimisticDone ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary",
      )}
    >
      {optimisticDone && <Check className="size-3.5" />}
    </button>
  );
}
