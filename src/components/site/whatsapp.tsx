import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Jérémy's WhatsApp: a quick way to reach him without filling in the contact form. Swiss number (Jérémy, V4). No pre-filled text: the visitor writes what they want, and Jérémy's welcome message
 * (« Bonjour et bienvenue 👋 … ») is sent by WhatsApp Business itself, set up in the app, not by the site.
 */
export const WHATSAPP = {
  display: "+41 783 251 318",
  number: "41783251318",
} as const;

/** Plain wa.me link (no WhatsApp script on the site, so nothing to declare in the cookie banner). */
export const whatsappHref = `https://wa.me/${WHATSAPP.number}`;

/** WhatsApp green, used only for WhatsApp buttons so they are recognised at a glance. */
const WHATSAPP_BUTTON =
  "inline-flex items-center gap-2 rounded-[7px] bg-[#25D366] font-heading font-bold text-[#0b3d22] transition-colors duration-200 hover:bg-[#1fb857] [&_svg]:size-5 [&_svg]:shrink-0";

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
