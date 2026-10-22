import { expect, test as setup } from "@playwright/test";
import { COACH_EMAIL, COACH_PASSWORD } from "./helpers";

/** Logs in once as the coach and keeps the session for the CRM journeys. */
setup("coach login", async ({ page }) => {
  expect(COACH_PASSWORD, "SEED_COACH_PASSWORD must be set (.env locally, workflow env in CI)").not.toBe("");
  await page.goto("/connexion");
  await page.locator('input[name="email"]').fill(COACH_EMAIL);
  await page.locator('input[name="password"]').fill(COACH_PASSWORD);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/tableau-de-bord/);
  await page.context().storageState({ path: "e2e/.auth/coach.json" });
});
