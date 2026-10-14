"use client";

import { useEffect } from "react";

/** The public site is always light: drop the CRM's `dark` class when arriving from the CRM. */
export function SiteTheme() {
  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("dark");
    html.style.colorScheme = "light";
  }, []);
  return null;
}
