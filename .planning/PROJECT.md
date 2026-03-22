# NPS Agro

## What This Is

Plataforma de pesquisa NPS (Net Promoter Score) para o agronegócio. Backend NestJS com engine de entrevistas, sistema de campanhas e questionários, RBAC multi-tenant. Três portais frontend Next.js: user-portal (respondentes/analistas), admin-console (gestão) e analytics (dashboards). Banco PostgreSQL com migrações SQL versionadas.

Projeto construído inicialmente com Codex, agora sendo aperfeiçoado e levado a produção com Claude.

## Core Value

Permitir que empresas do agro coletem e analisem feedback NPS de seus clientes de forma simples e confiável.

## Requirements

### Validated

- ✓ Engine de entrevistas com fluxo start → answer → complete — existing
- ✓ Rule engine para condições de exibição de perguntas — existing
- ✓ Validação de respostas por tipo (text, rating, single_choice, multi_choice) — existing
- ✓ Sistema de campanhas com ciclo de vida (draft → active → paused → closed) — existing
- ✓ Questionários com versionamento e publicação — existing
- ✓ Autenticação JWT com login/senha — existing
- ✓ RBAC com permissões por role (super_admin, tenant_admin, analyst, interviewer) — existing
- ✓ Multi-tenancy com isolamento por tenant — existing
- ✓ Reporting com cálculo de NPS e distribuição — existing
- ✓ User-portal com i18n (pt-BR, en, es) e theming — existing
- ✓ Admin-console para gestão — existing
- ✓ Analytics portal com dashboards — existing
- ✓ API BFF com request-id, envelope de resposta e audit context — existing

### Active

- [ ] Dockerizar toda a aplicação (backend + 3 frontends)
- [ ] Deploy via Docker Compose no VPS (72.61.52.70)
- [ ] Integrar com PostgreSQL existente no VPS (já roda em Docker)
- [ ] Corrigir vulnerabilidade de JWT fallback secret ('dev-secret')
- [ ] Corrigir session storage dual-write (cookie + localStorage)
- [ ] Remover hardcoded API URL do frontend (72.61.52.70:3310)
- [ ] Corrigir validação de senha permissiva no login
- [ ] Garantir que build compila sem erros
- [ ] Garantir que testes passam
- [ ] CI/CD via GitHub Actions para deploy automático no VPS

### Out of Scope

- Mobile app — web-first, mobile depois
- OAuth/SSO (Google, GitHub) — email/password suficiente para v1
- Real-time notifications — não é core para NPS
- Storage de arquivos (S3/cloud) — sem necessidade atual
- HTTPS/SSL — acesso por IP direto por enquanto
- Migração para ORM (Prisma/TypeORM) — raw SQL com pg funciona bem

## Context

- VPS em 72.61.52.70 já tem outras apps rodando em Docker
- PostgreSQL já roda em container Docker no mesmo VPS
- Deploy atual usa PM2 direto (sem Docker) — precisa migrar para Docker
- GitHub Actions workflow existe mas aponta para PM2 deploy
- Repo público: https://github.com/maxcardoso-git/nps-agro.git
- Backend roda na porta 3310 (configurável)
- Codebase mapeado em .planning/codebase/ com 7 documentos de referência
- Concerns conhecidos documentados em .planning/codebase/CONCERNS.md

## Constraints

- **Infra**: Deploy em Docker no VPS 72.61.52.70, mesmo padrão das outras apps
- **Banco**: Usar PostgreSQL existente em Docker no VPS (não criar novo)
- **Acesso**: Por IP direto (sem domínio/SSL por agora)
- **Git**: Repo público no GitHub, deploy a partir do Git
- **Stack**: Manter NestJS + Next.js + PostgreSQL (não trocar frameworks)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dockerizar ao invés de manter PM2 | Consistência com outras apps no VPS, isolamento, reproducibilidade | — Pending |
| Manter raw SQL com pg driver | Funciona bem, migrações versionadas já existem, sem necessidade de ORM | — Pending |
| Acesso por IP sem SSL | Simplicidade para v1, domínio pode ser adicionado depois | — Pending |
| Corrigir security issues antes do deploy | JWT fallback e session storage são riscos em produção | — Pending |

---
*Last updated: 2026-03-21 after initialization*
