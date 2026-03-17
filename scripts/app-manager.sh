#!/usr/bin/env bash
# compass-app service manager
# Usage: app-manager.sh {start|stop|restart|status} [--only <svc>]
#
# Services (start order):
#   tkr-kit       Koji + Observability + Dashboard  :42001 :42002 :42005
#   tkr-secrets   Vault UI                          :42042
#   tkr-deploy    Deploy dashboard                  :42043
#   storybook     Storybook dev server              :6006
#
# Bash 3.2 compatible (macOS default).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STATE_DIR="$ROOT_DIR/.app-manager"
PID_DIR="$STATE_DIR/pids"
LOG_DIR="$STATE_DIR/logs"

mkdir -p "$PID_DIR" "$LOG_DIR"

# ── Service lookup (bash 3.2 — no associative arrays) ───────────────────────

svc_dir() {
  case "$1" in
    tkr-kit)     echo "$ROOT_DIR/tkr-kit" ;;
    tkr-secrets) echo "$ROOT_DIR/tkr-secrets" ;;
    tkr-deploy)  echo "$ROOT_DIR/tkr-deploy" ;;
    storybook)   echo "$ROOT_DIR" ;;
  esac
}

svc_cmd() {
  case "$1" in
    tkr-kit)     echo "bun run dev:start" ;;
    tkr-secrets) echo "bun run dev" ;;
    tkr-deploy)  echo "bun run dev" ;;
    storybook)   echo "bun run storybook" ;;
  esac
}

svc_urls() {
  case "$1" in
    tkr-kit)
      echo "    Dashboard:     http://localhost:42001"
      echo "    Koji:          http://localhost:42002"
      echo "    Observability: http://localhost:42005"
      ;;
    tkr-secrets)
      echo "    Vault UI:      http://localhost:42042"
      ;;
    tkr-deploy)
      echo "    Deploy:        http://localhost:42043"
      ;;
    storybook)
      echo "    Storybook:     http://localhost:6006"
      ;;
  esac
}

ALL_SERVICES="tkr-kit tkr-secrets tkr-deploy storybook"

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

start_background_svc() {
  local svc="$1"
  if is_running "$svc"; then
    echo "  $svc already running (PID $(get_pid "$svc"))"
    return 0
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
  for svc in storybook tkr-deploy tkr-secrets tkr-kit; do
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
