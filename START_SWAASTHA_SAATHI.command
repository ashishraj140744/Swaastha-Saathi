#!/bin/bash
# Swaastha-Saathi one-click launcher for macOS.
# Uses port 5050 for Flask to avoid macOS services that commonly occupy 5000.
set -u
exec 2>&1
ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
VENV_DIR="$BACKEND_DIR/venv"
PYTHON="$VENV_DIR/bin/python"
SECRET_FILE="$BACKEND_DIR/.jwt_secret"
BACKEND_PORT=5050
FRONTEND_PORT=8080
cd "$BACKEND_DIR" || exit 1
echo ""; echo "🩺 Starting Swaastha-Saathi..."; echo ""
if ! command -v python3 >/dev/null 2>&1; then echo "❌ Python 3 is not installed."; read -r -p "Press Return to close..."; exit 1; fi
if [ ! -d "$VENV_DIR" ]; then
  echo "🐍 Creating Python virtual environment..."
  if ! python3 -m venv "$VENV_DIR"; then echo "❌ Could not create the Python virtual environment."; read -r -p "Press Return to close..."; exit 1; fi
fi
if ! "$PYTHON" -c 'import flask, flask_cors, bcrypt, jwt, requests, dotenv' >/dev/null 2>&1; then
  echo "📦 Installing required Python packages..."
  if ! "$PYTHON" -m pip install -r requirements.txt; then
    echo "❌ Dependency installation failed."; read -r -p "Press Return to close..."; exit 1
  fi
fi
if [ ! -s "$SECRET_FILE" ]; then
  echo "🔐 Creating local JWT secret..."
  "$PYTHON" -c 'import secrets; from pathlib import Path; Path(".jwt_secret").write_text(secrets.token_urlsafe(48), encoding="utf-8")'
fi
export JWT_SECRET="$(cat "$SECRET_FILE")"
for PORT in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  PIDS=$(lsof -ti tcp:"$PORT" 2>/dev/null || true)
  if [ -n "$PIDS" ]; then echo "🧹 Clearing existing process on port $PORT..."; kill $PIDS 2>/dev/null || true; sleep 0.5; fi
done
BACKEND_PID=""
FRONTEND_PID=""
cleanup() { echo ""; echo "🛑 Stopping Swaastha-Saathi..."; [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true; [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
echo "🐍 Starting Flask backend on http://127.0.0.1:$BACKEND_PORT"
export PORT="$BACKEND_PORT"
"$PYTHON" app.py >"$BACKEND_DIR/backend.log" 2>&1 & BACKEND_PID=$!
BACKEND_READY=0
for i in {1..30}; do
  if curl -fsS "http://127.0.0.1:$BACKEND_PORT/api/health" >/dev/null 2>&1; then BACKEND_READY=1; break; fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then echo "❌ Flask stopped before becoming ready."; echo "--- Backend error ---"; cat "$BACKEND_DIR/backend.log" 2>/dev/null || true; echo "--------------------"; read -r -p "Press Return to close..."; exit 1; fi
  sleep 0.5
done
if [ "$BACKEND_READY" -ne 1 ]; then echo "❌ Flask did not become ready on port $BACKEND_PORT."; echo "--- Backend log ---"; cat "$BACKEND_DIR/backend.log" 2>/dev/null || true; echo "------------------"; read -r -p "Press Return to close..."; exit 1; fi
echo "✅ Backend is ready."
cd "$ROOT_DIR" || exit 1
echo "🌐 Starting frontend on http://localhost:$FRONTEND_PORT"
python3 -m http.server "$FRONTEND_PORT" & FRONTEND_PID=$!
for i in {1..15}; do if curl -fsS "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1; then break; fi; sleep 0.2; done
open "http://localhost:$FRONTEND_PORT"
echo ""; echo "🎉 Swaastha-Saathi is running!"; echo "Frontend: http://localhost:$FRONTEND_PORT"; echo "Backend:  http://127.0.0.1:$BACKEND_PORT"; echo ""; echo "Keep this Terminal window open while using the app."; echo ""; wait
