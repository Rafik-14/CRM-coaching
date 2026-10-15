CREATE TABLE "availability_exceptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text DEFAULT 'blocked' NOT NULL,
	"starts_on" text NOT NULL,
	"ends_on" text NOT NULL,
	"start_time" text,
	"end_time" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "availability_exceptions_ends_idx" ON "availability_exceptions" USING btree ("ends_on");