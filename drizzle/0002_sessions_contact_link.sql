ALTER TABLE "coaching_sessions" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD COLUMN "contact_id" uuid;--> statement-breakpoint
UPDATE "coaching_sessions" s SET "contact_id" = c."contact_id" FROM "clients" c WHERE c."id" = s."client_id";--> statement-breakpoint
ALTER TABLE "coaching_sessions" ALTER COLUMN "contact_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD COLUMN "client_package_id" uuid;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD CONSTRAINT "coaching_sessions_client_package_id_client_packages_id_fk" FOREIGN KEY ("client_package_id") REFERENCES "public"."client_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coaching_sessions_contact_idx" ON "coaching_sessions" USING btree ("contact_id");