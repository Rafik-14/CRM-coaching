-- Jérémy's « MODIFICATIONS 3.0 » (Nov. 2026): the two first formulas change names and content.
-- The 1-session offer (160 € / 180 CHF) becomes « Focus Décisif JG® » (preparing a decisive moment),
-- the 3-session offer (450 € / 480 CHF) becomes « Architecture Identitaire JG® » (clarifying one's identity).
-- Matches src/server/db/jg-defaults.ts, so existing installations get what a new one is seeded with.
-- Order matters: the 1-session « Architecture » is renamed first, then the 3-session « Décisif » takes that name.
UPDATE "packages" SET
  "name" = 'Focus Décisif JG®',
  "position" = 1,
  "tagline" = 'Prenez votre place. Maîtrisez votre message. Faites la différence.',
  "description" = 'Une échéance approche ? Un entretien important, une négociation ou une prise de parole se prépare. Concentrez-vous sur l''essentiel : identifiez vos arguments différenciants, structurez votre message et ajustez votre posture. Repartez avec des repères concrets pour aborder votre objectif avec davantage de clarté, d''assurance et d''impact.',
  "updated_at" = now()
WHERE "name" = 'Architecture Identitaire JG®';
--> statement-breakpoint
UPDATE "packages" SET
  "name" = 'Architecture Identitaire JG®',
  "position" = 2,
  "tagline" = 'Comprendre ce qui fait réellement votre valeur.',
  "description" = 'Votre parcours vous a construit. Encore faut-il savoir ce qu''il révèle de vous. À travers un travail structuré, explorez vos expériences, identifiez vos forces distinctives et faites émerger ce qui vous caractérise réellement. Construisez une identité professionnelle cohérente, clarifiez votre positionnement et apprenez à exprimer ce qui fait votre singularité.',
  "updated_at" = now()
WHERE "name" = 'Accompagnement Décisif JG®';
--> statement-breakpoint
UPDATE "packages" SET
  "tagline" = 'Révélez votre potentiel. Incarnez votre identité.',
  "description" = 'Vous souhaitez franchir un véritable cap professionnel ? Engagez un travail approfondi pour comprendre vos mécanismes, révéler vos ressources et construire une identité pleinement assumée. De la clarification de votre potentiel à son incarnation concrète, avancez étape par étape pour aligner qui vous êtes, ce que vous apportez et la manière dont vous le faites percevoir.',
  "includes" = ARRAY['Accompagnement individuel approfondi', 'Workbook Signature JG®', 'Exercices et travaux interséances', 'Construction et affirmation du positionnement', 'Mise en pratique et consolidation des acquis'],
  "updated_at" = now()
WHERE "name" = 'Parcours Signature JG®';
--> statement-breakpoint
-- The « moment visé » note template follows the decisive-moment content, now in the Focus Décisif offer.
UPDATE "note_templates" SET "name" = 'Focus Décisif JG®', "updated_at" = now() WHERE "name" = 'Accompagnement Décisif JG®';
--> statement-breakpoint
UPDATE "packages" SET "note_template_id" = (SELECT "id" FROM "note_templates" WHERE "name" = 'Focus Décisif JG®' LIMIT 1)
WHERE "name" = 'Focus Décisif JG®' AND EXISTS (SELECT 1 FROM "note_templates" WHERE "name" = 'Focus Décisif JG®');
--> statement-breakpoint
UPDATE "packages" SET "note_template_id" = (SELECT "id" FROM "note_templates" WHERE "name" = 'Architecture Identitaire JG®' LIMIT 1)
WHERE "name" = 'Architecture Identitaire JG®' AND EXISTS (SELECT 1 FROM "note_templates" WHERE "name" = 'Architecture Identitaire JG®');
