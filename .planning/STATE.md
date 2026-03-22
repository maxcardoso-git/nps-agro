# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-21)

**Core value:** Permitir que empresas do agro coletem e analisem feedback NPS de forma simples e confiável
**Current focus:** Phase 3 - Deploy (Phase 2 complete)

## Current Position

Phase: 3 of 3 (Deploy/CI-CD) — COMPLETE
Plan: 2 of 2 in current phase
Status: ALL PHASES COMPLETE
Last activity: 2026-03-22 — Completed 03-02-PLAN.md (GitHub Actions workflow updated with script_stop + command_timeout)

Progress: [████████████] 100% (6/6 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: ~5 min
- Total execution time: ~30 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-security-quality | 2/2 | ~20 min | ~10 min |
| 02-dockerize | 2/2 | ~8 min | ~4 min |
| 03-deploy-cicd | 2/2 | ~4 min | ~2 min |

**Recent Trend:**
- Last 5 plans: 01-02 (~7 min), 02-01 (~3 min), 02-02 (~5 min), 03-01 (~1 min), 03-02 (~3 min)
- Trend: Stable, fast

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
- [02-02]: db-net declarada como external network com nome configurável via DB_NETWORK env var (default: nps-db-net)
- [02-02]: Nginx usa container_name como upstream (nps-backend:3310, etc.) — mais explícito que service names
- [02-02]: /api/ usa trailing-slash proxy_pass (http://backend/) para strip do prefix — NestJS routes não têm /api prefix
- [02-02]: Backend expõe porta 3310 diretamente E via Nginx /api/ — frontends usam URL direta para SSR
- [03-01]: deploy.sh reescrito para Docker Compose — PM2 removido completamente
- [03-01]: Health check bate em http://127.0.0.1/health (porta 80 via nginx) — valida stack completo
- [03-01]: Migrations não rodam no deploy script — rodam dentro do container backend no startup
- [03-01]: .env validado antes do deploy (não .env.production) — docker-compose usa env_file: .env
- [03-02]: script_stop: true adicionado ao appleboy/ssh-action — workflow falha se deploy.sh sair com erro
- [03-02]: command_timeout: 10m — timeout padrão de 10s é muito curto para Docker builds no VPS

### Pending Todos

- VPS operator: criar .env a partir de .env.example antes do `docker compose up`
- VPS operator: garantir que external network existe (`docker network create nps-db-net`) e PostgreSQL está na network

### Blockers/Concerns

- Nenhum blocker ativo — todos os 3 phases completos

## Session Continuity

Last session: 2026-03-22
Stopped at: Completed 03-01-PLAN.md — scripts/deploy.sh reescrito para Docker Compose (PM2 removido)
Resume file: None
