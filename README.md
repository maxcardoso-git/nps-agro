# SA Intercom Backend (Modular Monolith)

## Environment

Use `.env.example` as base:

- `DATABASE_URL`
- `DATABASE_URL_TEST` (optional for DB integration tests)
- `JWT_SECRET`
- `JWT_EXPIRES_IN`

## Migrations

Phase 2 minimal database change:

```sql
sql/migrations/20260321_phase2_auth_access.sql
```

## Main Modules

- `auth` (`/auth/login`, `/auth/me`)
- `tenant` (`/tenants`)
- `tenant-user` (`/tenants/:tenantId/users`)
- `questionnaire` (`/questionnaires`, `/questionnaire-versions`)
- `campaign` (`/campaigns`)
- `reporting` (`/reports/campaigns/:campaignId/*`)
- `survey` (`/interviews/*`)

## Global Concerns

- JWT auth guard
- tenant scope guard
- permission guard
- request id interceptor
- response envelope interceptor
- audit context interceptor
- global exception filter

