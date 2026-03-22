---
phase: 02-dockerize
plan: 01
subsystem: infra
tags: [docker, dockerfile, nextjs, nestjs, standalone, multi-stage, node22-alpine, postgresql-client]

# Dependency graph
requires:
  - phase: 01-security-quality
    provides: TypeScript build config (tsconfig.build.json) and clean src/ that compiles correctly
provides:
  - Backend multi-stage Dockerfile (deps -> build -> production) running dist/main.js on port 3310
  - Frontend Dockerfiles for user-portal, admin-console, and Analytics running standalone Next.js on port 3000
  - Root .dockerignore excluding build artifacts, secrets, and planning files
  - Per-frontend .dockerignore files
  - output: standalone in all 3 Next.js configs enabling minimal production images
affects:
  - 02-dockerize/02-02 (docker-compose, networking, env var wiring)
  - 03-deploy (CI/CD builds these images)

# Tech tracking
tech-stack:
  added: [docker multi-stage builds, node:22-alpine, postgresql-client (apk)]
  patterns:
    - Multi-stage Docker build: deps (full install) -> build (compile) -> production (minimal runtime)
    - Next.js standalone output for minimal Docker footprint
    - NEXT_PUBLIC_* vars injected at build time via ARG/ENV in Docker build stage
    - No PM2 in Docker images — Docker handles process lifecycle

key-files:
  created:
    - Dockerfile
    - .dockerignore
    - user-portal/Dockerfile
    - user-portal/.dockerignore
    - admin-console/Dockerfile
    - admin-console/.dockerignore
    - Analytics/Dockerfile
    - Analytics/.dockerignore
  modified:
    - user-portal/next.config.mjs
    - admin-console/next.config.mjs
    - Analytics/next.config.mjs

key-decisions:
  - "Backend Dockerfile installs postgresql-client via apk — required for run-migrations.sh which uses psql CLI"
  - "user-portal uses npm install (not npm ci) because it has no local package-lock.json — only the root monorepo has one"
  - "admin-console and Analytics use npm ci — both have their own package-lock.json files"
  - "NEXT_PUBLIC_* vars passed as ARG at docker build time — Next.js inlines them at build, not runtime"
  - "No .env files copied into any image — all env vars come from docker-compose at runtime"
  - "No PM2 installed in Docker images — Docker replaces PM2 as process manager"

patterns-established:
  - "Frontend standalone pattern: .next/standalone + .next/static + public, CMD node server.js"
  - "Backend production pattern: npm ci --omit=dev, COPY dist/, CMD node dist/main.js"

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 2 Plan 01: Docker Images Summary

**Multi-stage Dockerfiles for NestJS backend (port 3310) and all 3 Next.js frontends (port 3000) using node:22-alpine with standalone output**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T00:58:22Z
- **Completed:** 2026-03-21T01:00:29Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Backend Dockerfile: 3-stage build producing minimal production image with psql CLI, running `node dist/main.js` on port 3310
- Frontend Dockerfiles: 3-stage builds for user-portal, admin-console, and Analytics, all serving Next.js standalone on port 3000
- Next.js standalone output enabled in all 3 `next.config.mjs` files for minimal image size

## Task Commits

Each task was committed atomically:

1. **Task 1: Create backend Dockerfile and .dockerignore** - `d71c2aa` (feat)
2. **Task 2: Add standalone output to Next.js configs and create frontend Dockerfiles** - `07f0570` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `Dockerfile` - NestJS backend multi-stage build, psql CLI, port 3310, healthcheck
- `.dockerignore` - Excludes node_modules, dist, .git, .env*, .planning, frontend build artifacts
- `user-portal/Dockerfile` - Next.js standalone, npm install (no local lockfile), NEXT_PUBLIC_API_URL at build time
- `user-portal/.dockerignore` - Excludes node_modules, .next, .git, *.md
- `admin-console/Dockerfile` - Next.js standalone, npm ci, NEXT_PUBLIC_API_BASE_URL at build time
- `admin-console/.dockerignore` - Excludes node_modules, .next, .git, *.md
- `Analytics/Dockerfile` - Next.js standalone, npm ci, NEXT_PUBLIC_API_BASE_URL at build time
- `Analytics/.dockerignore` - Excludes node_modules, .next, .git, *.md
- `user-portal/next.config.mjs` - Added output: 'standalone'
- `admin-console/next.config.mjs` - Added output: 'standalone'
- `Analytics/next.config.mjs` - Added output: 'standalone'

## Decisions Made

- Backend uses `apk add --no-cache postgresql-client` — `run-migrations.sh` invokes `psql` directly
- user-portal Dockerfile uses `npm install` instead of `npm ci` — user-portal has no local `package-lock.json` (only the root monorepo lockfile exists)
- admin-console and Analytics use `npm ci` — both have their own `package-lock.json`
- `NEXT_PUBLIC_*` vars are passed as `ARG` in the build stage and set as `ENV` — Next.js requires them at compile time, not just runtime
- No `.env` files are copied into any image — env vars are injected by docker-compose at container start
- No PM2 in Docker images — Docker handles process lifecycle, PM2 is not needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 4 Dockerfiles are ready for use in docker-compose (Phase 2, Plan 2)
- Backend image definition: `context: .`, `dockerfile: Dockerfile`
- Frontend image definitions: `context: ./user-portal`, `context: ./admin-console`, `context: ./Analytics`
- Build args needed at compose time: `NEXT_PUBLIC_API_URL` (user-portal), `NEXT_PUBLIC_API_BASE_URL` (admin-console, Analytics)
- Concern: PostgreSQL Docker network name and credentials still need to be confirmed before docker-compose wiring

---
*Phase: 02-dockerize*
*Completed: 2026-03-21*
