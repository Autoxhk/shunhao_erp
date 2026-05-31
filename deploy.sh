#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="/home/ubuntu/shunhao_erp"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_SERVICE="shunhao-erp-backend.service"
HOST_HEADER="data.shunhaoparts.com"
AUTO_COMMIT=0
AUTO_PUSH=0
HARD_SYNC=0
COMMIT_MESSAGE="chore: server deploy auto commit"

log() {
  printf '[deploy] %s\n' "$1"
}

fail() {
  printf '[deploy] ERROR: %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: ./deploy.sh [options]

Options:
  --auto-commit          Auto commit local changes before deployment.
  --auto-push            Push main to origin after commit/check.
  --hard-sync            Discard local tracked changes and hard reset to origin/main.
  --message <msg>        Commit message used with --auto-commit.
  --help                 Show this help message.
EOF
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

auto_commit_if_needed() {
  local status
  status="$(git status --porcelain)"
  if [[ -z "$status" ]]; then
    log 'No local changes to commit'
    return 0
  fi

  log 'Auto committing local changes'
  git add -A
  if git diff --cached --quiet; then
    log 'No staged changes after git add'
    return 0
  fi
  git commit -m "$COMMIT_MESSAGE"
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --auto-commit)
        AUTO_COMMIT=1
        shift
        ;;
      --auto-push)
        AUTO_PUSH=1
        shift
        ;;
      --hard-sync)
        HARD_SYNC=1
        shift
        ;;
      --message)
        shift
        [[ $# -gt 0 ]] || fail 'Missing value for --message'
        COMMIT_MESSAGE="$1"
        shift
        ;;
      --help|-h)
        usage
        exit 0
        ;;
      *)
        fail "Unknown option: $1"
        ;;
    esac
  done
}

main() {
  parse_args "$@"

  cd "$ROOT_DIR"

  if [[ "$HARD_SYNC" -eq 1 ]]; then
    log 'Hard syncing repository to origin/main (discard tracked local changes)'
    git fetch origin
    git reset --hard origin/main
  else
    if [[ "$AUTO_COMMIT" -eq 1 ]]; then
      auto_commit_if_needed
    else
      log 'Checking tracked local changes'
      require_clean_tracked_files
    fi

    if [[ "$AUTO_PUSH" -eq 1 ]]; then
      log 'Pushing main to origin'
      git push origin main
    fi

    log 'Fetching latest code'
    git fetch origin

    log 'Pulling origin/main'
    git pull --ff-only origin main
  fi

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