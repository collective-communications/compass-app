-- Invitation Validation Tokens
--
-- Binds a successful invitation validation (GET) to a subsequent acceptance
-- (POST) so random unauthenticated callers cannot brute-force invitation IDs.
--
-- Flow:
--   1. Client hits `GET /accept-invitation?token=<id>`. The edge function
--      validates the invitation and inserts a row here keyed by
--      (invitation_id, ip_hash) with a 15-minute TTL.
--   2. Client hits `POST /accept-invitation` with the same invitation id from
--      the same IP. The edge function must find a row whose `valid_until` is
--      still in the future; otherwise the attempt is rejected as 429.
--   3. Every attempt increments `attempts`. When the trailing-15-minute count
--      exceeds 20, the edge function rejects further requests from that IP.
--
-- Only the service role touches this table — it is an internal security
-- ledger, not user-facing data.

CREATE TABLE invitation_validation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL,
  -- SHA-256 hex of the remote IP (never store the raw address).
  --
  -- LIMITATION: as of 2026-04-16 this hash is **unsalted**. See
  -- `_adrs/adr-006-ip-hash-strategy.md` for the threat model and the
  -- recommended mitigation (introduce an `INVITATION_IP_HASH_SALT` secret
  -- and HMAC / salt-concat before hashing). The risk is narrow because the
  -- table has a 15-minute TTL and is service-role only, but an operator
  -- compromise within the TTL window would expose every participating IP
  -- via rainbow-table against the IPv4 space. Do NOT extend this column's
  -- usage to longer-lived tables without salting first.
  ip_hash TEXT NOT NULL,
  -- When the validation grant expires. Defaults to 15 minutes from insert.
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
  -- Number of POST attempts the edge function has seen for this row.
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookups by (invitation_id, ip_hash) — the POST handler's primary probe.
CREATE INDEX idx_ivt_invitation_ip
  ON invitation_validation_tokens (invitation_id, ip_hash);

-- Fast rate-limit window scans per IP.
CREATE INDEX idx_ivt_ip_created
  ON invitation_validation_tokens (ip_hash, created_at DESC);

-- Cleanup index so expired rows can be purged cheaply.
CREATE INDEX idx_ivt_valid_until
  ON invitation_validation_tokens (valid_until);

CREATE TRIGGER invitation_validation_tokens_updated_at
  BEFORE UPDATE ON invitation_validation_tokens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: this is service-role-only. No anon, authenticated, or ccc/client role
-- should be able to see, insert, update, or delete rows. Enabling RLS without
-- any permissive policies means every non-service-role query returns empty
-- and every write is rejected.
ALTER TABLE invitation_validation_tokens ENABLE ROW LEVEL SECURITY;

-- Defence in depth: explicitly revoke the default grants Postgres attaches to
-- `public` so even if a new role is added later, it cannot touch this table.
REVOKE ALL ON invitation_validation_tokens FROM PUBLIC;
REVOKE ALL ON invitation_validation_tokens FROM anon;
REVOKE ALL ON invitation_validation_tokens FROM authenticated;

COMMENT ON TABLE invitation_validation_tokens IS
  'Short-lived (15 min) validation grants binding invitation GET to POST by IP hash. Service-role only.';
