ALTER TABLE "client_packages" ADD COLUMN "price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "client_packages" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "positioning_statement" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "case_study" jsonb;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "testimonial_consent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "segment" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "sub_segment" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "organization" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "referred_by_contact_id" uuid;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "currency" text DEFAULT 'EUR' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "stake" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "key_moment_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "price_chf" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "tagline" text;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "includes" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "note_template_id" uuid;--> statement-breakpoint
ALTER TABLE "packages" ADD COLUMN "goal_presets" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_referred_by_contact_id_contacts_id_fk" FOREIGN KEY ("referred_by_contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_note_template_id_note_templates_id_fk" FOREIGN KEY ("note_template_id") REFERENCES "public"."note_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contacts_referred_by_idx" ON "contacts" USING btree ("referred_by_contact_id");--> statement-breakpoint
-- Snapshot the price and currency of packages already sold.
UPDATE "client_packages" cp SET "price" = p."price", "currency" = p."currency" FROM "packages" p WHERE cp."package_id" = p."id" AND cp."price" IS NULL;--> statement-breakpoint
-- Existing contacts use the business currency.
UPDATE "contacts" SET "currency" = COALESCE((SELECT "value"->>'currency' FROM "settings" WHERE "key" = 'business'), 'EUR');--> statement-breakpoint
-- The discovery call is now called « Échange stratégique » (Méthode JG®).
UPDATE "coaching_sessions" SET "type" = 'Échange stratégique' WHERE "type" = 'Appel découverte';
