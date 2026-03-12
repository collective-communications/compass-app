-- Rename ses_message_id to provider_message_id (switching from AWS SES to Resend)
-- Guarded: email_log may not exist if migration 20 was recorded but table dropped
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_log' AND column_name = 'ses_message_id') THEN
    ALTER TABLE email_log RENAME COLUMN ses_message_id TO provider_message_id;
  END IF;
END $$;
