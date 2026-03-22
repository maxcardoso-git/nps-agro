---
phase: 03-deploy-cicd
plan: 01
subsystem: infra
tags: [docker, docker-compose, bash, deploy, nginx, health-check]

# Dependency graph
requires:
  - phase: 02-dockerize
    provides: docker-compose.yml with all services including nginx on port 80
provides:
  - Docker-based deploy script replacing PM2 deploy (scripts/deploy.sh)
affects: [03-02-github-actions, any CI/CD pipeline that calls scripts/deploy.sh]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Deploy via docker compose down + up --build (blue-green-lite: brief downtime)"
    - "Health check via nginx on port 80 (not backend port 3310 directly)"
    - ".env file (not .env.production) used by docker-compose env_file directive"

key-files:
  created: []
  modified:
    - scripts/deploy.sh

key-decisions:
  - "Health check hits http://127.0.0.1/health (port 80, through nginx) — validates entire stack including nginx routing"
  - "Migrations NOT in deploy script — run inside backend container on startup (run-migrations.sh && node dist/main.js)"
  - ".env validated before deploy (not .env.production) — docker-compose.yml uses env_file: .env"
  - "docker compose down --timeout 30 before up — graceful shutdown with 30s timeout"

patterns-established:
  - "Deploy script is thin orchestrator: pull code, restart containers, verify health"
  - "No build steps in deploy.sh — Docker handles all compilation inside images"

# Metrics
duration: 1min
completed: 2026-03-22
---

# Phase 3 Plan 01: Deploy Script (Docker Compose) Summary

**PM2-based deploy script replaced with Docker Compose orchestration: git pull, docker compose down/up --build, nginx health check at port 80**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-03-22T01:10:51Z
- **Completed:** 2026-03-22T01:11:34Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments
- Removed all PM2, npm install, npm build, and run-migrations references from deploy script
- Script now validates `.env` file presence before deploying (docker-compose uses `env_file: .env`)
- Health check validates full stack through nginx (port 80) not backend directly
- On health check failure, prints `docker compose logs --tail=50` for debugging

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite deploy.sh for Docker Compose** - `9bdfaf7` (feat)

**Plan metadata:** (to be committed with docs commit)

## Files Created/Modified
- `scripts/deploy.sh` - Rewritten from PM2-based to Docker Compose-based deploy (git pull, compose down, compose up --build -d, health check)

## Decisions Made
- Health check target is `http://127.0.0.1/health` (port 80 via nginx) — this validates the full stack (nginx + routing), not just the backend directly
- Migrations remain inside the backend container startup command — deploy script doesn't need to know about database operations
- `.env` check at top (not `.env.production`) with a clear error message guiding operators to copy `.env.example`
- `docker compose down --timeout 30` before `up` — ensures clean shutdown before rebuild

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. (VPS operator setup notes remain in STATE.md Pending Todos.)

## Next Phase Readiness
- `scripts/deploy.sh` is ready to be called by GitHub Actions in plan 03-02
- The script accepts no arguments; GitHub Actions will SSH into VPS and invoke it directly
- Blocker to verify: GitHub Actions must have SSH key configured for the VPS (noted in STATE.md)

---
*Phase: 03-deploy-cicd*
*Completed: 2026-03-22*
