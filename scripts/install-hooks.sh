#!/usr/bin/env bash
# Install git hooks from scripts/hooks/ into .git/hooks/
# Called automatically via `bun install` (package.json "prepare" script).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
HOOKS_SRC="$ROOT_DIR/scripts/hooks"
HOOKS_DST="$ROOT_DIR/.git/hooks"

if [ ! -d "$HOOKS_SRC" ]; then
  exit 0
fi

for hook in "$HOOKS_SRC"/*; do
  [ -f "$hook" ] || continue
  name="$(basename "$hook")"
  cp "$hook" "$HOOKS_DST/$name"
  chmod +x "$HOOKS_DST/$name"
done
