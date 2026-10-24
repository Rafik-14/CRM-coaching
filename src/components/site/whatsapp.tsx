import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Jérémy's WhatsApp: a quick way to reach him without filling in the contact form. */
export const WHATSAPP = {
  display: "+33 6 99 18 65 48",
  number: "33699186548",
  message: "Bonjour Jérémy, je souhaite échanger avec vous au sujet de ma situation.",
} as const;

/** Plain wa.me link (no WhatsApp script on the site, so nothing to declare in the cookie banner). */
export const whatsappHref = `https://wa.me/${WHATSAPP.number}?text=${encodeURIComponent(WHATSAPP.message)}`;

/** WhatsApp green, used only for this button so it is recognised at a glance. */
const WHATSAPP_BUTTON =
  "inline-flex items-center gap-2 rounded-[7px] bg-[#25D366] font-heading font-bold text-[#0b3d22] transition-colors duration-200 hover:bg-[#1fb857] [&_svg]:size-5 [&_svg]:shrink-0";

/** Small button, bottom right of every page. On phones it sits above the gold « Réserver » button of the home page. */
export function WhatsAppFloat() {
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Écrire à Jérémy Galéa sur WhatsApp (nouvel onglet)"
      className={cn(
        WHATSAPP_BUTTON,
        "fixed right-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+3.75rem)] z-30 h-12 px-4 text-[14px] shadow-[0_8px_24px_rgba(23,37,54,0.25)] md:right-6 md:bottom-6",
      )}
    >
      <MessageCircle aria-hidden strokeWidth={2} />
      WhatsApp
    </a>
  );
}

/** Larger button, for the Contact page. */
export function WhatsAppButton({ className }: { className?: string }) {
  return (
    <a
      href={whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(WHATSAPP_BUTTON, "min-h-[52px] justify-center px-6 text-[15px]", className)}
    >
      <MessageCircle aria-hidden strokeWidth={2} />
      Écrire sur WhatsApp
      <span className="sr-only">(nouvel onglet)</span>
    </a>
  );
}
