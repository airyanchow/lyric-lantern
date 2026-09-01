-- Hardening migration for databases where add-mandarin-charts.sql was already run
-- with the original permissive write policies.
--
-- Problem: "mandarin_charts_insert" and "mandarin_charts_update" were created
-- without a TO clause, so they applied to the anon role. The publishable/anon key
-- is readable by anyone who opens devtools on the site, which allowed the public
-- to insert and modify chart rows.
--
-- Fix: drop both write policies. The seeding script authenticates with the SECRET
-- key, which bypasses RLS, so ingestion is unaffected. Public read is preserved.

DROP POLICY IF EXISTS "mandarin_charts_insert" ON mandarin_charts;
DROP POLICY IF EXISTS "mandarin_charts_update" ON mandarin_charts;

-- Verify: should list only "mandarin_charts_public_read" (cmd = SELECT).
-- SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'mandarin_charts';
