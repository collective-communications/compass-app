#!/usr/bin/env bash
# Build and deploy the standalone Scoring Validation app to Cloudflare Pages.
#
# Prerequisites:
#   - wrangler CLI installed (npm install -g wrangler)
#   - CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN set in environment
#     (or in ../.env, .env, or ../tkr-document-hosting/.env)
#
# Usage:
#   ./scripts/deploy-validation.sh
#   ./scripts/deploy-validation.sh --skip-build
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${PROJECT_ROOT}/apps/validation"
BUILD_DIR="${PROJECT_ROOT}/apps/validation/dist"

# Load env from known local stores if available. Later files can provide
# credentials not present in earlier generic app env files.
for envfile in "${PROJECT_ROOT}/../.env" "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/../tkr-document-hosting/.env"; do
  if [[ -f "${envfile}" ]]; then
    set -a
    source "${envfile}"
    set +a
  fi
done

PROJECT_NAME="${VALIDATION_PAGES_PROJECT:-compass-calculations}"
DISPLAY_DOMAIN="${VALIDATION_PAGES_DOMAIN:-compass-calculations.pages.dev}"

if ! command -v wrangler &>/dev/null; then
  echo "ERROR: wrangler not installed. Run: npm install -g wrangler"
  exit 1
fi

if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "ERROR: CLOUDFLARE_ACCOUNT_ID not set."
  echo "Export it or add to .env"
  exit 1
fi

if [[ "${1:-}" != "--skip-build" ]]; then
  echo "Building Scoring Validation..."
  (cd "${PROJECT_ROOT}" && bun run validation:build)
fi

if [[ ! -d "${BUILD_DIR}" ]]; then
  echo "ERROR: Build directory not found: ${BUILD_DIR}"
  echo "Run 'bun run validation:build' first."
  exit 1
fi

echo ""
echo "Deploying ${BUILD_DIR} -> ${DISPLAY_DOMAIN}"
(cd "${APP_DIR}" && wrangler pages deploy "${BUILD_DIR}" --project-name="${PROJECT_NAME}" --commit-dirty=true)
