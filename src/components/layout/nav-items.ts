import { CalendarDays, Columns3, Home, Settings, Users } from "lucide-react";

/**
 * Simplified CRM menu (Jérémy, Nov. 2026): five entries. The analytics page, tasks and events are no longer in the
 * menu: tasks and events are reached from the Agenda.
 * `also` lists the pages without a menu entry that keep their parent entry highlighted.
 */
export const navItems = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home, also: ["/analyses"] },
  { href: "/contacts", label: "Clients", icon: Users, also: [] },
  { href: "/pipeline", label: "Pipeline", icon: Columns3, also: [] },
  { href: "/calendrier", label: "Agenda", icon: CalendarDays, also: ["/taches", "/mes-evenements"] },
  { href: "/parametres", label: "Réglages", icon: Settings, also: [] },
] as const;
