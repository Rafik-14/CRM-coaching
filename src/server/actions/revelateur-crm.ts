"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { activityLog } from "@/server/db/schema";
import { requireCoach } from "@/server/dal";
import { logEvent, setCallbackStatus } from "@/server/revelateur/crm";
import { queueResend } from "@/server/revelateur/delivery";
import { runDelivery } from "@/server/revelateur/send-delivery";
import { isUserError } from "@/server/revelateur/session";

/** CRM actions on the test (annexe 07): coach only, every sensitive action is recorded in the activity log. */
export type CrmResult = { ok: boolean; message: string };

export async function updateCallback(id: string, status: "in_progress" | "completed" | "cancelled", outcome: string): Promise<CrmResult> {
  await requireCoach();
  const cb = await setCallbackStatus(db, id, status, outcome);
  if (!cb) return { ok: false, message: "Cette demande est déjà clôturée." };
  await db.insert(activityLog).values({ entity: "revelateur_callback", entityId: id, action: `callback_${status}` });
  revalidatePath("/test-signature", "layout");
  return { ok: true, message: status === "in_progress" ? "Rappel marqué en cours." : status === "completed" ? "Rappel clôturé." : "Demande annulée." };
}

export async function resendReport(sessionId: string, newEmail: string): Promise<CrmResult> {
  await requireCoach();
  try {
    const d = await queueResend(db, sessionId, newEmail.trim() || null);
    const r = await runDelivery(d.id);
    await logEvent(db, { type: newEmail.trim() ? "ADDRESS_CORRECTED" : "REPORT_RESENT", key: `RESEND:${d.id}:${Date.now()}`, sessionId });
    await db.insert(activityLog).values({ entity: "revelateur_session", entityId: sessionId, action: newEmail.trim() ? "report_address_corrected" : "report_resent" });
    revalidatePath("/test-signature", "layout");
    if (r === "sent") return { ok: true, message: "Rapport envoyé." };
    if (r === "no_report") return { ok: false, message: "Le rapport n'a pas pu être produit (contrôle éditorial). Rien n'a été envoyé." };
    return { ok: false, message: "L'envoi a échoué ; une nouvelle tentative est programmée." };
  } catch (e) {
    return { ok: false, message: isUserError(e) ? (e as Error).message : "Une erreur est survenue." };
  }
}
