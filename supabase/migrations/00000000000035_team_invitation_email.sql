-- Add team_invitation template type to email infrastructure
-- and seed a default template for team member invitations.

-- Expand template_type CHECK on email_templates
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_template_type_check;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_template_type_check
  CHECK (template_type IN ('survey_invitation', 'reminder', 'report_ready', 'team_invitation'));

-- Expand template_type CHECK on email_log
ALTER TABLE email_log DROP CONSTRAINT IF EXISTS email_log_template_type_check;
ALTER TABLE email_log ADD CONSTRAINT email_log_template_type_check
  CHECK (template_type IN ('survey_invitation', 'reminder', 'report_ready', 'team_invitation'));

-- Seed default team invitation template
INSERT INTO email_templates (org_id, template_type, subject, html_body) VALUES
  (NULL, 'team_invitation',
   'You''ve been invited to Culture Compass',
   'Hello,<br><br>You have been invited to join the Culture Compass platform as a {{role_label}}{{org_context}}.<br><br>Click the link below to create your account and get started:<br><br><a href="{{accept_link}}">Accept Invitation</a><br><br>This invitation expires on {{expires_at}}.<br><br>If you did not expect this invitation, you can safely ignore this email.')
ON CONFLICT DO NOTHING;
