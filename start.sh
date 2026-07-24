#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; cd "$project_dir"
if [ ! -f .env ]; then echo "Missing .env; copy .env.example and configure it." >&2; exit 1; fi
if [ ! -d backend/node_modules ] || [ ! -d frontend/node_modules ]; then echo "Dependencies are absent; run scripts/bootstrap.sh first." >&2; exit 1; fi
set -a; . ./.env; set +a
backend_port="${PORT:-4201}"; frontend_port="${FRONTEND_PORT:-4200}"
for port in "$backend_port" "$frontend_port"; do if command -v lsof >/dev/null && lsof -ti ":$port" >/dev/null 2>&1; then echo "Port $port is already in use; refusing to stop another process." >&2; exit 1; fi; done
if [ "${MIGRATE_ON_START:-false}" = true ]; then
  scripts/migrate.sh
  (cd backend && node scripts/provision-admin.js)
fi
(cd backend && npm start) & backend_pid=$!
(cd frontend && npm run dev -- --port "$frontend_port") & frontend_pid=$!
cleanup(){ kill "$backend_pid" "$frontend_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
wait "$backend_pid" "$frontend_pid"
