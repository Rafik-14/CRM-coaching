ALTER TYPE "public"."client_status" ADD VALUE 'stopped';--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "close_reason" text;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "close_note" text;--> statement-breakpoint
ALTER TABLE "coaching_sessions" ADD COLUMN "agenda" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "stage_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "estimated_value" numeric(10, 2);--> statement-breakpoint
UPDATE "contacts" SET "stage_changed_at" = "updated_at";