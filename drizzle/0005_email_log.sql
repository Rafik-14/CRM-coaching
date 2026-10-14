CREATE TYPE "public"."email_status" AS ENUM('queued', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "email_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid,
	"to" text NOT NULL,
	"redirected_to" text,
	"template_key" text NOT NULL,
	"subject" text NOT NULL,
	"status" "email_status" DEFAULT 'queued' NOT NULL,
	"error" text,
	"provider_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_log" ADD CONSTRAINT "email_log_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_log_contact_idx" ON "email_log" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "email_log_created_idx" ON "email_log" USING btree ("created_at");