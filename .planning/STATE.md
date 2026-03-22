# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Permitir que empresas do agro coletem e analisem feedback NPS de forma simples e confiável
**Current focus:** Phase 2 - Dockerize

## Current Position

Phase: 2 of 3 (Dockerize)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-03-21 — Completed 02-01-PLAN.md (Docker Images — Dockerfiles for backend and all 3 frontends)

Progress: [████████░░] 50% (3/6 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~7 min
- Total execution time: ~23 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-security-quality | 2/2 | ~20 min | ~10 min |
| 02-dockerize | 1/2 | ~3 min | ~3 min |

**Recent Trend:**
- Last 5 plans: 01-01 (~13 min), 01-02 (~7 min), 02-01 (~3 min)
- Trend: Accelerating

*Updated after each plan completion*

## Accumulated Context

### Decisions

- [Init]: Dockerizar ao invés de manter PM2 — consistência com outras apps no VPS
- [Init]: Corrigir security issues (JWT fallback, session dual-write) antes do deploy
- [Init]: Acesso por IP direto sem SSL para v1
- [01-01]: JWT_SECRET fallback removido — app falha com erro claro se variável não definida
- [01-01]: Sessão frontend usa apenas memory store (localStorage removido) para evitar dual-write
- [01-01]: API clients lançam Error se NEXT_PUBLIC_API_URL não estiver definida em runtime
- [01-02]: Root tsconfig.json é config NestJS (commonjs, emitDecoratorMetadata) — frontends mantêm seus próprios tsconfigs
- [01-02]: .eslintrc.json usa root: true e ignorePatterns para isolar backend do monorepo frontend
- [01-02]: Adicionados eslint e @typescript-eslint ao devDependencies (estavam faltando)
- [02-01]: Backend Dockerfile instala postgresql-client via apk — run-migrations.sh requer psql CLI
- [02-01]: user-portal usa npm install (não npm ci) — não tem package-lock.json local, apenas o root monorepo tem
- [02-01]: NEXT_PUBLIC_* vars passadas como ARG no build stage — Next.js inlina em compile time, não runtime
- [02-01]: Nenhum .env copiado para imagens — todas as env vars vêm do docker-compose em runtime
- [02-01]: Sem PM2 nas imagens Docker — Docker substitui PM2 como process manager

### Pending Todos

None.

### Blockers/Concerns

- PostgreSQL no VPS roda em container Docker — confirmar nome da network e credenciais antes de Phase 2 Plan 2
- Verificar se GitHub Actions tem SSH key configurada para o VPS antes de Phase 3

## Session Continuity

Last session: 2026-03-21
Stopped at: Completed 02-01-PLAN.md — Dockerfiles criados para backend (INFRA-01) e 3 frontends (INFRA-02, 03, 04)
Resume file: None
