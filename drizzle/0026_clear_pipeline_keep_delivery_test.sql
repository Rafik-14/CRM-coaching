-- One-time cleanup before delivery: remove every CRM contact except the delivery test ("Test Livraison").
-- Guarded: does nothing on a database without that contact. Cascades: clients, sessions, notes, goals, sold offers, tasks, registrations link (set null).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "contacts" WHERE "first_name" = 'Test Livraison') THEN
    DELETE FROM "email_log" WHERE "contact_id" IN (SELECT "id" FROM "contacts" WHERE "first_name" IS DISTINCT FROM 'Test Livraison');
    DELETE FROM "contacts" WHERE "first_name" IS DISTINCT FROM 'Test Livraison';
  END IF;
END $$;
