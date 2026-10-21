import { expect, test, type Page } from "@playwright/test";
import { acceptConsent, fill, openContact, runId, testEmail, visitor } from "./helpers";

/**
 * Conferences & workshops, end to end: the coach creates and publishes an event with 2 seats, three visitors
 * register (2 seats taken, then the waiting list), one cancels from her private link, the waiting list moves up,
 * the coach marks presence, exports the list and cancels the event.
 */

const inTwoWeeks = () => {
  const d = new Date(Date.now() + 14 * 86_400_000);
  return d.toISOString().slice(0, 10);
};

async function register(page: Page, slug: string, firstName: string, email: string) {
  await page.goto(`/evenements/${slug}`);
  await fill(page, /^Prénom/, firstName);
  await fill(page, /^Nom/, "Participant");
  await fill(page, /^E-mail/, email);
  await acceptConsent(page);
  await page.getByRole("button", { name: /Réserver ma place|Rejoindre la liste d’attente/ }).click();
  await expect(page).toHaveURL(/\/inscription\//);
  return page.url();
}

test("événement : création, inscriptions, liste d’attente, annulation, présence, export", async ({ page, browser }) => {
  const title = `Atelier e2e ${runId()}`;

  // 1 · The coach creates the event (draft) and publishes it.
  await page.goto("/mes-evenements/nouveau");
  await page.getByLabel("Titre *").fill(title);
  await page.getByLabel("Résumé").fill("Un atelier de test de bout en bout.");
  await page.getByLabel("Date *").fill(inTwoWeeks());
  await page.getByLabel("Début *").fill("18:30");
  await page.getByLabel("Fin *").fill("20:00");
  await page.getByLabel("Lieu").fill("Salle de test, Lyon");
  await page.getByLabel("Nombre de places").fill("2");
  await page.getByLabel("Places max. par inscription").fill("1");
  await page.getByLabel("Prix (texte affiché)").fill("Gratuit");
  await page.getByRole("button", { name: "Créer l’événement" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText("Brouillon", { exact: true }).first()).toBeVisible();
  const eventUrl = page.url();

  // A draft is not on the website.
  const anon = await visitor(browser);
  await anon.page.goto("/evenements");
  await expect(anon.page.getByText(title)).toHaveCount(0);

  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié", { exact: true })).toBeVisible();

  // 2 · Visible on the website, with its seats.
  await anon.page.goto("/evenements");
  await anon.page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(anon.page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(anon.page.getByText("Plus que 2 places").first()).toBeVisible();
  const slug = new URL(anon.page.url()).pathname.split("/").pop()!;
  await anon.context.close();

  // 3 · Three visitors: two seats, then the waiting list.
  const people = [
    { name: "Inès", email: testEmail("ines") },
    { name: "Hugo", email: testEmail("hugo") },
    { name: "Nora", email: testEmail("nora") },
  ];
  const links: string[] = [];
  for (const p of people) {
    const v = await visitor(browser);
    links.push(await register(v.page, slug, p.name, p.email));
    if (p.name === "Nora") await expect(v.page.getByRole("heading", { level: 1 })).toContainText("liste d’attente");
    else await expect(v.page.getByRole("heading", { level: 1 })).toContainText("votre place est réservée");
    await v.context.close();
  }

  // Someone typing an already-registered e-mail (maybe not its owner) gets no access to that booking:
  // no redirect to the private page, nothing changed, a neutral message, the link goes to the address on file.
  const stranger = await visitor(browser);
  await stranger.page.goto(`/evenements/${slug}`);
  await fill(stranger.page, /^Prénom/, "Intrus");
  await fill(stranger.page, /^Nom/, "Inconnu");
  await fill(stranger.page, /^E-mail/, people[0].email);
  await acceptConsent(stranger.page);
  await stranger.page.getByRole("button", { name: "Rejoindre la liste d’attente" }).click();
  await expect(stranger.page.getByRole("status")).toContainText("Cette adresse e-mail est déjà inscrite.");
  await expect(stranger.page).not.toHaveURL(/\/inscription\//);
  await stranger.context.close();

  await page.goto(eventUrl);
  await expect(page.getByText("Inscrits (2 places)")).toBeVisible();
  await expect(page.getByText("Liste d’attente (1)")).toBeVisible();
  await expect(page.getByText("Intrus")).toHaveCount(0);

  // 4 · Hugo cancels from his private link: Nora gets the seat.
  const hugo = await visitor(browser);
  await hugo.page.goto(links[1]);
  await hugo.page.getByRole("button", { name: "Annuler mon inscription" }).click();
  await hugo.page.getByRole("button", { name: "Oui, annuler" }).click();
  await expect(hugo.page.getByRole("heading", { level: 1 })).toHaveText("Votre inscription est annulée");
  await hugo.context.close();

  const nora = await visitor(browser);
  await nora.page.goto(links[2]);
  await expect(nora.page.getByRole("heading", { level: 1 })).toHaveText(/place est réservée|inscription est confirmée/);
  const ics = await nora.page.request.get(`${new URL(links[2]).pathname}/agenda`);
  expect(ics.status()).toBe(200);
  expect(await ics.text()).toContain("BEGIN:VEVENT");
  await nora.context.close();

  // 5 · The coach's view: list, contact created with the event as source, export.
  await page.goto(eventUrl);
  await expect(page.getByText("Inscrits (2 places)")).toBeVisible();
  await expect(page.getByText("Liste d’attente (1)")).toHaveCount(0);
  const csv = await page.request.get(`${new URL(eventUrl).pathname.replace("/mes-evenements/", "/api/mes-evenements/")}/export`);
  expect(csv.status()).toBe(200);
  const text = await csv.text();
  expect(text).toContain(people[0].email);
  expect(text).toContain(people[2].email);

  await openContact(page, people[0].email);
  await expect(page.getByText("Inscription à un événement").first()).toBeVisible();

  // 6 · Cancelling the event closes it on the website.
  await page.goto(eventUrl);
  await page.getByRole("button", { name: "Annuler l’événement" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Annuler l’événement" }).click();
  await expect(page.getByText("Annulé", { exact: true })).toBeVisible();
  const after = await visitor(browser);
  await after.page.goto(`/evenements/${slug}`);
  await expect(after.page.getByText("Cet événement est annulé.")).toBeVisible();
  await expect(after.page.getByRole("button", { name: "Réserver ma place" })).toHaveCount(0);
  await after.context.close();
});

test("événement passé ajouté à l’historique, avec compte rendu et témoignage", async ({ page, browser }) => {
  const title = `Intervention passée e2e ${runId()}`;
  await page.goto("/mes-evenements/nouveau?historique=1");
  await page.getByLabel("Titre *").fill(title);
  await page.getByLabel("Date *").fill("2026-03-12");
  await page.getByLabel("Début *").fill("14:00");
  await page.getByLabel("Fin *").fill("16:00");
  await page.getByLabel("Organisé avec").fill("École de test");
  await page.getByRole("button", { name: "Ajouter à l’historique" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);

  await page.getByRole("tab", { name: "Compte rendu" }).click();
  await page.getByLabel("Ce qui s’est passé").fill("Deux heures d’atelier avec une classe de terminale.");
  await page.getByLabel("Nombre de participants à afficher").fill("28");
  await page.getByRole("checkbox", { name: /Afficher le compte rendu/ }).check();
  await page.getByRole("button", { name: "Enregistrer le compte rendu" }).click();
  await page.getByLabel("Témoignage", { exact: true }).fill("Très concret, merci !");
  await page.getByLabel("Signé").fill("Élève de terminale");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.getByText("« Très concret, merci ! »")).toBeVisible();
  await page.getByRole("button", { name: "Publier sur le site" }).click();
  await expect(page.getByText("Publié", { exact: true })).toBeVisible();

  const v = await visitor(browser);
  await v.page.goto("/evenements");
  await v.page.getByRole("link", { name: new RegExp(title) }).click();
  await expect(v.page.getByText("Deux heures d’atelier avec une classe de terminale.")).toBeVisible();
  await expect(v.page.getByText("28 participants").first()).toBeVisible();
  await expect(v.page.getByText(/Très concret, merci/)).toBeVisible();
  await expect(v.page.getByRole("button", { name: "Réserver ma place" })).toHaveCount(0);
  await v.context.close();
});
