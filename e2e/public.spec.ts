import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { collectErrors, visitor } from "./helpers";

/** The public website: every page opens, without errors, and passes the automatic accessibility checks. */

const PAGES = [
  "/",
  "/methode",
  "/accompagnements",
  "/accompagnements/parcours-signature",
  "/pour-qui",
  "/transformations",
  "/evenements",
  "/a-propos",
  "/le-chant-du-merle",
  "/contact",
  "/reserver",
  "/faq",
  "/cgv",
  "/mentions-legales",
  "/confidentialite",
  "/cookies",
];

test.describe("site public", () => {
  for (const path of PAGES) {
    test(`page ${path}`, async ({ browser }) => {
      const { page, context } = await visitor(browser);
      const errors = collectErrors(page);
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page).toHaveTitle(/.+/);
      // Accessibility: no serious or critical problem found by axe (contrast, labels, names, structure…).
      const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const serious = a11y.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`), "accessibilité").toEqual([]);
      expect(errors, "erreurs dans le navigateur").toEqual([]);
      await context.close();
    });
  }

  test("le menu mène à chaque page", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    for (const label of ["La Méthode JG®", "Accompagnements", "Événements", "Contact"]) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await context.close();
  });

  test("plan du site et robots", async ({ request }) => {
    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain("/evenements");
    expect((await request.get("/robots.txt")).status()).toBe(200);
  });

  test("aucun paiement proposé dans les conditions générales", async ({ browser }) => {
    const { page, context } = await visitor(browser);
    await page.goto("/cgv");
    await expect(page.getByText("Aucun paiement n’est demandé sur le site.")).toBeVisible();
    await context.close();
  });
});
