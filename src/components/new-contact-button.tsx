import { getStages, listPartnerOptions } from "@/server/queries/contacts";
import { getBusinessSettings } from "@/server/business";
import { ContactFormDialog } from "@/app/(coach)/contacts/contact-form-dialog";

/** "Nouveau contact" button + dialog. Render inside <Suspense> (reads the session). */
export async function NewContactButton({ className }: { className?: string }) {
  const [stages, partners, business] = await Promise.all([getStages(), listPartnerOptions(), getBusinessSettings()]);
  return (
    <ContactFormDialog stages={stages} partners={partners} defaultCurrency={business.currency} triggerClassName={className} />
  );
}
