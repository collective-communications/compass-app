-- Migration: user_profiles email index
--
-- Context: the accept-invitation edge function previously scanned
-- `auth.admin.listUsers()` to check whether an auth account already existed
-- for an invited email. That call fetches every user in the project on each
-- invocation — O(N) on account count. It was replaced with a lookup against
-- `user_profiles` using `ilike('email', invitation.email)`. This migration
-- adds a case-insensitive unique index so that lookup is O(log N) and so the
-- database enforces the one-profile-per-email contract at the storage layer.
--
-- Consequences: a duplicate LOWER(email) insert into `user_profiles` will now
-- fail immediately rather than silently creating a second row that the
-- invitation flow then couldn't resolve. If duplicate rows already exist the
-- CREATE statement will fail — run
--   SELECT LOWER(email), COUNT(*) FROM user_profiles GROUP BY 1 HAVING COUNT(*) > 1;
-- and reconcile before applying.

CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_email_idx
  ON user_profiles (LOWER(email));
