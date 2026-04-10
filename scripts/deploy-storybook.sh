#!/usr/bin/env bash
# Build and deploy Storybook to Cloudflare Pages
#
# Prerequisites:
#   - wrangler CLI installed (npm install -g wrangler)
#   - CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN set in environment
#     (or in ../.env at the ccc_app root)
#
# Usage:
#   ./scripts/deploy-storybook.sh          # build + deploy
#   ./scripts/deploy-storybook.sh --skip-build  # deploy existing build only
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
PROJECT_NAME="ccc-storybook"
BUILD_DIR="${PROJECT_ROOT}/apps/storybook/storybook-static"

# Load env from parent directory if available
for envfile in "${PROJECT_ROOT}/../.env" "${PROJECT_ROOT}/.env"; do
  if [[ -f "${envfile}" ]]; then
    set -a
    source "${envfile}"
    set +a
    break
  fi
done

# Validate tooling
if ! command -v wrangler &>/dev/null; then
  echo "ERROR: wrangler not installed. Run: npm install -g wrangler"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_ACCOUNT_ID not set."
  echo "Export it or add to .env"
  exit 1
fi

# Build unless --skip-build
if [[ "${1:-}" != "--skip-build" ]]; then
  echo "Building Storybook..."
  (cd "${PROJECT_ROOT}" && bun run build-storybook)
fi

if [[ ! -d "${BUILD_DIR}" ]]; then
  echo "ERROR: Build directory not found: ${BUILD_DIR}"
  echo "Run 'bun run build-storybook' first."
  exit 1
fi

echo ""
echo "Deploying ${BUILD_DIR} → ${PROJECT_NAME}.pages.dev"
wrangler pages deploy "${BUILD_DIR}" --project-name="${PROJECT_NAME}"
