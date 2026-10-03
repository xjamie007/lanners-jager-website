-- lokal-ueberspringen: Der lokale Demo-Server (npm run dev:api) plant selbst.
-- ─────────────────────────────────────────────────────────────────────────────
-- Zeitpläne (Briefing D10.4) über pg_cron und pg_net mit geheimem Header.
-- pg_cron rechnet in UTC. Damit Sommer- und Winterzeit stimmen, laufen die Jobs
-- in beiden möglichen UTC-Stunden; die Function prüft die Ortszeit Luxemburg
-- und arbeitet nur zur richtigen Stunde (sync-full 04:15, sync-delta 07:00–20:00).
--
-- Vorher im Supabase-Dashboard (Vault) zwei Geheimnisse anlegen:
--   select vault.create_secret('https://<ref>.supabase.co', 'lj_project_url');
--   select vault.create_secret('<CRON_SECRET>', 'lj_cron_secret');
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create or replace function public.lj_call(fn text, query text default '')
returns bigint
language sql
security definer
set search_path = public, extensions
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'lj_project_url') || '/functions/v1/' || fn || query,
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'lj_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
$$;
revoke all on function public.lj_call(text, text) from public, anon, authenticated;

-- Komplett-Abgleich: 04:15 Uhr Luxemburg = 02:15 UTC (Sommer) oder 03:15 UTC (Winter)
select cron.schedule('lj-sync-full', '15 2,3 * * *', $$ select public.lj_call('sync-full') $$);
-- Wiederholungen nach HTTP 500 (2, 5, 10 Minuten): jede Minute nachts prüfen, ob eine fällig ist
select cron.schedule('lj-sync-full-retry', '* 2-4 * * *', $$ select public.lj_call('sync-full', '?retry=1') $$);
-- Änderungen alle 10 Minuten, 07:00–20:00 Uhr Luxemburg (78 Läufe am Tag)
select cron.schedule('lj-sync-delta', '*/10 5-19 * * *', $$ select public.lj_call('sync-delta') $$);
-- Outbox alle 5 Minuten (SoftTouch-Aufrufe und Mails wiederholen)
select cron.schedule('lj-outbox', '*/5 * * * *', $$ select public.lj_call('outbox') $$);
-- Rebuild der Seite, wenn nötig (höchstens alle 30 Minuten, die Function entscheidet)
select cron.schedule('lj-rebuild', '*/10 * * * *', $$ select public.lj_call('rebuild') $$);
-- Aufbewahrung: täglich anonymisieren und löschen (D10.9)
select cron.schedule('lj-retention', '30 1 * * *', $$ select public.lj_call('retention') $$);
