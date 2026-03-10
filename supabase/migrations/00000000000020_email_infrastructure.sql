-- Email log for tracking all sent emails
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('survey_invitation', 'reminder', 'report_ready')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  ses_message_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX email_log_recipient_idx ON email_log(recipient);
CREATE INDEX email_log_status_idx ON email_log(status);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccc_users_read_email_log" ON email_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('ccc_admin', 'ccc_member')
    )
  );

CREATE POLICY "service_role_manage_email_log" ON email_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Email templates (org-specific or system defaults)
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  template_type TEXT NOT NULL CHECK (template_type IN ('survey_invitation', 'reminder', 'report_ready')),
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX email_templates_org_type_idx ON email_templates(COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), template_type);

CREATE TRIGGER set_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ccc_users_manage_templates" ON email_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('ccc_admin', 'ccc_member')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('ccc_admin', 'ccc_member')
    )
  );

CREATE POLICY "service_role_manage_templates" ON email_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Seed default templates
INSERT INTO email_templates (org_id, template_type, subject, html_body) VALUES
  (NULL, 'survey_invitation', 'You are invited to complete a Culture Compass survey', 'Hello,<br><br>You have been invited to participate in a Culture Compass survey for {{organization_name}}. Click the link below to begin.<br><br><a href="{{survey_link}}">{{survey_link}}</a><br><br>This survey is completely anonymous.'),
  (NULL, 'reminder', 'Reminder: Culture Compass survey closing soon', 'Hello,<br><br>This is a reminder that the Culture Compass survey for {{organization_name}} closes on {{close_date}}. If you have not yet completed it, please use the link below.<br><br><a href="{{survey_link}}">{{survey_link}}</a>'),
  (NULL, 'report_ready', 'Your Culture Compass report is ready', 'Hello,<br><br>The Culture Compass report for {{organization_name}} is now available. Log in to view your results.<br><br><a href="{{dashboard_link}}">{{dashboard_link}}</a>');

-- Add email tracking columns to invitations table (if it exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invitations') THEN
    ALTER TABLE invitations ADD COLUMN IF NOT EXISTS email_status TEXT DEFAULT 'pending';
    ALTER TABLE invitations ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
    ALTER TABLE invitations ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
  END IF;
END $$;
