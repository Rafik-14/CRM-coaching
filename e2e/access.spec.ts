import { expect, test } from "@playwright/test";
import { visitor } from "./helpers";

/** Security: the CRM is private, private links can't be guessed, removed features stay removed. */

test.describe("accès et sécurité", () => {
  test("les pages du CRM renvoient vers la connexion sans session", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    for (const path of ["/tableau-de-bord", "/contacts", "/pipeline", "/calendrier", "/mes-evenements", "/analyses", "/parametres"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/connexion/);
    }
    await context.close();
  });

  test("les fichiers et exports du CRM sont refusés sans session", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    for (const path of ["/api/fichiers/00000000-0000-4000-8000-000000000000", "/api/mes-evenements/00000000-0000-4000-8000-000000000000/export"]) {
      const res = await page.request.get(path, { maxRedirects: 0 });
      expect([307, 308, 401], path).toContain(res.status());
    }
    await context.close();
  });

  test("un mauvais mot de passe ne connecte pas", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    await page.goto("/connexion");
    await page.locator('input[name="email"]').fill("coach@demo.test");
    await page.locator('input[name="password"]').fill("pas-le-bon-mot-de-passe");
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.getByRole("alert").or(page.getByText(/incorrect|invalide/i)).first()).toBeVisible();
    await context.close();
  });

  test("les liens privés inventés ne donnent accès à rien", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    const fake = "A".repeat(43);
    await page.goto(`/rdv/${fake}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/invalide/i);
    await page.goto(`/inscription/${fake}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/invalide/i);
    const ics = await page.request.get(`/inscription/${fake}/agenda`);
    expect(ics.status()).toBe(404);
    const feed = await page.request.get(`/api/agenda/${fake}.ics`);
    expect(feed.status()).toBe(404);
    await context.close();
  });

  test("la facturation et le paiement en ligne n’existent plus", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    for (const path of ["/paiement/abc", "/api/webhooks/stripe"]) {
      const res = await page.request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(404);
    }
    await context.close();
  });

  test("le menu du CRM ne propose pas de factures", async ({ page }) => {
    await page.goto("/tableau-de-bord");
    await expect(page.getByRole("link", { name: "Événements" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Factures" })).toHaveCount(0);
  });
});
