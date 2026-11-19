CREATE TYPE "public"."revelateur_session_status" AS ENUM('in_progress', 'complete', 'invalid');--> statement-breakpoint
CREATE TYPE "public"."revelateur_step" AS ENUM('welcome', 'question', 'open', 'recap');--> statement-breakpoint
CREATE TABLE "revelateur_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"raw_value" smallint NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revelateur_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"questionnaire_version" text NOT NULL,
	"scoring_engine_version" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "revelateur_results_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "revelateur_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" text NOT NULL,
	"status" "revelateur_session_status" DEFAULT 'in_progress' NOT NULL,
	"step" "revelateur_step" DEFAULT 'welcome' NOT NULL,
	"question_index" smallint DEFAULT 0 NOT NULL,
	"questionnaire_version" text NOT NULL,
	"open_answer" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	CONSTRAINT "revelateur_sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "revelateur_answers" ADD CONSTRAINT "revelateur_answers_session_id_revelateur_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."revelateur_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revelateur_results" ADD CONSTRAINT "revelateur_results_session_id_revelateur_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."revelateur_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "revelateur_answers_session_question_uq" ON "revelateur_answers" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "revelateur_sessions_status_idx" ON "revelateur_sessions" USING btree ("status","last_activity_at");