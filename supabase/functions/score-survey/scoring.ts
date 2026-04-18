/**
 * Pure scoring math for the score-survey edge function.
 * Re-exports the canonical scoring module from `_shared/scoring` so both
 * the edge function and the `@compass/scoring` workspace package stay in
 * lockstep. Do NOT add local logic here — edit `packages/scoring/src/*`
 * (the canonical source) and run `scripts/sync-scoring.sh`.
 */
export * from '../_shared/scoring/index.ts';
