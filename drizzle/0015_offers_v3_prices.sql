-- Jérémy's new prices and texts for the three formulas (« Site web JG_brutV2 » and « MODIFICATIONS suite », Oct. 2026).
-- Matches src/server/db/jg-defaults.ts, so existing installations get what a new one is seeded with.
UPDATE "packages" SET "price" = 160.00, "price_chf" = 180.00, "sessions_count" = 1,
  "tagline" = 'Comprendre ce qui fait réellement votre valeur.',
  "description" = 'Prenez du recul sur votre parcours, identifiez ce qui vous distingue et clarifiez ce qui donne du sens à votre évolution professionnelle.',
  "updated_at" = now()
WHERE "name" = 'Architecture Identitaire JG®';--> statement-breakpoint
UPDATE "packages" SET "price" = 450.00, "price_chf" = 480.00, "sessions_count" = 3,
  "tagline" = 'Réussir un moment qui compte.',
  "description" = 'Préparez un enjeu professionnel précis, structurez votre message et apprenez à exprimer votre valeur avec clarté et justesse lorsque la décision se prend.',
  "updated_at" = now()
WHERE "name" = 'Accompagnement Décisif JG®';--> statement-breakpoint
UPDATE "packages" SET "price" = 840.00, "price_chf" = 930.00, "sessions_count" = 6,
  "tagline" = 'Transformer durablement votre manière d''incarner votre valeur.',
  "description" = 'Un accompagnement approfondi pour mieux comprendre ce qui vous distingue, affirmer votre identité professionnelle et la traduire concrètement dans votre discours, votre posture et vos choix.',
  "includes" = ARRAY['6 séances individuelles', 'Workbook Signature JG®', 'Exercices interséances'],
  "updated_at" = now()
WHERE "name" = 'Parcours Signature JG®';
