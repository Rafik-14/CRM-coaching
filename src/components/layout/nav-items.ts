import { CalendarDays, ChartColumn, CheckSquare, Columns3, LayoutDashboard, Settings, Users } from "lucide-react";

export const navItems = [
  { href: "/tableau-de-bord", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/pipeline", label: "Pipeline", icon: Columns3 },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/taches", label: "Tâches", icon: CheckSquare },
  { href: "/analyses", label: "Analyses", icon: ChartColumn },
  { href: "/parametres", label: "Paramètres", icon: Settings },
] as const;
