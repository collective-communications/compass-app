/**
 * Commitlint configuration.
 *
 * Enforces Conventional Commits on every commit via the commit-msg hook
 * (installed from scripts/hooks/commit-msg on `bun install`).
 *
 * Rule overrides from @commitlint/config-conventional:
 *   - scope-empty: 'never' — every commit MUST include a scope, e.g.
 *     `feat(survey): ...`, `fix(auth): ...`, `chore(ci): ...`.
 *
 * See https://commitlint.js.org/ for the full rule reference.
 */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
  },
};
