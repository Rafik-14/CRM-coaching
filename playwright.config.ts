import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests (e2e/*.spec.ts): the real app in a real browser, on a seeded database.
 * - Locally: start `npm run dev` first; the tests reuse it (http://localhost:3100).
 * - CI: the production build is started by Playwright (`npm run start`).
 * Never point E2E_BASE_URL at the live demo: these tests create contacts, bookings and events.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // no .env (CI): the variables come from the workflow
}

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";

export default defineConfig({
  testDir: "./e2e",
  // One shared database: run the journeys one after the other.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 }, storageState: "e2e/.auth/coach.json" },
      dependencies: ["setup"],
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: process.env.CI ? "npm run start -- --port 3100" : "npm run dev",
        url: `${baseURL}/connexion`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
