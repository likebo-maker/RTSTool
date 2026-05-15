#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
VENV_DIR="$ROOT_DIR/.venv"
PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
URL="http://$HOST:$PORT"

log() {
  printf '[start] %s\n' "$1"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Missing command: %s\n' "$1" >&2
    exit 1
  fi
}

wait_for_server() {
  local retries=60
  while ((retries > 0)); do
    if curl -fsS "$URL/api/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
    retries=$((retries - 1))
  done

  printf 'Backend did not become ready: %s\n' "$URL" >&2
  return 1
}

frontend_ready() {
  curl -fsS "$URL" 2>/dev/null | grep -q 'id="app"'
}

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$URL"
  else
    log "Open this URL in your browser: $URL"
  fi
}

need_command python3
need_command npm
need_command curl

if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  log "Creating Python virtual environment"
  python3 -m venv "$VENV_DIR"
fi

PYTHON="$VENV_DIR/bin/python"

if ! "$PYTHON" -m pip --version >/dev/null 2>&1; then
  log "Enabling pip in virtual environment"
  "$PYTHON" -m ensurepip --upgrade
fi

if ! "$PYTHON" - <<'PY' >/dev/null 2>&1
import fastapi
import multipart
import openpyxl
import pandas
import uvicorn
PY
then
  log "Installing backend dependencies"
  "$PYTHON" -m pip install -r "$BACKEND_DIR/requirements.txt"
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  log "Installing frontend dependencies"
  npm --prefix "$FRONTEND_DIR" install
fi

log "Building frontend"
npm --prefix "$FRONTEND_DIR" run build

if curl -fsS "$URL/api/health" >/dev/null 2>&1; then
  if frontend_ready; then
    log "Backend is already running at $URL"
    open_browser
    exit 0
  fi

  printf 'Port %s is already used by an old backend process.\n' "$PORT" >&2
  printf 'Stop that process first, then run ./start.sh again.\n' >&2
  exit 1
fi

log "Starting backend at $URL"
cd "$BACKEND_DIR"
"$PYTHON" main.py &
BACKEND_PID=$!

cleanup() {
  if kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    kill "$BACKEND_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

wait_for_server
if ! frontend_ready; then
  printf 'Backend is running, but frontend page is not available at %s\n' "$URL" >&2
  exit 1
fi
open_browser

log "Running. Press Ctrl+C in this terminal to stop."
wait "$BACKEND_PID"
