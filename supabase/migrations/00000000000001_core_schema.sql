-- Reusable trigger function for updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- User role enum
CREATE TYPE user_role AS ENUM (
  'ccc_admin',
  'ccc_member',
  'client_exec',
  'client_director',
  'client_manager',
  'client_user'
);

-- Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  branding JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Org Members
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client_user',
  department TEXT,
  team TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

CREATE TRIGGER org_members_updated_at
  BEFORE UPDATE ON org_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dimensions (the 4 Culture Compass dimensions)
CREATE TABLE dimensions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL,
  display_order INT NOT NULL,
  segment_start_angle INT,
  segment_end_angle INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey Templates
CREATE TABLE survey_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER survey_templates_updated_at
  BEFORE UPDATE ON survey_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Seed the 4 compass dimensions
INSERT INTO dimensions (code, name, color, display_order, segment_start_angle, segment_end_angle) VALUES
  ('core', 'Core', '#0A3B4F', 0, NULL, NULL),
  ('clarity', 'Clarity', '#FF7F50', 1, 210, 330),
  ('connection', 'Connection', '#9FD7C3', 2, 90, 210),
  ('collaboration', 'Collaboration', '#E8B4A8', 3, 330, 90);
