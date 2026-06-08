#!/bin/sh
# ─────────────────────────────────────────────────────────────────────────────
# starter-inner.sh — runs INSIDE the seeder container (do not call directly)
# Called by docker-compose seeder service, which is triggered by starter.sh
# ─────────────────────────────────────────────────────────────────────────────
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RED='\033[0;31m'; NC='\033[0m'
step() { printf "\n${CYAN}▶ %s${NC}\n" "$1"; }
ok()   { printf "${GREEN}✔ %s${NC}\n" "$1"; }
warn() { printf "${YELLOW}⚠ %s${NC}\n" "$1"; }

# ── Step 1: Migrate ───────────────────────────────────────────────────────────
step "Step 1/6 — Applying Prisma migrations"
npx prisma migrate deploy
ok "Migrations applied"

# ── Step 2: Base seed ────────────────────────────────────────────────────────
step "Step 2/6 — Seeding admin, subjects, topics and sample questions"
npx ts-node-dev --transpile-only prisma/seed.ts
ok "Base seed complete"

# ── Step 3: Level configurations ─────────────────────────────────────────────
step "Step 3/6 — Seeding 50 level configurations"
npx ts-node-dev --transpile-only prisma/seed-levels.ts
ok "Levels seeded"

# ── Step 4: English questions ─────────────────────────────────────────────────
step "Step 4/6 — Seeding English questions"
if [ -d "/scan/english" ] && ls /scan/english/*.json >/dev/null 2>&1; then
  # seed-english.ts resolves scan/english relative to repo root; point it there
  SCAN_DIR=/scan npx ts-node-dev --transpile-only prisma/seed-english.ts
  ok "English questions seeded"
else
  warn "scan/english/*.json not found — skipping (mount the scan folder if needed)"
fi

# ── Step 5: Chemistry & Physics MCQs ─────────────────────────────────────────
step "Step 5/6 — Seeding Chemistry & Physics MCQs"
if [ -f "/app/questions.json" ]; then
  npx ts-node-dev --transpile-only prisma/seed-mcq.ts
  ok "MCQ questions seeded"
else
  warn "questions.json not found — skipping MCQ seed"
fi

# ── Step 6: Scanned Physics questions ────────────────────────────────────────
step "Step 6/6 — Seeding scanned Physics chapter questions"
if [ -d "/scan/physics" ] && [ "$(ls -A /scan/physics)" ]; then
  SCAN_DIR=/scan npx ts-node-dev --transpile-only prisma/seed-scanned.ts
  ok "Scanned questions seeded"
else
  warn "scan/physics/ not found — skipping scanned seed"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
printf "\n${GREEN}══════════════════════════════════════════════${NC}\n"
printf "${GREEN}  ✔  Database bootstrap complete!             ${NC}\n"
printf "${GREEN}══════════════════════════════════════════════${NC}\n\n"
printf "  Admin credentials (change after first login):\n"
printf "    Email   : admin@kec.edu.np\n"
printf "    Password: admin123\n\n"
