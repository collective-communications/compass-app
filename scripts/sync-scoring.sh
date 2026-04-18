#!/usr/bin/env bash
# sync-scoring.sh — Copy packages/scoring/src → supabase/functions/_shared/scoring
#
# The edge function runtime (Deno) cannot resolve workspace imports like
# `@compass/scoring`. To avoid drift, this script copies the canonical pure
# TypeScript sources into the edge function tree and rewrites `.js` relative
# import specifiers to `.ts` so Deno can load them.
#
# Usage:
#   scripts/sync-scoring.sh
#
# Requires: Bash 3.2 (macOS default).
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

SRC_DIR="$REPO_ROOT/packages/scoring/src"
DEST_DIR="$REPO_ROOT/supabase/functions/_shared/scoring"

if [ ! -d "$SRC_DIR" ]; then
  echo "error: source directory not found: $SRC_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

# Copy every non-test .ts file; rewrite .js specifiers → .ts for Deno.
for src_file in "$SRC_DIR"/*.ts; do
  [ -f "$src_file" ] || continue
  base="$( basename "$src_file" )"
  case "$base" in
    *.test.ts) continue ;;
    index.ts) continue ;; # handled below
  esac

  # Rewrite relative '.js' import specifiers → '.ts' for Deno resolution.
  sed -E "s|(from '\\.[^']*)\\.js'|\\1.ts'|g; s|(from \"\\.[^\"]*)\\.js\"|\\1.ts\"|g" \
    "$src_file" > "$DEST_DIR/$base"
done

# Generate the re-export barrel with the required header.
{
  printf '// AUTO-COPIED from packages/scoring/src. Edit the canonical source, then re-run scripts/sync-scoring.sh.\n'
  sed -E "s|(from '\\.[^']*)\\.js'|\\1.ts'|g; s|(from \"\\.[^\"]*)\\.js\"|\\1.ts\"|g" \
    "$SRC_DIR/index.ts"
} > "$DEST_DIR/index.ts"

echo "synced $( ls "$DEST_DIR" | wc -l | tr -d ' ' ) files → $DEST_DIR"
