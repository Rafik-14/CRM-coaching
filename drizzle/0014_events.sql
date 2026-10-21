CREATE TABLE "event_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"kind" text DEFAULT 'gallery' NOT NULL,
	"storage_path" text NOT NULL,
	"width" integer,
	"height" integer,
	"caption" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"text" text NOT NULL,
	"author" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"contact_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"company" text,
	"seats" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"attended" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'site' NOT NULL,
	"reminder_sent_at" timestamp with time zone,
	"thanks_sent_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'conference' NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location" text,
	"online_url" text,
	"capacity" integer,
	"max_seats_per_booking" integer DEFAULT 4 NOT NULL,
	"price_text" text,
	"partner" text,
	"audience" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"registration_open" boolean DEFAULT true NOT NULL,
	"waitlist_enabled" boolean DEFAULT true NOT NULL,
	"manual_history" boolean DEFAULT false NOT NULL,
	"recap" text,
	"participants_shown" integer,
	"video_url" text,
	"show_recap" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "access_tokens" ADD COLUMN "registration_id" uuid;--> statement-breakpoint
ALTER TABLE "event_photos" ADD CONSTRAINT "event_photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_quotes" ADD CONSTRAINT "event_quotes_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_photos_event_idx" ON "event_photos" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_registrations_event_idx" ON "event_registrations" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX "event_registrations_contact_idx" ON "event_registrations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "events_starts_idx" ON "events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
ALTER TABLE "access_tokens" ADD CONSTRAINT "access_tokens_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;