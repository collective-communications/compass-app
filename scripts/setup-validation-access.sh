#!/usr/bin/env bash
# Configure Cloudflare Access for the Scoring Validation Pages project.
#
# Reuses the Microsoft 365 identity provider already configured in the
# CC+C Cloudflare account, then protects the validation Pages hostname.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load env from known local stores. Later files can provide Cloudflare Access
# credentials not present in the app-specific env files.
for envfile in "${PROJECT_ROOT}/../.env" "${PROJECT_ROOT}/.env" "${PROJECT_ROOT}/../tkr-document-hosting/.env"; do
  if [[ -f "${envfile}" ]]; then
    set -a
    source "${envfile}"
    set +a
  fi
done

CF_API="https://api.cloudflare.com/client/v4"
PAGES_DOMAIN="${VALIDATION_PAGES_DOMAIN:-compass-calculations.pages.dev}"
APP_NAME="${VALIDATION_ACCESS_APP_NAME:-CC+C Scoring Validation}"

for var in CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN ALLOWED_DOMAIN; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: ${var} is not set."
    exit 1
  fi
done

python_json_field() {
  python3 -c "$1"
}

echo "=== Step 1: Find existing Microsoft 365 Identity Provider ==="
IDP_ID=$(curl -s "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/identity_providers" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  | python_json_field "import sys,json; idps=json.load(sys.stdin)['result']; print(next((i['id'] for i in idps if i['type']=='azureAD'),''))")

if [[ -z "${IDP_ID}" ]]; then
  echo "ERROR: No Microsoft identity provider found in this Cloudflare account."
  echo "Run the document-hosting setup-cloudflare-access.sh first."
  exit 1
fi
echo "Using Microsoft IDP: ${IDP_ID}"

ensure_access_app() {
  local domain="$1"
  local name="$2"

  echo ""
  echo "=== Access Application: ${domain} ==="
  local apps_response
  apps_response=$(curl -s "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

  local app_id
  app_id=$(echo "${apps_response}" | PAGES_DOMAIN="${domain}" python_json_field "import os,sys,json; apps=json.load(sys.stdin)['result']; print(next((a['id'] for a in apps if a.get('domain') == os.environ['PAGES_DOMAIN']),''))")

  if [[ -n "${app_id}" ]]; then
    echo "Using existing Access application: ${app_id}"
  else
    local app_response
    app_response=$(curl -s -X POST \
      "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      -d "{
        \"name\": \"${name}\",
        \"domain\": \"${domain}\",
        \"type\": \"self_hosted\",
        \"session_duration\": \"24h\",
        \"allowed_idps\": [\"${IDP_ID}\"],
        \"auto_redirect_to_identity\": true
      }")

    local app_success
    app_success=$(echo "${app_response}" | python_json_field "import sys,json; print(json.load(sys.stdin).get('success', False))")
    if [[ "${app_success}" == "True" ]]; then
      app_id=$(echo "${app_response}" | python_json_field "import sys,json; print(json.load(sys.stdin)['result']['id'])")
      echo "Access application created: ${app_id}"
    else
      echo "Access application response:"
      echo "${app_response}" | python3 -m json.tool
      exit 1
    fi
  fi

  local policies_response
  policies_response=$(curl -s "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${app_id}/policies" \
    -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}")

  local policy_id
  policy_id=$(echo "${policies_response}" | ALLOWED_DOMAIN="${ALLOWED_DOMAIN}" python_json_field "import os,sys,json; policies=json.load(sys.stdin)['result']; target=f\"Allow {os.environ['ALLOWED_DOMAIN']}\"; print(next((p['id'] for p in policies if p.get('name') == target),''))")

  if [[ -n "${policy_id}" ]]; then
    echo "Using existing Access policy: allow *@${ALLOWED_DOMAIN}"
  else
    local policy_response
    policy_response=$(curl -s -X POST \
      "${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/access/apps/${app_id}/policies" \
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

    local policy_success
    policy_success=$(echo "${policy_response}" | python_json_field "import sys,json; print(json.load(sys.stdin).get('success', False))")
    if [[ "${policy_success}" == "True" ]]; then
      echo "Access policy created: allow *@${ALLOWED_DOMAIN}"
    else
      echo "Policy response:"
      echo "${policy_response}" | python3 -m json.tool
      exit 1
    fi
  fi
}

echo ""
echo "=== Step 2: Ensure Access Applications and Policies ==="
ensure_access_app "${PAGES_DOMAIN}" "${APP_NAME}"

echo ""
echo "=== Done ==="
echo "Validation at https://${PAGES_DOMAIN} now requires Microsoft 365 login."
echo "Only users with @${ALLOWED_DOMAIN} email addresses can access it."
