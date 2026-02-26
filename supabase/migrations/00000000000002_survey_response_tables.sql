-- Survey & Response Tables (S5)
-- Enforces structural anonymity: responses table has NO user_id column

CREATE TYPE survey_status AS ENUM ('draft', 'active', 'paused', 'closed', 'archived');
CREATE TYPE question_type AS ENUM ('likert_4', 'open_text');
CREATE TYPE deployment_type AS ENUM ('anonymous_link', 'tracked_link', 'email_invite', 'sso_gated');

CREATE TABLE surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES survey_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  status survey_status NOT NULL DEFAULT 'draft',
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  settings JSONB NOT NULL DEFAULT '{}',
  scores_calculated BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER surveys_updated_at
  BEFORE UPDATE ON surveys
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  type question_type NOT NULL DEFAULT 'likert_4',
  order_index INT NOT NULL,
  reverse_scored BOOLEAN NOT NULL DEFAULT false,
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, order_index)
);

CREATE TABLE question_dimensions (
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  dimension_id UUID NOT NULL REFERENCES dimensions(id) ON DELETE CASCADE,
  weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (question_id, dimension_id)
);

CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  type deployment_type NOT NULL DEFAULT 'anonymous_link',
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_responses INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- NO user_id column — structural anonymity
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL,
  ip_hash TEXT,
  metadata_department TEXT,
  metadata_role TEXT,
  metadata_location TEXT,
  metadata_tenure TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  is_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  likert_value INT CHECK (likert_value >= 1 AND likert_value <= 4),
  open_text_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(response_id, question_id)
);

CREATE TRIGGER answers_updated_at
  BEFORE UPDATE ON answers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
