# Roadmap: NPS Agro

## Overview

Brownfield project with working NestJS + Next.js codebase that needs security fixes, Docker packaging, and production deployment to a VPS. Three phases take the code from PM2-deployed with known vulnerabilities to a Dockerized, CI/CD-automated production system.

## Phases

- [ ] **Phase 1: Security + Quality** - Fix known vulnerabilities and ensure clean build + tests
- [ ] **Phase 2: Dockerize** - Package all 4 services in Docker and wire up with Compose + Nginx
- [ ] **Phase 3: Deploy + CI/CD** - Ship to VPS and automate future deploys via GitHub Actions

## Phase Details

### Phase 1: Security + Quality
**Goal**: Code is safe to deploy and compiles clean with passing tests
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, QUAL-01, QUAL-02, QUAL-03
**Success Criteria** (what must be TRUE):
  1. Backend starts with no JWT_SECRET and crashes with a clear error (no fallback to 'dev-secret')
  2. Login sets session in exactly one place — no dual-write between cookie and localStorage
  3. Frontend reads API URL from NEXT_PUBLIC_API_URL env var — no hardcoded IP in source code
  4. Login with an empty string or whitespace-only password returns an auth error
  5. `tsc`, `next build` (all 3 frontends), and `jest` all exit with code 0
**Plans**: TBD

Plans:
- [ ] 01-01: Fix security vulnerabilities (SEC-01, SEC-02, SEC-03, SEC-04)
- [ ] 01-02: Verify and fix build + test pipeline (QUAL-01, QUAL-02, QUAL-03)

---

### Phase 2: Dockerize
**Goal**: Every service runs in its own container and the full stack starts with `docker compose up`
**Depends on**: Phase 1
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05, INFRA-06
**Success Criteria** (what must be TRUE):
  1. `docker build` succeeds for the backend (multi-stage, production artifact)
  2. `docker build` succeeds for each of the 3 Next.js frontends (multi-stage)
  3. `docker compose up` starts all containers and they pass health checks
  4. Nginx routes requests to the correct service by port/path
  5. Backend connects to the existing PostgreSQL container on the VPS network
**Plans**: TBD

Plans:
- [ ] 02-01: Write Dockerfiles for backend and all 3 frontends (INFRA-01, INFRA-02, INFRA-03, INFRA-04)
- [ ] 02-02: Write docker-compose.yml and nginx config (INFRA-05, INFRA-06)

---

### Phase 3: Deploy + CI/CD
**Goal**: Application is live on VPS and future pushes to main auto-deploy
**Depends on**: Phase 2
**Requirements**: INFRA-07, INFRA-08
**Success Criteria** (what must be TRUE):
  1. Application is reachable at http://72.61.52.70 from a browser
  2. SQL migrations run automatically on every deploy before the backend starts
  3. A push to `main` on GitHub triggers a GitHub Actions workflow that SSH-deploys to VPS without manual steps
**Plans**: TBD

Plans:
- [ ] 03-01: Deploy to VPS and run migrations on startup (INFRA-07, INFRA-08)
- [ ] 03-02: Update GitHub Actions workflow to use Docker-based deploy

---

## Progress

**Execution Order:** 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Security + Quality | 0/2 | Not started | - |
| 2. Dockerize | 0/2 | Not started | - |
| 3. Deploy + CI/CD | 0/2 | Not started | - |

---
*Roadmap created: 2026-03-21*
