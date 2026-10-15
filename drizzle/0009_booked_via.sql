ALTER TABLE "coaching_sessions" ADD COLUMN "booked_via" text DEFAULT 'coach' NOT NULL;--> statement-breakpoint
-- Sessions booked on the website before this column existed (their agenda starts with this sentence).
UPDATE "coaching_sessions" SET "booked_via" = 'online' WHERE "agenda" LIKE 'Réservé en ligne depuis le site.%';
