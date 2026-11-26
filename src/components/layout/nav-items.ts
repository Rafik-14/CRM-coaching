import { CalendarDays, Columns3, Home, Settings, Sparkles, Users } from "lucide-react";

/**
 * Simplified CRM menu (Jérémy, Nov. 2026): five entries, plus « Révélateur » for the test. The analytics page, tasks
 * and events are no longer in the menu: tasks and events are reached from the Agenda.
 * `also` lists the pages without a menu entry that keep their parent entry highlighted.
 */
export const navItems = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home, also: ["/analyses"] },
  { href: "/contacts", label: "Clients", icon: Users, also: [] },
  { href: "/pipeline", label: "Pipeline", icon: Columns3, also: [] },
  { href: "/calendrier", label: "Agenda", icon: CalendarDays, also: ["/taches", "/mes-evenements"] },
  // Le Révélateur (Test Signature JG®): tests, callback requests, discovery calls (annexe 07).
  { href: "/test-signature", label: "Révélateur", icon: Sparkles, also: [] },
  { href: "/parametres", label: "Réglages", icon: Settings, also: [] },
] as const;
