CREATE TYPE "public"."revelateur_callback_status" AS ENUM('pending', 'in_progress', 'completed', 'converted', 'cancelled');--> statement-breakpoint
CREATE TABLE "revelateur_callbacks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"phone" text NOT NULL,
	"status" "revelateur_callback_status" DEFAULT 'pending' NOT NULL,
	"outcome" text,
	"appointment_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revelateur_callbacks_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "revelateur_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"session_id" uuid,
	"type" text NOT NULL,
	"choice" boolean NOT NULL,
	"text_version" text NOT NULL,
	"source" text NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "revelateur_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"type" text NOT NULL,
	"session_id" uuid,
	"participant_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revelateur_events_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "revelateur_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revelateur_participants_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "revelateur_sessions" ADD COLUMN "participant_id" uuid;--> statement-breakpoint
ALTER TABLE "revelateur_callbacks" ADD CONSTRAINT "revelateur_callbacks_participant_id_revelateur_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."revelateur_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_callbacks" ADD CONSTRAINT "revelateur_callbacks_session_id_revelateur_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."revelateur_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_callbacks" ADD CONSTRAINT "revelateur_callbacks_appointment_id_coaching_sessions_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."coaching_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_consents" ADD CONSTRAINT "revelateur_consents_participant_id_revelateur_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."revelateur_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_consents" ADD CONSTRAINT "revelateur_consents_session_id_revelateur_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."revelateur_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_events" ADD CONSTRAINT "revelateur_events_session_id_revelateur_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."revelateur_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_events" ADD CONSTRAINT "revelateur_events_participant_id_revelateur_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."revelateur_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "revelateur_callbacks_status_idx" ON "revelateur_callbacks" USING btree ("status","requested_at");--> statement-breakpoint
CREATE INDEX "revelateur_consents_participant_idx" ON "revelateur_consents" USING btree ("participant_id");--> statement-breakpoint
CREATE INDEX "revelateur_events_participant_idx" ON "revelateur_events" USING btree ("participant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "revelateur_events_session_idx" ON "revelateur_events" USING btree ("session_id");--> statement-breakpoint
ALTER TABLE "revelateur_sessions" ADD CONSTRAINT "revelateur_sessions_participant_id_revelateur_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."revelateur_participants"("id") ON DELETE set null ON UPDATE no action;