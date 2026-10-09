import Form from "next/form";
import { Search } from "lucide-react";

/** Searches contacts (name, e-mail, phone) from anywhere. */
export function GlobalSearch() {
  return (
    <Form action="/contacts" className="relative w-full max-w-md" role="search">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name="q"
        type="search"
        placeholder="Rechercher un contact, un e-mail…"
        aria-label="Rechercher un contact"
        className="h-10 w-full rounded-full border border-transparent bg-muted pr-4 pl-10 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring/60"
      />
    </Form>
  );
}
