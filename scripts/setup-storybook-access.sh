#!/usr/bin/env bash
# Configure Cloudflare Access for Storybook Pages project.
#
# This reuses the existing Microsoft 365 identity provider already
# registered in the CC+C Cloudflare account. It creates a new Access
# application and policy for the Storybook domain.
#
# Prerequisites:
#   - Cloudflare Pages project "ccc-storybook" already created
#     (run: wrangler pages project create ccc-storybook)
#   - Environment variables set (see below)
#
# Required environment variables:
#   CLOUDFLARE_ACCOUNT_ID   — Cloudflare account ID
#   CLOUDFLARE_API_TOKEN    — Cloudflare API token (Access permissions)
#   ALLOWED_DOMAIN          — Email domain to allow (e.g., collectivecommunication.ca)
#
# Optional:
#   STORYBOOK_PAGES_DOMAIN  — Override domain (default: ccc-storybook.pages.dev)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load env
for envfile in "${PROJECT_ROOT}/../.env" "${PROJECT_ROOT}/.env"; do
  if [[ -f "${envfile}" ]]; then
    set -a
    source "${envfile}"
    set +a
    echo "Loaded ${envfile}"
    break
  fi
done

CF_API="https://api.cloudflare.com/client/v4"
PAGES_DOMAIN="${STORYBOOK_PAGES_DOMAIN:-ccc-storybook.pages.dev}"

# Validate
for var in CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN ALLOWED_DOMAIN; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: ${var} is not set."
    exit 1
  fi
done

echo "=== Step 1: Find existing Microsoft 365 Identity Provider ==="
IDP_ID=$(curl -s "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  | python3 -c "import sys,json; idps=json.load(sys.stdin)['result']; print(next((i['id'] for i in idps if i['type']=='azureAD'),''))")

if [[ -z "${IDP_ID}" ]]; then
  echo "ERROR: No Microsoft identity provider found in this Cloudflare account."
  echo "Run the document-hosting setup-cloudflare-access.sh first."
  exit 1
fi
echo "Using Microsoft IDP: ${IDP_ID}"

echo ""
echo "=== Step 2: Create Access Application for Storybook ==="
APP_RESPONSE=$(curl -s -X POST \
  "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"CC+C Storybook\",
    \"domain\": \"${PAGES_DOMAIN}\",
    \"type\": \"self_hosted\",
    \"session_duration\": \"24h\",
    \"allowed_idps\": [\"${IDP_ID}\"],
    \"auto_redirect_to_identity\": true
  }")

APP_SUCCESS=$(echo "${APP_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")
if [[ "${APP_SUCCESS}" == "True" ]]; then
  APP_ID=$(echo "${APP_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['id'])")
  echo "Access application created: ${APP_ID}"
else
  echo "Access application response:"
  echo "${APP_RESPONSE}" | python3 -m json.tool
  exit 1
fi

echo ""
echo "=== Step 3: Create Access Policy ==="
POLICY_RESPONSE=$(curl -s -X POST \
  "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${APP_ID}/policies" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Allow ${ALLOWED_DOMAIN}\",
    \"decision\": \"allow\",
    \"include\": [
      {
        \"email_domain\": {
          \"domain\": \"${ALLOWED_DOMAIN}\"
        }
      }
    ],
    \"precedence\": 1
  }")

POLICY_SUCCESS=$(echo "${POLICY_RESPONSE}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))")
if [[ "${POLICY_SUCCESS}" == "True" ]]; then
  echo "Access policy created: allow *@${ALLOWED_DOMAIN}"
else
  echo "Policy response:"
  echo "${POLICY_RESPONSE}" | python3 -m json.tool
fi

echo ""
echo "=== Done ==="
echo ""
echo "Storybook at https://${PAGES_DOMAIN} now requires Microsoft 365 login."
echo "Only users with @${ALLOWED_DOMAIN} email addresses can access it."
