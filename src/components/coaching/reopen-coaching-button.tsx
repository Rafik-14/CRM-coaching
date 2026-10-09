"use client";

import { useTransition } from "react";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { reopenCoaching } from "@/server/actions/coaching";

export function ReopenCoachingButton({ contactId }: { contactId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await reopenCoaching(contactId);
          toast.success("Accompagnement repris");
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reprendre
    </Button>
  );
}
