-- Jérémy's new texts for the three formulas (« MODIFICATIONS 2.2 », onglet Accompagnements, Nov. 2026).
-- Matches src/server/db/jg-defaults.ts, so existing installations get what a new one is seeded with.
UPDATE "packages" SET
  "tagline" = 'Vous avez de la valeur. Découvrez ce qui vous rend unique.',
  "description" = 'Prenez du recul sur votre parcours, identifiez vos forces distinctives et mettez des mots sur ce qui fait réellement votre singularité. Repartez avec une vision plus claire de votre identité professionnelle, de vos atouts et de votre prochaine direction.',
  "updated_at" = now()
WHERE "name" = 'Architecture Identitaire JG®';
--> statement-breakpoint
UPDATE "packages" SET
  "tagline" = 'Vous avez quelque chose à prouver. Faites en sorte que ça se voie.',
  "description" = 'Entretien, prise de poste, négociation, présentation ou prise de parole : préparez les moments où votre capacité à convaincre peut tout changer. Structurez votre discours, affirmez votre positionnement et apprenez à faire comprendre ce qui vous distingue.',
  "updated_at" = now()
WHERE "name" = 'Accompagnement Décisif JG®';
--> statement-breakpoint
UPDATE "packages" SET
  "tagline" = 'Ne vous contentez plus de montrer ce que vous savez faire. Incarnez ce qui vous rend unique.',
  "description" = 'Un parcours approfondi pour clarifier votre identité professionnelle, construire un positionnement distinctif et apprendre à exprimer votre valeur avec justesse et assurance. De la prise de conscience à l''affirmation de soi, faites de votre singularité une véritable force dans votre trajectoire professionnelle.',
  "includes" = ARRAY['Workbook Signature JG®', 'Exercices interséances', 'Accompagnement individualisé'],
  "updated_at" = now()
WHERE "name" = 'Parcours Signature JG®';
