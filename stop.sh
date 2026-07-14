#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────
#  Sistema de Calidad — Script de parada
# ─────────────────────────────────────────────────────────

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDS_FILE="$ROOT/.pids"

RED="\033[0;31m"; GREEN="\033[0;32m"; CYAN="\033[0;36m"; RESET="\033[0m"

log()  { echo -e "${CYAN}[Sistema Calidad]${RESET} $*"; }
ok()   { echo -e "${GREEN}✔${RESET}  $*"; }
err()  { echo -e "${RED}✘${RESET}  $*"; }

kill_pid() {
    local name=$1 pid=$2
    if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null
        sleep 1
        if kill -0 "$pid" 2>/dev/null; then
            kill -9 "$pid" 2>/dev/null
        fi
        ok "$name (PID $pid) detenido"
    else
        err "$name (PID $pid) ya no estaba corriendo"
    fi
}

if [ ! -f "$PIDS_FILE" ]; then
    log "No se encontró .pids — la aplicación no parece estar corriendo."
    exit 0
fi

source "$PIDS_FILE"

log "Deteniendo servicios…"
[ -n "$BACKEND_PID" ]  && kill_pid "Backend"  "$BACKEND_PID"
[ -n "$FRONTEND_PID" ] && kill_pid "Frontend" "$FRONTEND_PID"

# Limpiar procesos hijo de uvicorn/vite por si quedan huérfanos
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "vite"                 2>/dev/null || true

rm -f "$PIDS_FILE"

echo ""
echo -e "${GREEN}Aplicación detenida correctamente.${RESET}"
