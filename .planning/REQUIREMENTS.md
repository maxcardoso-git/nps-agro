# Requirements: NPS Agro

**Defined:** 2026-03-21
**Core Value:** Permitir que empresas do agro coletem e analisem feedback NPS de forma simples e confiável

## v1 Requirements

### Infrastructure

- [ ] **INFRA-01**: Backend NestJS roda em container Docker com multi-stage build
- [ ] **INFRA-02**: User-portal Next.js roda em container Docker com multi-stage build
- [ ] **INFRA-03**: Admin-console Next.js roda em container Docker com multi-stage build
- [ ] **INFRA-04**: Analytics Next.js roda em container Docker com multi-stage build
- [ ] **INFRA-05**: Docker Compose orquestra todos os containers e conecta ao PostgreSQL existente no VPS
- [ ] **INFRA-06**: Nginx reverse proxy roteia tráfego para os containers corretos por porta/path
- [ ] **INFRA-07**: GitHub Actions faz deploy automático no VPS ao push na main
- [ ] **INFRA-08**: Migrações SQL executam automaticamente no deploy

### Security

- [ ] **SEC-01**: JWT strategy não tem fallback secret — falha se JWT_SECRET não estiver configurado
- [ ] **SEC-02**: Session storage usa mecanismo único (sem dual-write cookie + localStorage)
- [ ] **SEC-03**: Frontend API URL vem de variável de ambiente (sem IP hardcoded)
- [ ] **SEC-04**: Validação de senha rejeita strings vazias ou só com espaços

### Quality

- [ ] **QUAL-01**: Backend compila sem erros (tsc)
- [ ] **QUAL-02**: Todos os frontends compilam sem erros (next build)
- [ ] **QUAL-03**: Testes existentes passam (jest)

## v2 Requirements

### Security Hardening

- **SEC-05**: Migrar session para httpOnly cookie com CSRF token
- **SEC-06**: Adicionar Content Security Policy headers
- **SEC-07**: Rate limiting específico no endpoint de login

### Infrastructure

- **INFRA-09**: HTTPS/SSL com certificado (requer domínio)
- **INFRA-10**: Monitoring e alertas (health checks, uptime)
- **INFRA-11**: Backup automatizado do banco de dados

## Out of Scope

| Feature | Reason |
|---------|--------|
| Migração para ORM (Prisma/TypeORM) | Raw SQL com pg funciona bem, migrações versionadas já existem |
| HTTPS/SSL | Sem domínio configurado, acesso por IP por agora |
| OAuth/SSO | Email/password suficiente para v1 |
| Mobile app | Web-first |
| Redis/cache layer | Sem necessidade de performance por agora |
| Build local | Todo build acontece dentro do Docker |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Complete |
| SEC-02 | Phase 1 | Complete |
| SEC-03 | Phase 1 | Complete |
| SEC-04 | Phase 1 | Complete |
| QUAL-01 | Phase 1 | Complete |
| QUAL-02 | Phase 1 | Complete |
| QUAL-03 | Phase 1 | Complete |
| INFRA-01 | Phase 2 | Pending |
| INFRA-02 | Phase 2 | Pending |
| INFRA-03 | Phase 2 | Pending |
| INFRA-04 | Phase 2 | Pending |
| INFRA-05 | Phase 2 | Pending |
| INFRA-06 | Phase 2 | Pending |
| INFRA-07 | Phase 3 | Pending |
| INFRA-08 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 after Phase 1 completion*
