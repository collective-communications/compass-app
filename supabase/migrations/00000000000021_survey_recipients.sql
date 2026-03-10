CREATE TABLE survey_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  segment_metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'completed', 'bounced')),
  invitation_sent_at TIMESTAMPTZ,
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX survey_recipients_survey_email_idx ON survey_recipients(survey_id, email);
CREATE INDEX survey_recipients_survey_idx ON survey_recipients(survey_id);
CREATE INDEX survey_recipients_status_idx ON survey_recipients(status);

ALTER TABLE survey_recipients ENABLE ROW LEVEL SECURITY;

-- CC+C users full access
CREATE POLICY "ccc_users_manage_recipients" ON survey_recipients
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

-- Client users read-only for their org's surveys
CREATE POLICY "client_users_read_recipients" ON survey_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN surveys s ON s.id = survey_recipients.survey_id
      WHERE up.id = auth.uid()
      AND up.role IN ('client_exec', 'client_director', 'client_manager')
      AND s.organization_id = ANY(up.assigned_clients)
    )
  );

CREATE POLICY "service_role_manage_recipients" ON survey_recipients
  FOR ALL TO service_role USING (true) WITH CHECK (true);
