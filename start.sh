#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Sistema de Calidad — Script de inicio
# ─────────────────────────────────────────────────────────
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
PIDS_FILE="$ROOT/.pids"

# ── Colores ──────────────────────────────────────────────
GREEN="\033[0;32m"; CYAN="\033[0;36m"; YELLOW="\033[1;33m"; RESET="\033[0m"

log()  { echo -e "${CYAN}[Sistema Calidad]${RESET} $*"; }
ok()   { echo -e "${GREEN}✔${RESET}  $*"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $*"; }

# ── Verificar que no haya instancias previas ─────────────
if [ -f "$PIDS_FILE" ]; then
    warn "La aplicación parece estar corriendo ya (existe .pids)."
    warn "Ejecuta ./stop.sh primero si quieres reiniciarla."
    exit 1
fi

# ── MariaDB ───────────────────────────────────────────────
log "Verificando MariaDB (puerto 3307)…"
if ! ss -tlnp 2>/dev/null | grep -q ':3307 '; then
    warn "MariaDB no está corriendo. Iníciala manualmente y vuelve a ejecutar este script."
    exit 1
fi
ok "MariaDB activa en puerto 3307"

# ── Backend (FastAPI) ─────────────────────────────────────
log "Iniciando backend FastAPI…"
cd "$BACKEND"
nohup venv/bin/python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload \
    > "$ROOT/logs/backend.log" 2>&1 &
BACKEND_PID=$!
ok "Backend PID $BACKEND_PID  →  http://localhost:8001"
ok "Docs API:  http://localhost:8001/docs"

# ── Frontend (Vite) ───────────────────────────────────────
log "Iniciando frontend React…"
cd "$FRONTEND"
nohup npm run dev \
    > "$ROOT/logs/frontend.log" 2>&1 &
FRONTEND_PID=$!
ok "Frontend PID $FRONTEND_PID  →  http://localhost:5173"

# ── Guardar PIDs ─────────────────────────────────────────
echo "BACKEND_PID=$BACKEND_PID" > "$PIDS_FILE"
echo "FRONTEND_PID=$FRONTEND_PID" >> "$PIDS_FILE"

echo ""
echo -e "${GREEN}────────────────────────────────────────${RESET}"
echo -e "${GREEN}  Aplicación corriendo                  ${RESET}"
echo -e "${GREEN}  Frontend : http://localhost:5173       ${RESET}"
echo -e "${GREEN}  API docs  : http://localhost:8001/docs ${RESET}"
echo -e "${GREEN}  Logs      : ./logs/                   ${RESET}"
echo -e "${GREEN}  Para detener: ./stop.sh               ${RESET}"
echo -e "${GREEN}────────────────────────────────────────${RESET}"
