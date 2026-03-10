-- Add reminder schedule to surveys
ALTER TABLE surveys ADD COLUMN IF NOT EXISTS reminder_schedule JSONB DEFAULT '[]';

-- Note: pg_cron setup requires superuser and is done at the infrastructure level.
-- This migration adds the column; the cron job is documented but not auto-created.
-- Cron job (to be created by DBA/infra):
-- SELECT cron.schedule('check-reminders', '0 9 * * *', $$
--   SELECT net.http_post(
--     current_setting('app.settings.supabase_url') || '/functions/v1/send-reminders',
--     '{}',
--     'application/json',
--     ARRAY[http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))]
--   );
-- $$);
