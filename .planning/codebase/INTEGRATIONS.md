# External Integrations

**Analysis Date:** 2026-03-21

## APIs & External Services

**Internal API Communication:**
- **Backend API**: NestJS server running on configurable `PORT` (default 3000)
  - Base URL: `http://72.61.52.70:3310` (hardcoded for frontends)
  - Frontend client: `user-portal/lib/api.ts` uses native `fetch` API
  - All requests wrapped in custom error handling (`ApiError` class)
  - Request ID tracking via `REQUEST_ID_HEADER` header

## Data Storage

**Primary Database:**
- **PostgreSQL**
  - Connection: `DATABASE_URL` environment variable (required format: `postgresql://user:password@host:port/dbname`)
  - Client: `pg` Node.js driver (v8.12.0)
  - Location: Backend `src/common/database.service.ts` wraps `Pool` connections
  - Pool management: Max 20 connections (configurable via `DB_POOL_MAX`)

**SQL Migrations:**
- Directory: `sql/versioned/`
- Executed via: `scripts/run-migrations.sh` using `psql` CLI
- Example migration: `20260321_phase2_auth_access.sql`
- Current schema includes: auth_access tables

**File Storage:**
- Not detected - No S3, Azure, or cloud storage integration
- May use local filesystem for logos/assets (branding references in code)

**Caching:**
- **Frontend:** React Query (`@tanstack/react-query`)
  - Stale time: 60 seconds
  - Retry strategy: 1 automatic retry
  - No window focus refetch
- **Backend:** No external cache (Redis/Memcached) detected

## Authentication & Identity

**Auth Provider:**
- **Custom JWT-based authentication**
  - Implementation: `src/modules/auth/` (NestJS module)
  - Strategy: `passport-jwt` with custom `JwtStrategy` in `src/modules/auth/jwt.strategy.ts`
  - Token signing: `@nestjs/jwt` module
  - Algorithm: Depends on JWT_SECRET (symmetric)

**Session Management:**
- Backend: JWT tokens issued by `/auth/login` endpoint
- Frontend: Tokens stored via `lib/auth/session.ts` (likely localStorage/sessionStorage)
- Token claims: `user` object with `id`, `name`, `email`, `role`, `tenant_id`, `permissions`
- Bearer token: `Authorization: Bearer {access_token}` header pattern

**Password Security:**
- Library: `bcryptjs` 2.4.3 for password hashing

**Multi-tenant Support:**
- Tenant ID passed via: `x-tenant-id` header in API requests
- Resolved from: `AuthSession.user.tenant_id`
- RBAC implemented: `src/common/role-permissions.ts`
- Roles: admin_master, platform_admin, tenant_admin, campaign_manager, analyst, interviewer

## Security

**CORS:**
- Origin: Configurable via `CORS_ORIGIN` env var
- Default: Allows all origins (`*`)
- Production example: `https://admin.seudominio.com`

**HTTP Security:**
- Library: `helmet` 8.1.0 middleware
- Protects against: XSS, clickjacking, MIME-type sniffing, etc.

**Rate Limiting:**
- Framework: `@nestjs/throttler`
- Config: 100 requests per 60 seconds (see `src/app.module.ts`)
- Global guard applied to all routes

**Input Validation:**
- Backend: `class-validator` with decorators
- Frontend: `zod` schema validation
- Validation pipe: NestJS `ValidationPipe` configured in `src/main.ts`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, DataDog, or similar)
- Custom error handling via `src/modules/bff/http-exception.filter.ts`
- Errors wrapped in standardized envelope: `{ success: false, error: { code, message, details } }`

**Logging:**
- Custom logger: `JsonLoggerService` in `src/common/json-logger.service.ts`
- Format: Structured JSON logs (not detected as streaming to external service)
- Level: Configurable via `LOG_LEVEL` env var (error|warn|info|debug)
- Default: info

**Request Tracking:**
- Request ID: Generated per request via `RequestIdInterceptor`
- Header: `x-request-id` (from `lib/auth/constants.ts`)
- Audit context: `AuditContextInterceptor` in `src/modules/bff/`

**Metrics:**
- Service: `MetricsService` in `src/common/metrics.service.ts` (implementation not detailed)

## CI/CD & Deployment

**Hosting:**
- VPS deployment to `/root/NPS-Agro`
- Process manager: PM2 via `ecosystem.config.js`
- Scripts: Custom shell scripts in `scripts/` directory

**Deployment Pipeline:**
- Script: `scripts/deploy.sh`
- Steps:
  1. Pull latest code
  2. Build TypeScript
  3. Run migrations (via `scripts/run-migrations.sh`)
  4. Health check against `/health` endpoint
  5. Start PM2 process
- Health check URL: `HEALTH_URL` env var, defaults to `http://127.0.0.1:3000/health`

**Build Process:**
- Backend: `npm run build` → `tsc -p tsconfig.build.json` → `dist/main.js`
- Frontend: `npm run build` → Next.js build for each portal (user-portal, admin-console, Analytics)

**CI/CD Service:**
- GitHub Workflows detected (`.github/workflows/` directory exists)
- Specific workflows not examined

## Environment Configuration

**Required Environment Variables:**

Backend:
- `NODE_ENV` - 'production' or 'development'
- `PORT` - TCP port number (1-65535)
- `DATABASE_URL` - PostgreSQL connection string (must start with `postgresql://`)
- `JWT_SECRET` - Min 32 characters for token signing
- `JWT_EXPIRES_IN` - Token expiration (e.g., `3600s`)
- `APP_NAME` - Application identifier (default: `nps-agro-api`)
- `LOG_LEVEL` - error|warn|info|debug

Frontend:
- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: `http://72.61.52.70:3310`)
- `NEXT_PUBLIC_DEFAULT_LOCALE` - Default language (e.g., `pt-BR`)

Optional:
- `CORS_ORIGIN` - Comma-separated origins or wildcard
- `DB_POOL_MAX` - Max database connections (default: 20)
- `HEALTH_URL` - Health check endpoint URL

**Secrets Location:**
- `.env.production` - Production secrets (not committed, template: `.env.production.example`)
- `.env.development` - Development secrets (not committed, template: `.env.development.example`)
- `.env` - Fallback/local override (not committed)

**Configuration Loading:**
- Backend: `src/common/env.ts` with validation on startup
- Frontend: Process.env.NEXT_PUBLIC_* accessible in browser

## API Endpoints

**Authentication:**
- `POST /auth/login` - User login with email/password and optional tenant_code
  - Response: `{ access_token, token_type: 'Bearer', expires_in, user }`
- `GET /auth/me` - Get authenticated user info

**Tenants:**
- `GET /tenants/{tenantId}` - Get tenant configuration and branding

**Campaigns:**
- `GET /campaigns` - List campaigns (supports pagination via query params)

**Reporting:**
- `GET /reports/campaigns/{campaignId}/executive-summary` - KPI summary
- `GET /reports/campaigns/{campaignId}/interviews` - Paginated interview data
  - Filters: `region`, `sentiment`, `nps_class`, `page`, `page_size`

**Health:**
- `GET /health` - Health check endpoint (used for deployment verification)

## Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { /* optional */ }
  }
}
```

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook endpoints found

**Outgoing:**
- Not detected - No external webhook/callback integrations

## Internationalization (i18n)

**Frontend Framework:**
- Library: `next-intl` 3.26.5
- Config: `next.config.mjs` with `next-intl/plugin`
- Routing: `src/i18n/routing.ts`
- Supported locales: `pt-BR`, `en-US`, `es-ES` (from type definitions)
- Request handler: `src/i18n/request.ts`

**Backend Localization:**
- Not detected - API returns language-neutral data

## UI/UX Libraries

**Component Libraries:**
- Tailwind CSS + custom components (Button, Card, Input, Select, etc. in `components/ui/`)
- Charts: `recharts` 2.13.3 for analytics dashboards
- Form handling: React Hook Form with Zod validation

---

*Integration audit: 2026-03-21*
