-- Client Member-List Visibility
--
-- The original `client_read_own_members` policy (migration 4) let *any*
-- authenticated member of an organization — including `client_user` (the
-- tier-1, survey-respondent role) — read the organization's full member
-- roster via `org_members`. That is a surface-area leak: survey respondents
-- only need to know they belong to the org, not who else does.
--
-- This migration narrows visibility so only client leadership roles
-- (`client_exec`, `client_director`, `client_manager`) and CC+C staff
-- (covered separately by `ccc_admin_all_members`) can read the member list.
-- `client_user` can still be inserted/updated via service-role flows
-- (invitation accept) because the service-role bypasses RLS.
--
-- Threat model: a compromised `client_user` account should not enumerate the
-- organization's leadership team nor harvest emails for phishing. The view
-- restriction also aligns with the "structural anonymity / least data
-- exposure" principle baked into the rest of the schema.

-- ============================================================================
-- 1. Drop the over-permissive existing policy
-- ============================================================================

DROP POLICY IF EXISTS client_read_own_members ON org_members;

-- ============================================================================
-- 2. Recreate with a role gate
-- ============================================================================
--
-- Predicate:
--   - Row must belong to the caller's organization.
--   - Caller's role must be one of the three client leadership roles. CC+C
--     staff are already covered by `ccc_admin_all_members` (FOR ALL).
--
-- `auth_user_role()` is SECURITY DEFINER / STABLE and returns the caller's
-- role from `org_members`, so the predicate does not recurse through RLS.
--
-- We deliberately do NOT include `client_user` in the allow-list.
CREATE POLICY client_read_own_members ON org_members
  FOR SELECT
  USING (
    organization_id = auth_user_org_id()
    AND auth_user_role() IN ('client_exec', 'client_director', 'client_manager')
  );

COMMENT ON POLICY client_read_own_members ON org_members IS
  'Only client leadership (exec/director/manager) and CC+C staff can read the org member list. Tier-1 client_user is excluded — survey respondents should not enumerate the roster.';
