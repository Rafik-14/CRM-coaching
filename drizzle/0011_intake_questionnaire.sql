CREATE TABLE "intake_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contact_id" uuid NOT NULL,
	"token_id" uuid,
	"answers" jsonb,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"submitted_at" timestamp with time zone,
	"consent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "intake_responses" ADD CONSTRAINT "intake_responses_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intake_responses" ADD CONSTRAINT "intake_responses_token_id_access_tokens_id_fk" FOREIGN KEY ("token_id") REFERENCES "public"."access_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "intake_responses_contact_idx" ON "intake_responses" USING btree ("contact_id");