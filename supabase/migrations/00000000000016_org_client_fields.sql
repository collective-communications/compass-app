-- Add client management fields to organizations table.
-- Used by the admin clients pages (org-info-card, edit-org-modal, add-client-modal).
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS primary_contact_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_contact_email TEXT;
