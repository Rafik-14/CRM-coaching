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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Faites la différence quand ça compte/);
    // Floating action button: one round button that opens « Réserver un échange » and « WhatsApp ».
    const fab = page.getByRole("button", { name: /Contacter Jérémy Galéa/ });
    const actions = page.locator("#contact-fab-actions");
    await expect(actions).toBeHidden();
    await fab.click();
    await expect(actions.getByRole("link", { name: "Réserver un échange" })).toHaveAttribute("href", /source=bouton-flottant/);
    await expect(actions.getByRole("link", { name: /^WhatsApp/ })).toHaveAttribute("href", "https://wa.me/41783251318");
    await page.keyboard.press("Escape");
    await expect(actions).toBeHidden();
    // Fold-out list: the first offer is open, the second opens on tap.
    const offers = page.locator("details");
    await expect(offers.first()).toHaveAttribute("open", "");
    await offers.nth(1).locator("summary").click();
    await expect(offers.nth(1)).toHaveAttribute("open", "");
  });
});
