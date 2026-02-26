-- Auth User Sync Trigger (S8)
-- Syncs new auth.users to org_members is NOT done automatically.
-- CC+C admins manage user-org membership through the admin UI.
-- This trigger creates a placeholder profile row for reference.

-- No public.users table — we use org_members for role mapping.
-- Auth callback handled at application level (S9).
