# ADR-006: IP Hash Storage & Salting Strategy

**Date:** 2026-04-16
**Status:** Accepted
**Deciders:** Tucker
**Supersedes:** —
**Related:** [ADR-002](./adr-002-anonymous-survey-distribution.md)

---

## Context

The codebase currently references `ip_hash` in two distinct places with two distinct threat models. Prompted by a security review finding in Wave 5, we audited both call sites to determine whether the existing hashes are safe and to decide what to do about them.

### Call site 1 — `invitation_validation_tokens.ip_hash`

Added by migration `00000000000038_invitation_validation_tokens.sql`. Populated by the `accept-invitation` edge function via `fingerprintIp()` in `supabase/functions/accept-invitation/handlers.ts`.

```ts
export async function fingerprintIp(req: Request): Promise<string> {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const clientIp = forwarded.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')?.trim()
    || 'unknown';

  const buf = new TextEncoder().encode(clientIp);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

Purpose: rate-limit invitation-validation attempts per source IP over a 15-minute window (20 attempts max). The hash is the primary key in the compound index used for `WHERE invitation_id = ? AND ip_hash = ?` lookups.

**Current implementation is unsalted.** The input to SHA-256 is the raw IP string.

### Call site 2 — `responses.ip_hash`

Added by migration `00000000000002_survey_response_tables.sql` alongside `session_token`, `ip_hash`, and `metadata_*`. Read (null-safe) by `apps/web/src/features/survey/services/survey-engine-adapter.ts` at line 302. **Never written** by any code path the audit examined — grep of `from('responses').insert` and `from('responses').upsert` finds no writes that include `ip_hash`. The column is dead weight.

## Risks

### Unsalted hash on `invitation_validation_tokens.ip_hash`

SHA-256 of an IP address is **not a one-way function in practice**. The IPv4 address space is 2^32 (~4.3B), trivially enumerable by a modern machine (~10M hashes/s on commodity hardware → under an hour to rainbow-table the whole space). Combined with a leak of the `invitation_validation_tokens` table, an attacker could recover every originating IP.

For this table specifically, the attack surface is narrow:
- The table is short-lived (TTL ~15 minutes, rows aggressively deleted after accept).
- Service-role write only (no anon/public read path in the RLS policy in migration 38).
- The IP recovered would only tell the attacker "someone with this IP validated an invitation in the last 15 min" — a weak correlation.

Even so, the current implementation does not meet the bar for "we treat IPs as sensitive." An operator compromise (e.g. a read-only backup exfiltration) would expose every participant IP for the retention window.

### Dead column on `responses.ip_hash`

Two concerns:
1. **False sense of anonymity.** An auditor reading the schema sees `ip_hash` on a table flagged as "no user_id — structural anonymity" and may reasonably assume the application tracks source IPs for fraud detection or deduplication. It doesn't.
2. **Future-write hazard.** A well-meaning developer extending the survey-response path could populate the column without realizing the column is meant to be unsalted-hash-of-raw-IP and the same rainbow-table attack applies — except now every survey respondent's IP is exposed, not a 15-minute rate-limit bucket.

## Decision

### For `invitation_validation_tokens.ip_hash`

**Keep the column; document the salting strategy inline in the migration; defer the code change to a follow-up migration.**

Salt addition is straightforward (introduce an `INVITATION_IP_HASH_SALT` env var, concatenate before hashing) but belongs in a dedicated security PR rather than riding on a polish wave. Rotating salts would invalidate in-flight validation grants, so the first salt rollout must coincide with a 15-minute grace period where the rate-limit table is effectively empty — this is non-trivial and deserves its own design note.

### For `responses.ip_hash`

**Recommend dropping the column in a future migration.** No code writes it, no product requirement justifies it, and it's a structural-anonymity violation in spirit (see `_wireframes/` philosophy: "Don't *promise* anonymity — *enforce it architecturally*"). This decision is recorded here; the actual migration is out of scope for this wave.

## Consequences

### Immediate (this wave)

- Add a documentation block to `supabase/migrations/00000000000002_survey_response_tables.sql` flagging `responses.ip_hash` as dead weight slated for removal.
- Add a documentation block to `supabase/migrations/00000000000038_invitation_validation_tokens.sql` describing the unsalted-hash limitation and linking to this ADR.

### Future (tracked in backlog, not this wave)

- **Salt `invitation_validation_tokens.ip_hash`:**
  - Introduce `INVITATION_IP_HASH_SALT` secret (32+ bytes, stored in `supabase/config.toml` env or Vercel env — never in-repo).
  - Update `fingerprintIp()` to concatenate salt before `crypto.subtle.digest`.
  - Rotation policy: rotate on security-incident response only. The 15-min TTL makes scheduled rotation low-value; incident rotation invalidates all in-flight grants, which is acceptable.
- **Drop `responses.ip_hash`:**
  - New migration, e.g. `ALTER TABLE responses DROP COLUMN ip_hash;`.
  - Remove the dead read in `survey-engine-adapter.ts:302`.
  - Regenerate `packages/types/src/database.types.ts`.

## Alternatives considered

- **Salt `invitation_validation_tokens.ip_hash` now.** Rejected for this wave: polish wave is not the right venue for a salt-rollout operation that deserves its own change window and incident-response runbook. The documentation this wave adds ensures the issue is not forgotten.
- **Switch to HMAC instead of salt-concatenation.** Both are effectively equivalent at this threat level; the salt-concat variant is simpler. If we ever extend this beyond rate-limit buckets, HMAC is the right default.
- **Drop `invitation_validation_tokens.ip_hash` entirely and rate-limit by email.** Rejected — invitation email is the *target* of the rate-limit, so rate-limiting by email provides zero protection against an attacker spraying one email from many IPs.
