"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * next-themes' inline script only matters in the server HTML (sets the theme before paint). When the provider
 * mounts in the browser (navigating from the public site to the CRM), React 19 warns about creating a <script>;
 * giving it a non-JavaScript type there silences that. Hydration differences are already suppressed on it.
 */
const scriptProps = typeof window === "undefined" ? undefined : { type: "text/plain" };

/** Light / dark theme via a `dark` class on <html>; follows the OS setting by default. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={scriptProps}
    >
      {children}
    </NextThemesProvider>
  );
}
