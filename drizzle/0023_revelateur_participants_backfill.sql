-- Addresses given before participants existed: create the participants (normalised e-mail = identity,
-- annexe 07 §10) and attach their sessions. Safe to run again.
INSERT INTO "revelateur_participants" ("email", "first_name", "created_at", "updated_at")
SELECT DISTINCT ON (lower(trim(d."email"))) lower(trim(d."email")), d."first_name", d."created_at", d."updated_at"
FROM "revelateur_deliveries" d
ORDER BY lower(trim(d."email")), d."updated_at" DESC
ON CONFLICT ("email") DO NOTHING;
--> statement-breakpoint
UPDATE "revelateur_sessions" s
SET "participant_id" = p."id"
FROM "revelateur_deliveries" d
JOIN "revelateur_participants" p ON p."email" = lower(trim(d."email"))
WHERE d."session_id" = s."id" AND s."participant_id" IS NULL;
