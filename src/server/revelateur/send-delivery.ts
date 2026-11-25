import "server-only";
import { db } from "@/server/db";
import { appUrl } from "@/server/email/config";
import { sendEmail } from "@/server/email/send";
import { attemptDelivery, VERIFY_HOURS, type DeliveryDeps, type DeliveryRow } from "./delivery";
import { DELIVERY_SUBJECT, deliveryEmail, REPORT_FILENAME, VERIFY_SUBJECT, verifyEmail } from "./emails";
import { buildReportPdf } from "./report";

/** Link of the address-confirmation e-mail. */
export const verifyLink = (token: string) => `${appUrl()}/revelateur/rapport/${token}`;

export function sendVerification(d: DeliveryRow, token: string) {
  return sendEmail({
    to: d.email,
    subject: VERIFY_SUBJECT,
    content: verifyEmail(verifyLink(token), d.firstName, VERIFY_HOURS),
    templateKey: "revelateur_verify",
    privateRecipient: true,
  });
}

export const deliveryDeps: DeliveryDeps = {
  buildPdf: buildReportPdf,
  send: (d, pdf) =>
    sendEmail({
      to: d.email,
      subject: DELIVERY_SUBJECT,
      content: deliveryEmail(),
      templateKey: "revelateur_report",
      attachments: [{ filename: REPORT_FILENAME, content: pdf, contentType: "application/pdf" }],
      privateRecipient: true,
    }),
};

export const runDelivery = (deliveryId: string) => attemptDelivery(db, deliveryId, deliveryDeps);
