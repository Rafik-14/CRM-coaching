-- Billing removed: Jérémy has no business status yet, payment is arranged directly with each client.
-- The invoicing code stays in git history (Phase 2 · M6) if it is ever needed again.
DELETE FROM "access_tokens" WHERE "purpose" = 'payment';--> statement-breakpoint
ALTER TABLE "access_tokens" DROP CONSTRAINT IF EXISTS "access_tokens_invoice_id_invoices_id_fk";--> statement-breakpoint
ALTER TABLE "access_tokens" DROP COLUMN IF EXISTS "invoice_id";--> statement-breakpoint
DROP TABLE IF EXISTS "payment_events" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "payments" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "invoices" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "invoice_sequences" CASCADE;--> statement-breakpoint
DELETE FROM "settings" WHERE "key" = 'invoicing';--> statement-breakpoint
DELETE FROM "email_templates" WHERE "key" IN ('invoice_issued', 'payment_reminder', 'payment_received');
