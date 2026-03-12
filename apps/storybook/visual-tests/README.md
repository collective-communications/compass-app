# Visual Regression Tests

## Running

```bash
# First build Storybook
bun run build-storybook

# Run visual tests (compares against baselines)
bun run test:visual

# Update baselines after intentional visual changes
bun run test:visual:update
```

## How it works

Each story is screenshotted across:
- 2 viewports: mobile (375px) and desktop (1280px)
- 2 themes: light and dark

Screenshots are compared against committed baselines in `__snapshots__/`.

## Adding visual tests

1. Create `apps/storybook/visual-tests/component-name.spec.ts`
2. Use the `storyUrl()` helper to construct URLs with theme globals
3. Loop over `THEMES` to capture both variants
4. Run `bun run test:visual:update` to generate initial baselines
5. Commit the baselines
