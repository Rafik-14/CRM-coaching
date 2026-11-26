import { PROFILE_NAMES, type ProfileCode } from "@/lib/revelateur/scoring";

/** Display labels of the test's CRM. */
export const CONFIG_LABEL: Record<string, string> = {
  SINGLE_PROFILE: "Profil unique",
  JOINT: "Conjointe",
  PLURAL: "Plurielle",
  VALUE_EMBODIED: "Valeur incarnée",
  DEVELOPED: "Développée",
};

export const configText = (code: string | null, profile: string | null) =>
  !code ? "—" : code === "SINGLE_PROFILE" && profile ? `${profile.replace("P", "Profil ")} · ${PROFILE_NAMES[profile as ProfileCode]}` : (CONFIG_LABEL[code] ?? code);

export const DELIVERY_LABEL: Record<string, string> = {
  awaiting_verification: "Adresse à confirmer",
  awaiting_report: "Rapport en préparation",
  sending: "Envoi en cours",
  sent: "Rapport envoyé",
  failed: "Échec d'envoi",
};

export const CALLBACK_LABEL: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Effectué",
  converted: "Converti en rendez-vous",
  cancelled: "Annulé",
};

export const EVENT_LABEL: Record<string, string> = {
  TEST_COMPLETED: "Test terminé",
  REPORT_SENT: "Rapport envoyé",
  REPORT_RESENT: "Rapport renvoyé",
  ADDRESS_CORRECTED: "Adresse corrigée et rapport renvoyé",
  CALLBACK_REQUESTED: "Demande de rappel",
  CALLBACK_COMPLETED: "Rappel effectué",
  CALLBACK_CANCELLED: "Demande de rappel annulée",
  APPOINTMENT_BOOKED: "Appel découverte réservé",
};

export const PERIODS = [
  { key: "tout", label: "Depuis le lancement", days: null },
  { key: "7j", label: "7 jours", days: 7 },
  { key: "30j", label: "30 jours", days: 30 },
  { key: "90j", label: "90 jours", days: 90 },
] as const;

export const fmtDate = (d: Date | null | undefined) =>
  d ? d.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : "—";

/** Start of the selected period (undefined = since launch). */
export const periodStart = (days: number | null) => (days ? new Date(Date.now() - days * 86_400_000) : undefined);
