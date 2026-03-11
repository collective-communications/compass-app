-- Rename ses_message_id to provider_message_id (switching from AWS SES to Resend)
ALTER TABLE email_log RENAME COLUMN ses_message_id TO provider_message_id;
