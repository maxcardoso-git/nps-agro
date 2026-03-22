---
phase: 02-dockerize
plan: 02
subsystem: infra
tags: [docker-compose, nginx, reverse-proxy, networking, external-network, postgresql, gzip, upstream]

# Dependency graph
requires:
  - phase: 02-dockerize/02-01
    provides: Dockerfiles for backend (port 3310) and all 3 Next.js frontends (port 3000)
provides:
  - docker-compose.yml orchestrating all 5 services (backend, user-portal, admin-console, analytics, nginx)
  - nginx reverse proxy routing /api/* to backend, /admin/* to admin-console, /analytics/* to analytics, / to user-portal
  - External db-net network connection to existing PostgreSQL container on VPS
  - Migration-first startup (run-migrations.sh runs before node dist/main.js)
  - Updated .env.example with all required variables and comments
affects:
  - 03-deploy (CI/CD deploys this compose stack, needs .env on VPS)

# Tech tracking
tech-stack:
  added: [docker-compose, nginx:alpine]
  patterns:
    - External network pattern: db-net declared as external to connect to pre-existing PostgreSQL container
    - Migration-first startup: compose command overrides CMD to run migrations before app start
    - Nginx reverse proxy with path-based routing and upstream container name resolution
    - NEXT_PUBLIC_* vars as build args in compose (inlined at image build time, not runtime)

key-files:
  created:
    - docker-compose.yml
    - nginx/nginx.conf
    - nginx/Dockerfile
    - nginx/.dockerignore
  modified:
    - .env.example

key-decisions:
  - "db-net declared as external network with configurable name via DB_NETWORK env var (default: nps-db-net)"
  - "Backend uses env_file: .env for runtime env vars; NEXT_PUBLIC_* are build args (not in env_file)"
  - "Nginx upstream names use container_name values (nps-backend, nps-user-portal, etc.) not service names"
  - "Backend port 3310 exposed directly AND via Nginx /api/ — frontends use direct URL for SSR, Nginx for browser requests"
  - "/api/ location uses trailing-slash proxy_pass (http://backend/) to strip the /api prefix"

patterns-established:
  - "External network pattern: declare networks.X.external: true with configurable name via env var"
  - "Migration-first: compose command: sh -c './scripts/run-migrations.sh && node dist/main.js'"

# Metrics
duration: 5min
completed: 2026-03-22
---

# Phase 2 Plan 02: Docker Compose Orchestration Summary

**docker-compose.yml with 5-service stack (NestJS + 3 Next.js + Nginx), external PostgreSQL via db-net, migration-first startup, and path-based Nginx routing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-22T01:02:31Z
- **Completed:** 2026-03-22T01:07:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- docker-compose.yml orchestrates all 5 services with health checks, restart policies, and dependency ordering
- Backend runs migrations before starting (sh -c "./scripts/run-migrations.sh && node dist/main.js")
- External db-net network connects backend to pre-existing PostgreSQL on VPS without managing the DB container
- Nginx reverse proxy routes traffic by path: /api/ to backend, /admin/ to admin-console, /analytics/ to analytics, / to user-portal

## Task Commits

Each task was committed atomically:

1. **Task 1: Create docker-compose.yml** - `a47979e` (feat)
2. **Task 2: Create Nginx reverse proxy config** - `b426a87` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `docker-compose.yml` - Full stack orchestration: 5 services, app-net bridge, db-net external network
- `.env.example` - Updated with all required vars (backend runtime + frontend build args + DB_NETWORK)
- `nginx/nginx.conf` - Upstream definitions using container names, path-based routing, gzip compression
- `nginx/Dockerfile` - FROM nginx:alpine, COPY nginx.conf, EXPOSE 80
- `nginx/.dockerignore` - Excludes *.md

## Decisions Made

- **External network name via env var:** `DB_NETWORK` env var (default: `nps-db-net`) configures the external Docker network name. VPS operator must ensure this network exists and PostgreSQL is attached to it.
- **Nginx upstreams use container_name:** Upstreams reference `nps-backend:3310`, `nps-user-portal:3000`, etc. (container names) rather than compose service names — consistent and explicit.
- **Prefix stripping via trailing slash:** `/api/` location uses `proxy_pass http://backend/` (trailing slash) to strip the `/api` prefix. Backend NestJS routes have no `/api` prefix in code.
- **Backend port exposed both ways:** Port 3310 is directly exposed for SSR (server-side fetch) and also reachable via Nginx `/api/`. Frontends use NEXT_PUBLIC_API_URL=http://72.61.52.70:3310 for direct access.
- **No PostgreSQL service in compose:** PostgreSQL already runs on VPS in its own container; we only connect via external network.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Docker daemon not running locally — compose config validation done via `docker compose config --no-interpolate` which parses the YAML without requiring .env file or Docker daemon. All 5 services and both networks confirmed present in parsed output.

## User Setup Required

Before running on the VPS, the operator must:

1. Create `.env` from `.env.example` and fill in real values (DATABASE_URL, JWT_SECRET, etc.)
2. Ensure the external Docker network exists: `docker network create nps-db-net` (or the name set in DB_NETWORK)
3. Ensure the existing PostgreSQL container is attached to that network

## Next Phase Readiness

- Full stack is ready for `docker compose up` on the VPS
- Phase 3 (CI/CD deploy) can now automate: git pull, docker compose build, docker compose up -d
- Remaining concern: GitHub Actions needs SSH key configured for VPS (Phase 3 prerequisite)

---
*Phase: 02-dockerize*
*Completed: 2026-03-22*
