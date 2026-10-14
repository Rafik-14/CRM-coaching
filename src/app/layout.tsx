import type { Metadata } from "next";
import { Lato, Montserrat } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// JG® brand typefaces: Montserrat for headings and buttons, Lato for text (no third typeface).
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3100"),
  title: { default: "Jérémy Galéa · Méthode JG®", template: "%s · Jérémy Galéa" },
  description:
    "Coaching en stratégie professionnelle et identité. Je vous aide à rendre votre valeur claire, crédible et évidente — au moment où une décision se prend.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: in the CRM, next-themes sets the `dark` class before React hydrates.
    <html lang="fr" suppressHydrationWarning className={`${montserrat.variable} ${lato.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
