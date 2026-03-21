#!/usr/bin/env bash
# compass-app service manager
# Usage: app-manager.sh {start|stop|restart|status} [--only <svc>]
#
# Services (start order):
#   tkr-secrets   Vault UI                          :$SECRETS_PORT (default 42042)
#   tkr-deploy    Deploy dashboard                  :$DEPLOY_PORT (default 42043)
#   storybook     Storybook dev server              :$STORYBOOK_PORT (default 6006)
#   web           Compass web app (Vite)            :$PORT (default 42333) — last, needs secrets
#
# Ports are read from .env.local at the monorepo root.
#
# Bash 3.2 compatible (macOS default).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.app-manager"
PID_DIR="$STATE_DIR/pids"
LOG_DIR="$STATE_DIR/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

# ── Load ports from .env.local ────────────────────────────────────────────────

_env_val() {
  # Read a key=value from .env.local; return default if not found
  local key="$1" default="$2"
  if [ -f "$ROOT_DIR/.env.local" ]; then
    local val
    val=$(grep -E "^${key}=" "$ROOT_DIR/.env.local" 2>/dev/null | head -1 | cut -d= -f2)
    if [ -n "$val" ]; then echo "$val"; return; fi
  fi
  echo "$default"
}

WEB_PORT=$(_env_val PORT 42333)
SECRETS_PORT=$(_env_val SECRETS_PORT 42032)
DEPLOY_PORT=$(_env_val DEPLOY_PORT 42033)
STORYBOOK_PORT=$(_env_val STORYBOOK_PORT 42031)

# ── Service lookup (bash 3.2 — no associative arrays) ───────────────────────

svc_dir() {
  case "$1" in
    web)         echo "$ROOT_DIR" ;;
    tkr-kit)     echo "$ROOT_DIR/tkr-kit" ;;
    tkr-secrets) echo "$ROOT_DIR/tkr-secrets" ;;
    tkr-deploy)  echo "$ROOT_DIR/tkr-deploy" ;;
    storybook)   echo "$ROOT_DIR" ;;
  esac
}

svc_cmd() {
  case "$1" in
    web)         echo "bun run dev" ;;
    tkr-kit)     echo "bun run dev:start" ;;
    tkr-secrets) echo "env PORT=${SECRETS_PORT} bun run dev" ;;
    tkr-deploy)  echo "env DEPLOY_PORT=${DEPLOY_PORT} VAULT_URL=http://localhost:${SECRETS_PORT} bun run dev" ;;
    storybook)   echo "bun run storybook -- -p ${STORYBOOK_PORT} --ci" ;;
  esac
}

svc_port() {
  case "$1" in
    web)         echo "$WEB_PORT" ;;
    tkr-secrets) echo "$SECRETS_PORT" ;;
    tkr-deploy)  echo "$DEPLOY_PORT" ;;
    storybook)   echo "$STORYBOOK_PORT" ;;
    *)           echo "" ;;
  esac
}

svc_urls() {
  case "$1" in
    web)
      echo "    Compass App:   http://localhost:${WEB_PORT}"
      ;;
    tkr-kit)
      echo "    Dashboard:     http://localhost:42001"
      echo "    Koji:          http://localhost:42002"
      echo "    Observability: http://localhost:42005"
      ;;
    tkr-secrets)
      echo "    Vault UI:      http://localhost:${SECRETS_PORT}"
      ;;
    tkr-deploy)
      echo "    Deploy:        http://localhost:${DEPLOY_PORT}"
      ;;
    storybook)
      echo "    Storybook:     http://localhost:${STORYBOOK_PORT}"
      ;;
  esac
}

ALL_SERVICES="tkr-secrets tkr-deploy storybook web"

# ── Helpers ──────────────────────────────────────────────────────────────────

is_running() {
  local svc="$1"
  local pidfile="$PID_DIR/${svc}.pid"
  if [ -f "$pidfile" ]; then
    local pid
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      return 0
    fi
    rm -f "$pidfile"
  fi
  return 1
}

get_pid() {
  local pidfile="$PID_DIR/${1}.pid"
  if [ -f "$pidfile" ]; then cat "$pidfile"; else echo ""; fi
}

# tkr-kit has its own service manager — delegate
start_tkr_kit() {
  echo "  Starting tkr-kit services..."
  (cd "$(svc_dir tkr-kit)" && bun run dev:start) 2>&1 | sed 's/^/    /'
  echo "managed" > "$PID_DIR/tkr-kit.pid"
}

stop_tkr_kit() {
  echo "  Stopping tkr-kit services..."
  (cd "$(svc_dir tkr-kit)" && bun run dev:stop) 2>&1 | sed 's/^/    /'
  rm -f "$PID_DIR/tkr-kit.pid"
}

status_tkr_kit() {
  (cd "$(svc_dir tkr-kit)" && bun run dev:status) 2>&1 | sed 's/^/    /'
}

wait_for_vault() {
  local retries=0
  local max_retries=15
  while [ $retries -lt $max_retries ]; do
    # Check that the vault is both reachable AND unlocked (auto-unlock may still be running)
    local status
    status=$(curl -sf "http://localhost:${SECRETS_PORT}/api/vaults/compass/status" 2>/dev/null) || true
    if echo "$status" | grep -q '"unlocked":true'; then
      return 0
    fi
    retries=$((retries + 1))
    sleep 1
  done
  return 1
}

load_vault_env() {
  local env_file="$ROOT_DIR/.env.local"
  echo "  Loading secrets from vault → .env.local"

  if ! wait_for_vault; then
    echo "    No secrets loaded (vault not ready after 10s)"
    return
  fi

  local vault_lines
  vault_lines=$(bun run "$ROOT_DIR/scripts/vault-env.ts" \
    --port "$SECRETS_PORT" --vault compass --prefix VITE_SUPABASE_ 2>/dev/null)
  if [ -z "$vault_lines" ]; then
    echo "    No secrets loaded (vault may be locked or unavailable)"
    return
  fi

  # Merge: update existing keys in-place, append new ones
  local count=0
  while IFS='=' read -r key value; do
    [ -z "$key" ] && continue
    if grep -qE "^${key}=" "$env_file" 2>/dev/null; then
      # Update existing line
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$env_file"
    else
      # Append new key
      echo "${key}=${value}" >> "$env_file"
    fi
    count=$((count + 1))
  done <<< "$vault_lines"
  echo "    Synced $count secret(s)"
}

start_background_svc() {
  local svc="$1"
  if is_running "$svc"; then
    echo "  $svc already running (PID $(get_pid "$svc"))"
    return 0
  fi

  # tkr-deploy needs the vault to be ready before connecting
  if [ "$svc" = "tkr-deploy" ] && is_running "tkr-secrets"; then
    echo "    Waiting for vault..."
    wait_for_vault || echo "    Warning: vault not ready, tkr-deploy may retry"
  fi

  # Web needs VITE_* secrets from the vault before starting
  if [ "$svc" = "web" ] && is_running "tkr-secrets"; then
    load_vault_env
  fi

  echo "  Starting $svc..."
  local logfile="$LOG_DIR/${svc}.log"
  local dir
  dir="$(svc_dir "$svc")"
  local cmd
  cmd="$(svc_cmd "$svc")"
  (cd "$dir" && nohup $cmd > "$logfile" 2>&1 &
    echo $! > "$PID_DIR/${svc}.pid"
  )
  sleep 1
  if is_running "$svc"; then
    echo "    PID $(get_pid "$svc") — log: $logfile"
  else
    echo "    FAILED — check $logfile"
    return 1
  fi
}

stop_background_svc() {
  local svc="$1"
  if ! is_running "$svc"; then
    echo "  $svc not running"
    # Clean up orphans holding the port
    local port
    port="$(svc_port "$svc")"
    if [ -n "$port" ]; then
      local orphan
      orphan=$(lsof -i ":${port}" -t 2>/dev/null | head -1)
      if [ -n "$orphan" ]; then
        echo "    Killing orphan process on port $port (PID $orphan)"
        kill "$orphan" 2>/dev/null || true
        sleep 1
        kill -0 "$orphan" 2>/dev/null && kill -9 "$orphan" 2>/dev/null || true
      fi
    fi
    rm -f "$PID_DIR/${svc}.pid"
    return 0
  fi
  local pid
  pid=$(get_pid "$svc")
  echo "  Stopping $svc (PID $pid)..."
  kill "$pid" 2>/dev/null || true
  local waited=0
  while kill -0 "$pid" 2>/dev/null && [ $waited -lt 5 ]; do
    sleep 1
    waited=$((waited + 1))
  done
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  rm -f "$PID_DIR/${svc}.pid"
  echo "    Stopped."
}

# ── Commands ─────────────────────────────────────────────────────────────────

cmd_start() {
  local filter="$1"
  echo ""
  echo "Starting compass-app services..."
  echo "─────────────────────────────────────────────"

  for svc in $ALL_SERVICES; do
    if [ -n "$filter" ] && [ "$svc" != "$filter" ]; then continue; fi
    echo ""
    if [ "$svc" = "tkr-kit" ]; then
      start_tkr_kit
    else
      start_background_svc "$svc"
    fi
  done

  echo ""
  echo "─────────────────────────────────────────────"
  echo "URLs:"
  echo ""
  for svc in $ALL_SERVICES; do
    if [ -n "$filter" ] && [ "$svc" != "$filter" ]; then continue; fi
    echo "  $svc"
    svc_urls "$svc"
  done
  echo ""
}

cmd_stop() {
  local filter="$1"
  echo ""
  echo "Stopping compass-app services..."
  echo "─────────────────────────────────────────────"

  # Reverse order
  for svc in web storybook tkr-deploy tkr-secrets; do
    if [ -n "$filter" ] && [ "$svc" != "$filter" ]; then continue; fi
    echo ""
    if [ "$svc" = "tkr-kit" ]; then
      stop_tkr_kit
    else
      stop_background_svc "$svc"
    fi
  done

  echo ""
  echo "All services stopped."
  echo ""
}

cmd_restart() {
  local filter="$1"
  cmd_stop "$filter"
  cmd_start "$filter"
}

cmd_status() {
  echo ""
  echo "compass-app service status"
  echo "─────────────────────────────────────────────"

  for svc in $ALL_SERVICES; do
    echo ""
    echo "  $svc"
    if [ "$svc" = "tkr-kit" ]; then
      status_tkr_kit
    elif is_running "$svc"; then
      echo "    RUNNING (PID $(get_pid "$svc"))"
      svc_urls "$svc"
    else
      echo "    STOPPED"
    fi
  done
  echo ""
}

# ── Main ─────────────────────────────────────────────────────────────────────

usage() {
  echo "Usage: $(basename "$0") {start|stop|restart|status} [--only <service>]"
  echo ""
  echo "Services: $ALL_SERVICES"
  exit 1
}

ACTION="${1:-}"
shift || true

FILTER=""
while [ $# -gt 0 ]; do
  case "$1" in
    --only) FILTER="$2"; shift; shift ;;
    *) usage ;;
  esac
done

case "$ACTION" in
  start)   cmd_start "$FILTER" ;;
  stop)    cmd_stop "$FILTER" ;;
  restart) cmd_restart "$FILTER" ;;
  status)  cmd_status ;;
  *)       usage ;;
esac
