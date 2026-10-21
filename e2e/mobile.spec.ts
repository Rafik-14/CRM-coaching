import { expect, test } from "@playwright/test";
import { expectNoHorizontalScroll } from "./helpers";

/** Phone (Pixel 7): pages fit the screen, the menu works, the floating « Réserver » button appears. */

test.use({ storageState: { cookies: [], origins: [] } });

test.describe("téléphone", () => {
  for (const path of ["/", "/methode", "/accompagnements", "/evenements", "/contact", "/reserver", "/faq"]) {
    test(`${path} tient dans l’écran`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
    });
  }

  test("le menu s’ouvre et mène aux pages", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: /menu/i }).click();
    await page.getByRole("link", { name: "Événements" }).last().click();
    await expect(page).toHaveURL(/\/evenements/);
  });

  test("accueil : photo d’ouverture, accompagnements dépliables, bouton flottant", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Pourquoi vous plutôt qu’un autre/);
    // Floating button: hidden at the top, shown after scrolling past the photo.
    // Hidden from assistive tech while invisible, so it is found by its link rather than its role.
    const floating = page.locator('a[href*="source=accueil-flottant"]');
    await expect(floating).toHaveCSS("opacity", "0");
    await page.mouse.wheel(0, 1400);
    await expect(floating).toHaveCSS("opacity", "1");
    // Fold-out list: the first offer is open, the second opens on tap.
    const offers = page.locator("details");
    await expect(offers.first()).toHaveAttribute("open", "");
    await offers.nth(1).locator("summary").click();
    await expect(offers.nth(1)).toHaveAttribute("open", "");
  });
});
