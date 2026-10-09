import { fakerFR as faker } from "@faker-js/faker";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import * as s from "./schema";

// Run with: npm run db:seed  (after db:migrate). Demo data only — no real people.
faker.seed(42);

const COACH_EMAIL = process.env.SEED_COACH_EMAIL ?? "coach@demo.test";
const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD;

const SOURCES = ["Site web", "Instagram", "Recommandation", "LinkedIn", "Conférence", "Bouche-à-oreille"];
const TAGS = ["reconversion", "confiance en soi", "stress", "couple", "leadership", "équilibre vie pro/perso"];
const GOALS = [
  "Retrouver confiance en soi",
  "Préparer une reconversion professionnelle",
  "Mieux gérer le stress au travail",
  "Prendre la parole en public",
  "Trouver un meilleur équilibre vie pro / vie perso",
  "Clarifier ses valeurs et ses priorités",
  "Oser poser ses limites",
];

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);

async function main() {
  if (!COACH_PASSWORD) throw new Error("Set SEED_COACH_PASSWORD in .env (see .env.example)");

  const existing = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, COACH_EMAIL) });
  if (existing) {
    console.log("Seed already applied (coach account exists). Run `npm run db:reset` to start over.");
    process.exit(0);
  }

  // Coach account
  const coachId = crypto.randomUUID();
  await db.insert(s.user).values({
    id: coachId,
    name: "Jérémie",
    email: COACH_EMAIL,
    emailVerified: true,
    role: "coach",
  });
  await db.insert(s.account).values({
    id: crypto.randomUUID(),
    accountId: coachId,
    providerId: "credential",
    userId: coachId,
    password: await hashPassword(COACH_PASSWORD),
  });

  // Settings & configuration
  await db.insert(s.settings).values([
    { key: "business", value: { name: "Jérémie — Coaching (démo)", currency: "EUR" } },
  ]);

  const stages = await db
    .insert(s.pipelineStages)
    .values([
      { name: "Nouveau", position: 0, color: "slate" },
      { name: "Appel découverte", position: 1, color: "blue" },
      { name: "Proposition envoyée", position: 2, color: "amber" },
      { name: "Client", position: 3, color: "emerald", isClient: true },
      { name: "Terminé", position: 4, color: "violet", isClient: true },
    ])
    .returning();

  await db.insert(s.noteTemplates).values({
    name: "Séance standard",
    fields: ["Sujet de la séance", "Prises de conscience", "Actions décidées", "Prochaine étape"],
    isDefault: true,
  });

  const pkgs = await db
    .insert(s.packages)
    .values([
      { name: "Séance découverte", sessionsCount: 1, price: "0" },
      { name: "Pack 5 séances", sessionsCount: 5, price: "450" },
      { name: "Accompagnement 3 mois", sessionsCount: 12, price: "1200" },
    ])
    .returning();

  // Contacts spread across the pipeline (weighted towards early stages)
  const stageWeights = [8, 6, 4, 9, 3];
  let created = 0;
  for (const [i, stage] of stages.entries()) {
    for (let n = 0; n < stageWeights[i]; n++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      // Clients were added before they started coaching; leads are more recent.
      const addedDaysAgo = stage.isClient
        ? faker.number.int({ min: 100, max: 180 })
        : faker.number.int({ min: 1, max: 60 });
      const [contact] = await db
        .insert(s.contacts)
        .values({
          firstName,
          lastName,
          email: faker.internet.email({ firstName, lastName, provider: "exemple.fr" }).toLowerCase(),
          phone: faker.phone.number({ style: "national" }),
          source: faker.helpers.arrayElement(SOURCES),
          stageId: stage.id,
          stageChangedAt: daysFromNow(-faker.number.int({ min: 0, max: Math.min(addedDaysAgo, 30) })),
          estimatedValue: faker.helpers.arrayElement(pkgs.slice(1)).price,
          tags: faker.helpers.arrayElements(TAGS, { min: 0, max: 2 }),
          notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }) ?? null,
          createdAt: daysFromNow(-addedDaysAgo),
          updatedAt: daysFromNow(-addedDaysAgo),
        })
        .returning();
      created++;

      if (!stage.isClient) continue;

      const finished = stage.name === "Terminé";
      const [client] = await db
        .insert(s.clients)
        .values({
          contactId: contact.id,
          startDate: daysFromNow(-faker.number.int({ min: 20, max: addedDaysAgo - 7 })),
          status: finished ? "finished" : "active",
          mainGoal: faker.helpers.arrayElement(GOALS),
        })
        .returning();

      const pkg = faker.helpers.arrayElement(pkgs.slice(1));
      const pastCount = finished ? pkg.sessionsCount : faker.number.int({ min: 1, max: pkg.sessionsCount - 1 });
      const [clientPkg] = await db
        .insert(s.clientPackages)
        .values({
          clientId: client.id,
          packageId: pkg.id,
          sessionsUsed: pastCount,
          paymentStatus: finished ? "paid" : faker.helpers.arrayElement(["paid", "partial", "pending"] as const),
        })
        .returning({ id: s.clientPackages.id });

      // Past sessions with notes
      for (let k = pastCount; k >= 1; k--) {
        const startsAt = daysFromNow(-k * 7 - faker.number.int({ min: 0, max: 2 }));
        startsAt.setHours(faker.helpers.arrayElement([9, 10, 14, 16, 18]), 0, 0, 0);
        const [sess] = await db
          .insert(s.coachingSessions)
          .values({
            contactId: contact.id,
            clientId: client.id,
            clientPackageId: clientPkg.id,
            startsAt,
            status: "done",
            location: "Visio",
          })
          .returning();
        await db.insert(s.sessionNotes).values({
          sessionId: sess.id,
          templateData: {
            "Sujet de la séance": faker.helpers.arrayElement(GOALS),
            "Prises de conscience": faker.lorem.sentence(),
            "Actions décidées": faker.lorem.sentence(),
            "Prochaine étape": faker.lorem.words(5),
          },
          nextSteps: faker.lorem.sentence(),
        });
      }

      // Upcoming session for active clients
      if (!finished) {
        const startsAt = daysFromNow(faker.number.int({ min: 0, max: 10 }));
        startsAt.setHours(faker.helpers.arrayElement([9, 10, 14, 16, 18]), 0, 0, 0);
        await db.insert(s.coachingSessions).values({
          contactId: contact.id,
          clientId: client.id,
          startsAt,
          location: faker.helpers.arrayElement(["Visio", "Cabinet"]),
        });
      }

      await db.insert(s.goals).values({
        clientId: client.id,
        title: client.mainGoal!,
        progress: finished ? 100 : faker.number.int({ min: 10, max: 80 }),
        status: finished ? "achieved" : "active",
        dueDate: daysFromNow(faker.number.int({ min: 15, max: 90 })),
      });
    }
  }

  // Tasks
  const someContacts = await db.query.contacts.findMany({ limit: 8 });
  await db.insert(s.tasks).values(
    someContacts.map((c, i) => ({
      title: faker.helpers.arrayElement([
        `Rappeler ${c.firstName}`,
        `Envoyer la proposition à ${c.firstName}`,
        `Préparer la séance de ${c.firstName}`,
        `Relancer ${c.firstName} pour le paiement`,
      ]),
      dueAt: daysFromNow(i - 2),
      done: i === 0,
      contactId: c.id,
    })),
  );

  console.log(`✓ Seed done: coach account ${COACH_EMAIL}, ${created} contacts`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
