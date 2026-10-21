import { expect, test } from "@playwright/test";
import { openContact, testEmail } from "./helpers";

/** The coach's daily work in the CRM. */

test.describe("CRM", () => {
  test("toutes les pages du CRM s’ouvrent", async ({ page }) => {
    for (const [path, title] of [
      ["/tableau-de-bord", /Bonjour|Tableau de bord/],
      ["/contacts", /Contacts/],
      ["/pipeline", /Pipeline/],
      ["/calendrier", /Calendrier/],
      ["/taches", /Tâches/],
      ["/mes-evenements", /Événements/],
      ["/analyses", /Analyses/],
      ["/parametres", /Paramètres/],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first(), path).toContainText(title);
    }
  });

  test("créer un contact, le retrouver, ouvrir sa fiche", async ({ page }) => {
    const email = testEmail("crm");
    await page.goto("/contacts");
    await page.getByRole("button", { name: "Nouveau contact" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Prénom *").fill("Dominique");
    await dialog.getByLabel("Nom", { exact: true }).fill("Créé");
    await dialog.getByLabel("E-mail", { exact: true }).fill(email);
    await dialog.getByRole("button", { name: "Enregistrer" }).click();
    await expect(dialog).toBeHidden();
    await openContact(page, email, "apercu");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Dominique");
  });

  test("ajouter une tâche puis la cocher", async ({ page }) => {
    const title = `Tâche e2e ${Date.now()}`;
    await page.goto("/taches");
    await page.getByRole("button", { name: "Nouvelle tâche" }).click();
    await page.getByRole("dialog").getByLabel("Tâche *").fill(title);
    await page.getByRole("dialog").getByRole("button", { name: /Ajouter|Enregistrer/ }).click();
    const row = page.getByRole("listitem").filter({ hasText: title });
    await expect(row).toBeVisible();
    await row.getByRole("checkbox").click();
    await expect(row.getByText(title)).toHaveClass(/line-through/);
  });

  test("les e-mails automatiques des événements sont modifiables", async ({ page }) => {
    await page.goto("/parametres?onglet=emails");
    for (const label of ["Inscription à un événement", "Rappel la veille d’un événement", "Merci après un événement"]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
    await expect(page.getByText("Facturation")).toHaveCount(0);
  });
});
