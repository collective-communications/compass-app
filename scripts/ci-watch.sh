#!/usr/bin/env bash
# Watch the CI workflow run for the current HEAD commit.
# Polls GitHub Actions until the run appears, then streams progress.
#
# Usage:
#   scripts/ci-watch.sh              # watch CI for HEAD
#   scripts/ci-watch.sh --deploy     # also watch the Deploy workflow

set -euo pipefail

WATCH_DEPLOY=false
if [ "${1:-}" = "--deploy" ]; then
  WATCH_DEPLOY=true
fi

# Verify gh CLI
if ! command -v gh &>/dev/null; then
  echo "Error: gh CLI not found. Install from https://cli.github.com"
  exit 1
fi

COMMIT=$(git rev-parse HEAD)
SHORT=$(git rev-parse --short HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo ""
echo "Watching CI for commit $SHORT on $BRANCH..."
echo "─────────────────────────────────────────────"
echo ""

# Poll for the CI run to appear (GitHub Actions has a delay)
MAX_WAIT=60
WAITED=0
RUN_ID=""

while [ -z "$RUN_ID" ] && [ $WAITED -lt $MAX_WAIT ]; do
  RUN_ID=$(gh run list \
    --commit "$COMMIT" \
    --workflow "CI" \
    --limit 1 \
    --json databaseId \
    --jq '.[0].databaseId // empty' 2>/dev/null || true)

  if [ -z "$RUN_ID" ]; then
    if [ $WAITED -eq 0 ]; then
      printf "  Waiting for CI run to start"
    fi
    printf "."
    sleep 3
    WAITED=$((WAITED + 3))
  fi
done

if [ -z "$RUN_ID" ]; then
  echo ""
  echo "  No CI run found after ${MAX_WAIT}s. Check GitHub Actions manually."
  exit 1
fi

echo ""
echo "  CI run found: $RUN_ID"
echo ""

# Watch the CI run
gh run watch "$RUN_ID" --compact --exit-status
CI_EXIT=$?

if [ $CI_EXIT -ne 0 ]; then
  echo ""
  echo "CI failed. View details:"
  echo "  gh run view $RUN_ID --log-failed"
  exit $CI_EXIT
fi

echo ""
echo "CI passed."

# Optionally watch Deploy
if [ "$WATCH_DEPLOY" = true ] && [ "$BRANCH" = "main" ]; then
  echo ""
  echo "Watching Deploy workflow..."
  echo ""

  DEPLOY_ID=""
  WAITED=0

  while [ -z "$DEPLOY_ID" ] && [ $WAITED -lt $MAX_WAIT ]; do
    DEPLOY_ID=$(gh run list \
      --workflow "Deploy" \
      --limit 1 \
      --json databaseId,headSha \
      --jq ".[] | select(.headSha == \"$COMMIT\") | .databaseId" 2>/dev/null || true)

    if [ -z "$DEPLOY_ID" ]; then
      sleep 5
      WAITED=$((WAITED + 5))
    fi
  done

  if [ -n "$DEPLOY_ID" ]; then
    gh run watch "$DEPLOY_ID" --compact --exit-status
  else
    echo "  No Deploy run triggered (may have been skipped)."
  fi
fi
