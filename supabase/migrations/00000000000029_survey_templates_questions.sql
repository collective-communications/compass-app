-- Add missing columns to survey_templates so templates can carry
-- their full question bank as JSONB, be scoped to an org, and be toggled.

ALTER TABLE survey_templates
  ADD COLUMN IF NOT EXISTS questions JSONB,
  ADD COLUMN IF NOT EXISTS settings JSONB,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
