import { expect, test } from "@playwright/test";
import { acceptConsent, fill, openContact, testEmail, visitor } from "./helpers";

/** Visitors → CRM: the contact form and the online booking of the « échange stratégique ». */

test.describe("du site au CRM", () => {
  test("formulaire de contact → contact et tâche dans le CRM", async ({ browser, page }) => {
    const email = testEmail("contact");
    const v = await visitor(browser);
    await v.page.goto("/contact");
    await fill(v.page, /^Nom/, "Testeur");
    await fill(v.page, /^Prénom/, "Camille");
    await fill(v.page, /^E-mail/, email);
    await fill(v.page, /^Votre message/, "Bonjour, je souhaite faire le point sur ma reconversion.");
    await acceptConsent(v.page);
    await v.page.getByRole("button", { name: "Envoyer mon message" }).click();
    await expect(v.page.getByRole("status")).toContainText("Merci, votre message est bien envoyé.");
    await v.context.close();

    await openContact(page, email);
    await expect(page.getByText("Contact créé via le formulaire du site").first()).toBeVisible();
    await page.goto("/taches");
    await expect(page.getByText("Rappeler Camille (formulaire du site)").first()).toBeVisible();
  });

  test("le formulaire refuse un e-mail invalide et garde la saisie", async ({ browser }) => {
    const v = await visitor(browser);
    await v.page.goto("/contact");
    await fill(v.page, /^Nom/, "Testeur");
    await fill(v.page, /^Prénom/, "Léo");
    await fill(v.page, /^E-mail/, "pas-un-email");
    await fill(v.page, /^Votre message/, "Message");
    await acceptConsent(v.page);
    await v.page.getByRole("button", { name: "Envoyer mon message" }).click();
    await expect(v.page.getByText("Adresse e-mail invalide.")).toBeVisible();
    await expect(v.page.getByLabel(/^Prénom/)).toHaveValue("Léo");
    await v.context.close();
  });

  test("réservation d’un échange → confirmation, séance dans le CRM, déplacement puis annulation", async ({ browser, page }) => {
    const email = testEmail("echange");
    const v = await visitor(browser);
    await v.page.goto("/reserver?source=e2e");
    // First free day, first free time.
    await v.page.getByRole("button", { name: /créneaux?$/ }).first().click();
    await v.page.getByRole("button", { name: /^\d{2}:\d{2}$/ }).first().click();
    await fill(v.page, /^Prénom/, "Sacha");
    await fill(v.page, /^Nom/, "Réservation");
    await fill(v.page, /^E-mail/, email);
    await acceptConsent(v.page);
    await v.page.getByRole("button", { name: "Confirmer mon échange stratégique" }).click();
    await expect(v.page.getByRole("heading", { level: 1 })).toHaveText("Merci Sacha, c’est réservé.");

    // The coach sees the person, with the booking in the history.
    await openContact(page, email);
    await expect(page.getByText("Échange stratégique réservé en ligne").first()).toBeVisible();

    // The visitor opens « Déplacer ou annuler » and cancels.
    await v.page.getByRole("link", { name: "Déplacer ou annuler" }).click();
    await expect(v.page).toHaveURL(/\/rdv\//);
    await v.page.getByRole("button", { name: "Annuler le rendez-vous" }).click();
    await v.page.getByRole("button", { name: "Oui, annuler le rendez-vous" }).click();
    await expect(v.page.getByRole("heading", { level: 1 })).toHaveText("Ce rendez-vous est annulé.");
    await v.context.close();
  });
});
