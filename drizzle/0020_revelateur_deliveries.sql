CREATE TYPE "public"."revelateur_delivery_status" AS ENUM('awaiting_verification', 'awaiting_report', 'sending', 'sent', 'failed');--> statement-breakpoint
CREATE TABLE "revelateur_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"status" "revelateur_delivery_status" DEFAULT 'awaiting_verification' NOT NULL,
	"verify_token_hash" text,
	"verify_expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"verify_sends" smallint DEFAULT 0 NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"last_error" text,
	"next_attempt_at" timestamp with time zone,
	"email_log_id" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revelateur_deliveries_session_id_unique" UNIQUE("session_id"),
	CONSTRAINT "revelateur_deliveries_verify_token_hash_unique" UNIQUE("verify_token_hash")
);
--> statement-breakpoint
ALTER TABLE "revelateur_deliveries" ADD CONSTRAINT "revelateur_deliveries_session_id_revelateur_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."revelateur_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_deliveries" ADD CONSTRAINT "revelateur_deliveries_email_log_id_email_log_id_fk" FOREIGN KEY ("email_log_id") REFERENCES "public"."email_log"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revelateur_deliveries_status_idx" ON "revelateur_deliveries" USING btree ("status","next_attempt_at");