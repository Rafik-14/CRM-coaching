import { getStages } from "@/server/queries/contacts";
import { ContactFormDialog } from "@/app/(coach)/contacts/contact-form-dialog";

/** "Nouveau contact" button + dialog. Render inside <Suspense> (reads the session). */
export async function NewContactButton({ className }: { className?: string }) {
  const stages = await getStages();
  return <ContactFormDialog stages={stages} triggerClassName={className} />;
}
