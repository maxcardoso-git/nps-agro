---
phase: 03-deploy-cicd
plan: 02
subsystem: infra
tags: [github-actions, ci-cd, ssh, docker, appleboy]

# Dependency graph
requires:
  - phase: 03-deploy-cicd/03-01
    provides: deploy.sh script that GitHub Actions triggers via SSH
provides:
  - GitHub Actions workflow that SSHes into VPS and runs deploy.sh on push to main
  - Proper 10-minute timeout for Docker image builds
  - Workflow fails visibly if deploy.sh exits non-zero (script_stop: true)
affects: [future workflow additions, manual deploys, CI/CD expansion]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All deploy logic in deploy.sh on VPS — workflow is a thin SSH trigger only"
    - "script_stop: true ensures CI reflects real deploy outcome"
    - "command_timeout: 10m accommodates Docker multi-stage builds"

key-files:
  created: []
  modified:
    - .github/workflows/deploy.yml

key-decisions:
  - "script_stop: true added — workflow must fail if deploy.sh exits non-zero"
  - "command_timeout: 10m — Docker builds can take several minutes, default 10s was too short"
  - "All deploy logic stays in deploy.sh, workflow remains a minimal SSH trigger"

patterns-established:
  - "Thin CI pattern: workflow does only SSH + script invocation, no Docker steps inline"

# Metrics
duration: 3min
completed: 2026-03-22
---

# Phase 3 Plan 02: GitHub Actions Deploy Workflow Summary

**appleboy/ssh-action workflow updated with script_stop and 10m command_timeout to correctly trigger Docker-based deploy.sh on VPS**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-22T01:10:52Z
- **Completed:** 2026-03-22T01:13:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `script_stop: true` so workflow fails if deploy.sh exits non-zero
- Added `command_timeout: 10m` to accommodate Docker multi-stage image builds
- Kept the workflow minimal — all logic lives in deploy.sh on the VPS

## Task Commits

Each task was committed atomically:

1. **Task 1: Update GitHub Actions deploy workflow** - `9ae1de0` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified

- `.github/workflows/deploy.yml` - Added script_stop and command_timeout to appleboy/ssh-action step

## Decisions Made

- `script_stop: true` — without this, the action reports success even if deploy.sh exits with error; this makes CI status reflect the actual deploy outcome
- `command_timeout: 10m` — default SSH action timeout is 10 seconds, far too short for Docker builds that can take several minutes on VPS
- Kept workflow as a thin SSH trigger — all deploy logic (git pull, docker build, docker compose up, health check) lives in scripts/deploy.sh on the VPS

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. GitHub secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY) are already configured.

## Next Phase Readiness

- GitHub Actions workflow is ready — every push to main will SSH to VPS and run deploy.sh
- Phase 03-deploy-cicd is complete (both 03-01 deploy.sh and 03-02 workflow done)
- VPS operator still needs to: create .env from .env.example, ensure nps-db-net network exists, and verify PostgreSQL is on that network

---
*Phase: 03-deploy-cicd*
*Completed: 2026-03-22*
