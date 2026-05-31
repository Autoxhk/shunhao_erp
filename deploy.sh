#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/home/ubuntu/shunhao_erp"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_SERVICE="shunhao-erp-backend.service"
HOST_HEADER="data.shunhaoparts.com"

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

retry() {
  local attempts="$1"
  local delay_seconds="$2"
  shift 2

  local attempt
  for attempt in $(seq 1 "$attempts"); do
    if "$@"; then
      return 0
    fi
    if [[ "$attempt" -lt "$attempts" ]]; then
      sleep "$delay_seconds"
    fi
  done

  return 1
}

require_clean_tracked_files() {
  local status
  status="$(git status --porcelain --untracked-files=no)"
  if [[ -n "$status" ]]; then
    printf '%s\n' "$status"
    fail 'Detected tracked local changes. Commit, stash, or discard them before deploying.'
  fi
}

main() {
  cd "$ROOT_DIR"

  log 'Checking tracked local changes'
  require_clean_tracked_files

  log 'Fetching latest code'
  git fetch origin

  log 'Pulling origin/main'
  git pull --ff-only origin main

  log 'Installing frontend dependencies'
  cd "$FRONTEND_DIR"
  npm install

  log 'Building frontend assets'
  npm run build

  log 'Restarting backend service'
  sudo systemctl restart "$BACKEND_SERVICE"

  log 'Reloading nginx'
  sudo systemctl reload nginx

  log 'Verifying service health'
  systemctl is-active "$BACKEND_SERVICE" nginx >/dev/null
  retry 10 1 curl -fsS http://127.0.0.1:5001/api/health >/dev/null || fail 'Backend health check failed after restart.'
  retry 10 1 curl -fkIsS https://127.0.0.1 -H "Host: $HOST_HEADER" >/dev/null || fail 'Nginx HTTPS health check failed after reload.'

  log 'Deployment completed successfully'
}

main "$@"