import { expect, type Browser, type Page } from "@playwright/test";

/** Shared helpers for the end-to-end journeys. */

export const COACH_EMAIL = process.env.SEED_COACH_EMAIL ?? "coach@demo.test";
export const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD ?? "";

/** Unique suffix so every run creates its own records (the database is shared between journeys). */
export const runId = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
export const testEmail = (name: string) => `${name}.${runId()}@example.test`;

/**
 * A visitor (no session) with its own IP: the public forms are rate-limited per IP,
 * and each journey must start with a fresh allowance.
 */
export async function visitor(browser: Browser) {
  const ip = `10.${rnd()}.${rnd()}.${rnd()}`;
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] }, extraHTTPHeaders: { "x-forwarded-for": ip } });
  return { context, page: await context.newPage() };
}
const rnd = () => Math.floor(Math.random() * 250) + 1;

/** Fills a form field found by its visible label. */
export async function fill(page: Page, label: string | RegExp, value: string) {
  await page.getByLabel(label, { exact: typeof label === "string" }).fill(value);
}

/** The site's consent checkbox (« J’accepte que mes informations soient utilisées… »). */
export async function acceptConsent(page: Page) {
  await page.getByRole("checkbox", { name: /J’accepte/ }).check();
}

/** No sideways scrolling: the page fits the screen width. */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "page wider than the screen").toBeLessThanOrEqual(1);
}

/** Collects browser errors during a test (failed scripts, React errors). */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Download the React DevTools|favicon/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

/** Opens a contact's full page (history tab by default) from the contacts list, found by e-mail. */
export async function openContact(page: Page, email: string, tab = "historique") {
  await page.goto("/contacts");
  const row = page.getByRole("row").filter({ hasText: email });
  const href = await row.getByRole("link").first().getAttribute("href");
  expect(href, `contact ${email} introuvable dans la liste`).toMatch(/^\/contacts\/[0-9a-f-]{36}/);
  await page.goto(`${href!.split("?")[0]}?onglet=${tab}`);
}
