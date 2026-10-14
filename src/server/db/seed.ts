import { fakerFR as faker } from "@faker-js/faker";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { db } from "./index";
import * as s from "./schema";
import { DEFAULT_OFFERS, DEFAULT_STAGES, DEFAULT_TEMPLATES } from "./jg-defaults";
import { DISCOVERY_TYPE } from "@/lib/validations/coaching";

/*
 * Run with: npm run db:seed  (after db:migrate).
 * - Creates the coach account + Méthode JG® reference data (stages, note templates, offers).
 * - SEED_DEMO_DATA=false: reference data only (real installation). Default: also fake demo contacts.
 * - SEED_RESET_DEMO=true: wipes and re-creates the demo data — refused unless the business is a demo.
 * Demo data only — no real people.
 */
faker.seed(42);

const COACH_EMAIL = process.env.SEED_COACH_EMAIL ?? "coach@demo.test";
const COACH_PASSWORD = process.env.SEED_COACH_PASSWORD;
const COACH_NAME = process.env.SEED_COACH_NAME ?? "Jérémy Galéa";
const WITH_DEMO = process.env.SEED_DEMO_DATA !== "false";
const DEMO_BUSINESS = "Jérémy Galéa — Méthode JG® (démo)";

const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
const at = (d: Date, hour: number) => {
  d.setHours(hour, 0, 0, 0);
  return d;
};

// French phrase banks (no lorem ipsum: the demo is shown to people).
const SAYS_BEFORE = [
  "« Je sais ce que je fais, mais j'ai du mal à expliquer ce qui me correspond vraiment. »",
  "« J'ai de l'expérience, mais je n'arrive pas à la rendre évidente en entretien. »",
  "« Je cherche encore ma place. »",
  "« Mon parcours me paraît dispersé. »",
];
const NOTE_BANK = [
  "Parcours relu ensemble : trois expériences reviennent comme points d'appui.",
  "Un mot revient souvent : « transmettre ». Piste à creuser.",
  "Le client décrit ce qu'il fait plus que ce qu'il provoque.",
  "Préparer deux exemples concrets et chiffrés pour l'entretien.",
  "Travail sur la posture : ralentir, assumer les silences.",
  "Formulation de valeur en une phrase : version 2 plus claire.",
  "Le fil conducteur se dessine : comprendre puis organiser.",
  "Mise en situation : présentation de 2 minutes, très bon ancrage.",
  "Relire le workbook, partie « Territoire de valeurs ».",
  "Écrire trois situations où il s'est senti à sa juste place.",
];
const NEXT_STEPS = ["Relire les notes avant la prochaine séance", "Tester le pitch avec un proche", "Compléter le workbook", "Préparer les questions pour le recruteur"];

const pick = <T>(a: readonly T[]) => faker.helpers.arrayElement(a);

async function main() {
  if (!COACH_PASSWORD) throw new Error("Set SEED_COACH_PASSWORD in .env (see .env.example)");

  const coach = await db.query.user.findFirst({ where: (u, { eq }) => eq(u.email, COACH_EMAIL) });

  if (coach) {
    // Demo hosts only: rotate the demo coach's password to SEED_COACH_PASSWORD.
    if (process.env.SEED_UPDATE_PASSWORD === "true") {
      await db
        .update(s.account)
        .set({ password: await hashPassword(COACH_PASSWORD) })
        .where(and(eq(s.account.userId, coach.id), eq(s.account.providerId, "credential")));
      console.log("✓ Demo coach password updated");
    }
    if (process.env.SEED_RESET_DEMO !== "true") {
      console.log("Seed already applied (coach account exists). Run `npm run db:reset` to start over.");
      process.exit(0);
    }
    await resetDemoData();
    await db.update(s.user).set({ name: COACH_NAME }).where(eq(s.user.id, coach.id));
  } else {
    const coachId = crypto.randomUUID();
    await db.insert(s.user).values({ id: coachId, name: COACH_NAME, email: COACH_EMAIL, emailVerified: true, role: "coach" });
    await db.insert(s.account).values({
      id: crypto.randomUUID(),
      accountId: coachId,
      providerId: "credential",
      userId: coachId,
      password: await hashPassword(COACH_PASSWORD),
    });
  }

  const ref = await seedReferenceData();
  const created = WITH_DEMO ? await seedDemoData(ref) : 0;
  console.log(`✓ Seed done: coach ${COACH_EMAIL}, ${ref.offers.length} offers, ${created} demo contacts`);
  process.exit(0);
}

/** Safety: only a demo database can be wiped (business name marked « (démo) » or no business yet). */
async function resetDemoData() {
  const biz = await db.query.settings.findFirst({ where: eq(s.settings.key, "business") });
  const name = (biz?.value as { name?: string } | undefined)?.name ?? "";
  if (biz && !name.includes("(démo)")) {
    throw new Error(`Refusing SEED_RESET_DEMO: business « ${name} » is not a demo.`);
  }
  await db.delete(s.contacts); // cascades: clients, sessions, notes, goals, sold offers, documents, tasks
  await db.delete(s.tasks);
  await db.delete(s.activityLog);
  await db.delete(s.packages);
  await db.delete(s.noteTemplates);
  await db.delete(s.pipelineStages);
  await db.delete(s.settings);
  console.log("✓ Demo data wiped");
}

async function seedReferenceData() {
  await db
    .insert(s.settings)
    .values({ key: "business", value: { name: WITH_DEMO ? DEMO_BUSINESS : "Jérémy Galéa — Méthode JG®", currency: "CHF" } });

  const stages = await db
    .insert(s.pipelineStages)
    .values(DEFAULT_STAGES.map((st, position) => ({ ...st, position })))
    .returning();

  const templates = await db.insert(s.noteTemplates).values(DEFAULT_TEMPLATES).returning();
  const templateId = (name: string) => templates.find((t) => t.name === name)?.id ?? null;

  const offers = await db
    .insert(s.packages)
    .values(DEFAULT_OFFERS.map(({ template, ...o }) => ({ ...o, noteTemplateId: templateId(template) })))
    .returning();

  return { stages, templates, offers };
}

type Ref = Awaited<ReturnType<typeof seedReferenceData>>;

async function seedDemoData({ stages, templates, offers }: Ref) {
  const stage = (name: string) => stages.find((st) => st.name === name)!;
  const [architecture, decisif, signature] = offers;
  const fieldsOf = (offerOrType: string) =>
    (templates.find((t) => t.sessionType === offerOrType) ??
      templates.find((t) => t.id === offers.find((o) => o.id === offerOrType)?.noteTemplateId) ??
      templates.find((t) => t.isDefault))!.fields;

  let created = 0;
  const newContact = async (v: Partial<typeof s.contacts.$inferInsert> & { firstName: string; lastName: string }, addedDaysAgo: number) => {
    const country = v.country ?? pick(["FR", "CH", "CH"] as const);
    const [c] = await db
      .insert(s.contacts)
      .values({
        email: faker.internet.email({ firstName: v.firstName, lastName: v.lastName, provider: "exemple.fr" }).toLowerCase(),
        phone: faker.phone.number({ style: "national" }),
        country,
        currency: country === "CH" ? "CHF" : "EUR",
        createdAt: daysFromNow(-addedDaysAgo),
        updatedAt: daysFromNow(-addedDaysAgo),
        stageChangedAt: daysFromNow(-Math.min(addedDaysAgo, faker.number.int({ min: 0, max: 20 }))),
        ...v,
      })
      .returning();
    created++;
    return c;
  };

  const note = async (sessionId: string, fields: string[]) => {
    await db.insert(s.sessionNotes).values({
      sessionId,
      templateData: Object.fromEntries(fields.map((f) => [f, pick(NOTE_BANK)])),
      nextSteps: pick(NEXT_STEPS),
    });
  };

  // ------------------------------------------------------------ partners (no pipeline stage)
  const partnerDefs = [
    { segment: "cabinet_rh", organization: "Horizon Talents RH", country: "FR" },
    { segment: "cabinet_rh", organization: "Léman Recrutement", country: "CH" },
    { segment: "ecole", organization: "Institut Supérieur de Gestion du Lac", country: "CH" },
    { segment: "entreprise", organization: "Atelier Nord Industrie", country: "FR" },
  ] as const;
  const partners: (typeof s.contacts.$inferSelect)[] = [];
  for (const p of partnerDefs) {
    partners.push(
      await newContact(
        {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          segment: p.segment,
          organization: p.organization,
          country: p.country,
          source: pick(["LinkedIn", "Conférence / atelier", "Recommandation"]),
          stageId: null,
          notes: "Partenaire : oriente des candidats / étudiants vers les accompagnements JG®.",
        },
        faker.number.int({ min: 90, max: 200 }),
      ),
    );
  }

  // ------------------------------------------------------------ prospects & clients
  const profile = () => {
    const segment = pick(["particulier", "particulier", "particulier", "entrepreneur", "entreprise"] as const);
    const subSegment = segment === "particulier" ? pick(["etudiant", "recherche_emploi", "reconversion"] as const) : null;
    const stake =
      subSegment === "etudiant"
        ? pick(["Stage", "Alternance", "Oral"])
        : subSegment === "recherche_emploi"
          ? pick(["Entretien", "Positionnement", "Négociation"])
          : subSegment === "reconversion"
            ? pick(["Reconversion", "Clarification", "Repositionnement"])
            : segment === "entrepreneur"
              ? pick(["Pitch", "Positionnement"])
              : pick(["Prise de poste", "Leadership"]);
    const referredBy =
      subSegment === "etudiant" ? pick([partners[2], null]) : segment !== "entrepreneur" ? pick([partners[0], partners[1], null, null]) : null;
    return {
      segment,
      subSegment,
      stake,
      organization: segment === "entreprise" ? partners[3].organization : null,
      referredByContactId: segment === "entreprise" ? partners[3].id : (referredBy?.id ?? null),
      source: referredBy || segment === "entreprise" ? "Partenaire" : pick(["Site web", "LinkedIn", "Recommandation", "Le Chant du Merle", "Bouche-à-oreille"]),
    };
  };

  // Prospects at each early stage.
  const prospects: [string, number][] = [
    ["Nouveau contact", 5],
    ["Échange stratégique planifié", 4],
    ["Échange réalisé", 3],
    ["Offre recommandée", 4],
  ];
  for (const [stageName, n] of prospects) {
    for (let i = 0; i < n; i++) {
      const p = profile();
      const decisive = ["Entretien", "Oral", "Pitch", "Négociation", "Stage", "Alternance"].includes(p.stake);
      const c = await newContact(
        {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          ...p,
          stageId: stage(stageName).id,
          keyMomentAt: decisive && faker.datatype.boolean() ? at(daysFromNow(faker.number.int({ min: 2, max: 20 })), 12) : null,
          estimatedValue: stageName === "Nouveau contact" ? null : pick([architecture, decisif, signature]).price,
        },
        faker.number.int({ min: 1, max: 45 }),
      );
      if (stageName === "Échange stratégique planifié") {
        await db.insert(s.coachingSessions).values({
          contactId: c.id,
          startsAt: at(daysFromNow(faker.number.int({ min: 0, max: 6 })), pick([9, 11, 14, 17])),
          durationMin: 20,
          type: DISCOVERY_TYPE,
          location: pick(["Visio", "Téléphone"]),
        });
      } else if (stageName !== "Nouveau contact") {
        const [e] = await db
          .insert(s.coachingSessions)
          .values({
            contactId: c.id,
            startsAt: at(daysFromNow(-faker.number.int({ min: 1, max: 10 })), pick([9, 11, 14, 17])),
            durationMin: 20,
            type: DISCOVERY_TYPE,
            status: "done",
            location: "Visio",
          })
          .returning();
        await note(e.id, fieldsOf(DISCOVERY_TYPE));
      }
      if (c.currency === "CHF" && c.estimatedValue) {
        const offer = offers.find((o) => o.price === c.estimatedValue);
        if (offer?.priceChf) await db.update(s.contacts).set({ estimatedValue: offer.priceChf }).where(eq(s.contacts.id, c.id));
      }
    }
  }

  // Clients: active and finished, on the three offers.
  const clientPlan = [
    ...Array.from({ length: 4 }, () => ({ offer: decisif, finished: false })),
    ...Array.from({ length: 4 }, () => ({ offer: signature, finished: false })),
    { offer: architecture, finished: false },
    { offer: architecture, finished: true },
    { offer: decisif, finished: true },
    { offer: signature, finished: true },
    { offer: signature, finished: true },
  ];
  let caseStudies = 0;
  for (const { offer, finished } of clientPlan) {
    const p = profile();
    const added = faker.number.int({ min: 70, max: 170 });
    const c = await newContact(
      {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        ...p,
        stake: offer === decisif ? pick(["Entretien", "Pitch", "Oral", "Négociation"]) : p.stake,
        stageId: stage(finished ? "Terminé" : "En accompagnement").id,
        estimatedValue: null,
      },
      added,
    );
    if (offer === decisif && !finished) {
      await db.update(s.contacts).set({ keyMomentAt: at(daysFromNow(faker.number.int({ min: 3, max: 12 })), 12) }).where(eq(s.contacts.id, c.id));
    }

    // The échange stratégique that started it all.
    const [e] = await db
      .insert(s.coachingSessions)
      .values({
        contactId: c.id,
        startsAt: at(daysFromNow(-added + 3), 11),
        durationMin: 20,
        type: DISCOVERY_TYPE,
        status: "done",
        location: "Visio",
      })
      .returning();
    await note(e.id, fieldsOf(DISCOVERY_TYPE));

    const writeCase = finished && caseStudies < 2;
    const [client] = await db
      .insert(s.clients)
      .values({
        contactId: c.id,
        startDate: daysFromNow(-added + 7),
        status: finished ? "finished" : "active",
        mainGoal: offer === decisif ? `Réussir : ${c.stake}` : pick(["Clarifier sa direction", "Rendre sa valeur évidente", "Assumer un nouveau positionnement"]),
        ...(finished && {
          closedAt: daysFromNow(-faker.number.int({ min: 3, max: 30 })),
          closeReason: offer === decisif ? "Moment décisif réussi" : "Objectifs atteints",
        }),
        ...(writeCase && {
          positioningStatement: pick([
            "Aider les équipes à transformer leurs données en décisions claires.",
            "Rendre lisible ce que chaque projet apporte vraiment à ceux qui le portent.",
          ]),
          caseStudy: {
            before: pick(SAYS_BEFORE),
            trigger: "En reliant ses expériences, un fil conducteur est apparu : ce qu'il provoque, plus que ce qu'il fait.",
            after: "« Je comprends ce qui fait ma valeur et je sais la rendre évidente. »",
            changes: ["De « ce que je fais » → à « ce que je provoque »", "De plusieurs compétences → à une identité lisible"],
          },
          testimonialConsent: true,
        }),
      })
      .returning();
    if (writeCase) caseStudies++;

    const price = c.currency === "CHF" && offer.priceChf ? offer.priceChf : offer.price;
    const used = finished ? offer.sessionsCount : faker.number.int({ min: 1, max: Math.max(1, offer.sessionsCount - 1) });
    const [sold] = await db
      .insert(s.clientPackages)
      .values({
        clientId: client.id,
        packageId: offer.id,
        sessionsUsed: used,
        price,
        currency: c.currency,
        purchasedAt: daysFromNow(-added + 7),
        paymentStatus: finished ? "paid" : pick(["paid", "paid", "partial", "pending"] as const),
      })
      .returning();

    const fields = fieldsOf(offer.id);
    for (let k = used; k >= 1; k--) {
      const [sess] = await db
        .insert(s.coachingSessions)
        .values({
          contactId: c.id,
          clientId: client.id,
          clientPackageId: sold.id,
          startsAt: at(daysFromNow(-k * 7 - faker.number.int({ min: 0, max: 2 })), pick([9, 10, 14, 16, 18])),
          durationMin: 60,
          status: "done",
          location: pick(["Visio", "Cabinet"]),
        })
        .returning();
      await note(sess.id, fields);
    }
    if (!finished && used < offer.sessionsCount) {
      await db.insert(s.coachingSessions).values({
        contactId: c.id,
        clientId: client.id,
        startsAt: at(daysFromNow(faker.number.int({ min: 0, max: 10 })), pick([9, 10, 14, 16, 18])),
        durationMin: 60,
        location: pick(["Visio", "Cabinet"]),
      });
    }

    const goals = offer.goalPresets.length ? offer.goalPresets : [client.mainGoal!];
    await db.insert(s.goals).values(
      goals.map((title) => ({
        clientId: client.id,
        title,
        progress: finished ? 100 : faker.number.int({ min: 10, max: 80 }),
        status: finished ? ("achieved" as const) : ("active" as const),
      })),
    );
  }

  // Tasks
  const someContacts = await db.query.contacts.findMany({ where: sql`${s.contacts.stageId} is not null`, limit: 7 });
  await db.insert(s.tasks).values(
    someContacts.map((c, i) => ({
      title: pick([
        `Rappeler ${c.firstName}`,
        `Envoyer la proposition d'accompagnement à ${c.firstName}`,
        `Préparer la séance de ${c.firstName}`,
        `Relancer ${c.firstName} pour le paiement`,
      ]),
      dueAt: daysFromNow(i - 2),
      done: i === 0,
      contactId: c.id,
    })),
  );

  return created;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
