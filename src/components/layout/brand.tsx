import Image from "next/image";
import { cn } from "@/lib/utils";

/** Logo block (JG® monogram + name). Lives on the navy sidebar in both themes. */
export function Brand({ labelClassName }: { labelClassName?: string }) {
  return (
    <div className="flex items-center gap-3">
      <Image src="/brand/jg-monogram-white.svg" alt="" width={38} height={40} unoptimized priority className="shrink-0" />
      <span className={cn("grid leading-tight", labelClassName)}>
        <span className="font-heading text-[0.95rem] font-semibold tracking-[0.14em] text-sidebar-accent-foreground">
          JÉRÉMY GALÉA
        </span>
        <span className="mt-0.5 text-[0.7rem] tracking-[0.08em] text-sidebar-foreground/70 uppercase">
          Méthode JG® · CRM
        </span>
      </span>
    </div>
  );
}
