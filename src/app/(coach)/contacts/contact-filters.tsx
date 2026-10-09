"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all";

export function ContactFilters({
  stages,
  q,
  stage,
}: {
  stages: { id: string; name: string }[];
  q: string;
  stage: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);

  function update(next: { q?: string; etape?: string }) {
    const params = new URLSearchParams();
    const nq = next.q ?? search;
    const ne = next.etape ?? stage;
    if (nq) params.set("q", nq);
    if (ne && ne !== ALL) params.set("etape", ne);
    startTransition(() => router.replace(params.size ? `${pathname}?${params}` : pathname));
  }

  // Debounce typing
  useEffect(() => {
    if (search === q) return;
    const t = setTimeout(() => update({ q: search }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Rechercher un nom, un e-mail, un téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Rechercher"
        />
        {pending && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <Select value={stage || ALL} onValueChange={(v) => update({ etape: v })}>
        <SelectTrigger className="w-full sm:w-52" aria-label="Filtrer par étape">
          <SelectValue placeholder="Toutes les étapes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Toutes les étapes</SelectItem>
          {stages.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
