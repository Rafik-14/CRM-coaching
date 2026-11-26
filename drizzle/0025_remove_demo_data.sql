-- One-time removal of the fake demo data on real installations (seed: contacts @exemple.fr, events demo-*).
-- Cascades remove their clients, sessions, notes, goals, sold offers, tasks, registrations, photos and quotes.
DELETE FROM "email_log" WHERE "to" LIKE '%@exemple.fr';--> statement-breakpoint
DELETE FROM "contacts" WHERE "email" LIKE '%@exemple.fr';--> statement-breakpoint
DELETE FROM "events" WHERE "slug" LIKE 'demo-%';
