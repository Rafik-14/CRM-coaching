import { CalendarDays, Home, Settings, Users } from "lucide-react";

/**
 * Simplified CRM menu (Jérémy, Nov. 2026): four entries. The pipeline board, the analytics page, tasks and events are
 * no longer in the menu: clients carry a status instead of a pipeline, and tasks and events are reached from the Agenda.
 * `also` lists the pages without a menu entry that keep their parent entry highlighted.
 */
export const navItems = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home, also: ["/analyses"] },
  { href: "/contacts", label: "Clients", icon: Users, also: ["/pipeline"] },
  { href: "/calendrier", label: "Agenda", icon: CalendarDays, also: ["/taches", "/mes-evenements"] },
  { href: "/parametres", label: "Réglages", icon: Settings, also: [] },
] as const;
