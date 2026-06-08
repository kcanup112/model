#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# starter.sh — Bootstrap the IOE Mock Exam database on the VPS
#
# Run this from the REPO ROOT on the VPS (not inside a container):
#
#   bash server/starter.sh
#
# Requirements:
#   • Docker must be running
#   • docker compose up -d  (postgres + redis) must already be up
#     OR run with --start flag to start the stack automatically:
#       bash server/starter.sh --start
#
# What it does:
#   Spins up a temporary `seeder` container (built from the full build stage
#   so ts-node-dev is available), runs all 6 seed steps, then removes itself.
#
#   1. prisma migrate deploy
#   2. seed.ts          — admin user, subjects, topics, hero slides
#   3. seed-levels.ts   — 50 level configs
#   4. seed-english.ts  — English grammar / phonetics / comprehension
#   5. seed-mcq.ts      — Chemistry & Physics MCQs (questions.json)
#   6. seed-scanned.ts  — Scanned Physics chapter questions
#
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "\n${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }

# ── Locate repo root ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# starter.sh lives in server/, so repo root is one level up
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$REPO_ROOT"
step "Repo root: $(pwd)"

# ── Parse flags ──────────────────────────────────────────────────────────────
START_STACK=false
for arg in "$@"; do
  [ "$arg" = "--start" ] && START_STACK=true
done

# ── Check Docker is running ───────────────────────────────────────────────────
docker info >/dev/null 2>&1 || fail "Docker is not running. Start Docker and re-run this script."

# ── Optionally start the stack ────────────────────────────────────────────────
if $START_STACK; then
  step "Starting postgres + redis (docker compose up -d postgres redis)"
  docker compose up -d postgres redis
  ok "Stack started"
else
  # Verify postgres is reachable before wasting time on the build
  docker compose ps postgres | grep -q "healthy\|running" \
    || warn "postgres container does not appear healthy — the seeder will wait for it; use --start to auto-start it"
fi

# ── Build and run the seeder container ────────────────────────────────────────
step "Building seeder image (reuses build-stage cache — fast after first run)"
docker compose --profile seed build seeder

step "Running seeder — this seeds all 6 steps then the container exits"
docker compose --profile seed run --rm seeder

ok "Seeder container exited cleanly"

echo ""
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✔  Bootstrap complete — database is ready!  ${NC}"
echo -e "${GREEN}══════════════════════════════════════════════${NC}"
echo ""
echo "  Admin credentials (change after first login):"
echo "    Email   : admin@kec.edu.np"
echo "    Password: admin123"
echo ""
echo "  Next: start the full stack with"
echo "    docker compose up -d"
echo ""