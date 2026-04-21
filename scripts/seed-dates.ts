/**
 * Relative seed-date anchors for the dev seed (`scripts/seed-dev.ts`).
 *
 * Deployment `opens_at` / `closes_at` values are expressed relative to "now"
 * so the seed never ages out of date. Living in its own module keeps this
 * pure-function importable from tests without triggering the seed script's
 * top-level env-loader + Supabase client construction.
 */

/**
 * Returns ISO-8601 deployment date anchors relative to the current clock.
 *
 * @remarks
 *   - `activeOpens` / `activeCloses`  — the "primary active" window (-30d → +60d).
 *   - `expiredOpens` / `expiredCloses` — fully in the past (-120d → -30d).
 *   - `futureOpens` / `futureCloses`   — entirely in the future (+180d → +365d).
 */
export function seedDates(): {
  activeOpens: string;
  activeCloses: string;
  expiredOpens: string;
  expiredCloses: string;
  futureOpens: string;
  futureCloses: string;
} {
  const now = new Date();
  const days = (d: number): string =>
    new Date(now.getTime() + d * 24 * 60 * 60 * 1000).toISOString();
  return {
    activeOpens: days(-30),
    activeCloses: days(60),
    expiredOpens: days(-120),
    expiredCloses: days(-30),
    futureOpens: days(180),
    futureCloses: days(365),
  };
}
