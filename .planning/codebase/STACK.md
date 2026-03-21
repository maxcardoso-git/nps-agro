# Technology Stack

**Analysis Date:** 2026-03-21

## Languages

**Primary:**
- **TypeScript** 5.7.2 - Used throughout backend (NestJS), frontend (Next.js), and shared utilities
- **JavaScript** - Configuration files and scripts (ecosystemconfig.js, deployment scripts)

**Secondary:**
- **SQL** - PostgreSQL migration files in `sql/versioned/` and `sql/migrations/`
- **Shell** - Bash scripts for deployment and migrations (`scripts/deploy.sh`, `scripts/run-migrations.sh`)

## Runtime

**Environment:**
- **Node.js** - No specific version locked (no `.nvmrc`), uses TypeScript runtime
  - Inferred: Recent stable LTS or current version (based on TypeScript 5.7.2)

**Package Manager:**
- **npm** - Primary package manager
- **Lockfile:** `package-lock.json` present (200KB)

## Frameworks

**Backend:**
- **NestJS** 11.1.0 - Core backend framework
  - `@nestjs/common` 11.1.0
  - `@nestjs/core` 11.1.0
  - `@nestjs/platform-express` 11.1.0 - HTTP transport layer
  - `@nestjs/jwt` 11.0.0 - JWT token support
  - `@nestjs/passport` 11.0.5 - Authentication strategy integration
  - `@nestjs/throttler` 6.4.0 - Rate limiting (100 req/min configured)
  - `@nestjs/testing` 11.1.0 - Unit and integration testing

**Frontend:**
- **Next.js** - Frontend framework (three separate portals)
  - **user-portal:** 15.5.14
  - **admin-console:** 15.3.0
  - **Analytics:** 15.5.14
  - All use `next-intl` 3.26.5 for i18n (internationalization)
- **React** 19.0.0 - UI framework for all frontends

**Testing:**
- **Jest** 29.7.0 - Test runner and assertion library
  - Config: `jest.config.ts` (root), tests run with `--runInBand`
  - **ts-jest** 29.2.5 - TypeScript support
  - **supertest** 7.0.0 - HTTP testing for NestJS endpoints

**Build/Dev Tools:**
- **TypeScript Compiler** - `tsc` with `tsconfig.build.json` for backend
- **Next.js Build** - `next build` for frontend projects
- **Tailwind CSS** 3.4.16 - Utility-first CSS framework
  - **PostCSS** 8.4.49 - CSS transformation (via `postcss.config.mjs`)
  - **autoprefixer** 10.4.20 - Vendor prefixing

## Key Dependencies

**Critical (Backend):**
- **pg** 8.12.0 - PostgreSQL client
  - Connection pooling via `Pool` from pg package
  - Pool config: max 20 connections (configurable via `DB_POOL_MAX` env var)
- **passport** 0.7.0 + **passport-jwt** 4.0.1 - JWT authentication strategy
- **bcryptjs** 2.4.3 - Password hashing

**Critical (Frontend):**
- **@tanstack/react-query** 5.62.2 - Server state management and caching
  - Configured: 1 retry, 60s staleTime, no window focus refetch
- **react-hook-form** 7.53.2 - Form state management
- **@hookform/resolvers** 3.9.0 - Form validation integration
- **zod** 3.24.1 - Schema validation and TypeScript types

**Infrastructure:**
- **helmet** 8.1.0 - HTTP security headers middleware
- **dotenv** 16.6.1 - Environment variable loading
- **class-validator** 0.14.1 - Decorator-based validation
- **class-transformer** 0.5.1 - DTO transformation
- **reflect-metadata** 0.2.2 - Metadata reflection (required by NestJS)
- **rxjs** 7.8.1 - Reactive programming (NestJS dependency)

**Frontend UI:**
- **recharts** 2.13.3 - Charting library (for dashboards/analytics)

## Configuration

**Environment Variables:**
- Backend requires: `NODE_ENV`, `PORT`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `APP_NAME`, `LOG_LEVEL`
- Frontend requires: `NEXT_PUBLIC_API_URL` (defaults to `http://72.61.52.70:3310`)
- Optional: `CORS_ORIGIN`, `DB_POOL_MAX`

**Backend Configuration Files:**
- `.env.development` - Development overrides
- `.env.production` - Production overrides
- `.env` - Fallback defaults
- All loaded via `src/common/env.ts` with validation

**Frontend Configuration:**
- `next.config.mjs` - Uses `next-intl` plugin for i18n routing
- `tailwind.config.ts` - CSS framework config with theme variables
- `tsconfig.json` - Strict mode enabled, path alias `@/*` maps to `src/*`

**Build Configuration:**
- `tsconfig.build.json` - Build-time TypeScript settings
- `jest.config.ts` - Test patterns and coverage collection

## Database

**Type:** PostgreSQL

**Migrations:** SQL scripts in `sql/versioned/` managed by bash scripts
- Example: `20260321_phase2_auth_access.sql`
- Runner: `./scripts/run-migrations.sh` (uses `psql` CLI)

**Connection Pool:**
- Library: `pg` Node.js driver
- Pool size: 20 (configurable)
- Managed by: `DatabaseService` in `src/common/database.service.ts`

## Process Management

**Production Deployment:**
- **PM2** ecosystem file: `ecosystem.config.js`
- App: `nps-agro-api` runs `dist/main.js`
- Instance: 1 fork process
- Memory limit: 300MB with auto-restart
- Logs: `/var/log/nps-agro-api/out.log` and `error.log`
- Working directory: `/root/NPS-Agro`

## Platform Requirements

**Development:**
- Node.js (version not locked)
- npm
- PostgreSQL (local or remote via `DATABASE_URL`)
- `psql` CLI tool for migrations
- TypeScript globally or via npx

**Production:**
- Node.js runtime
- PM2 process manager
- PostgreSQL database access
- Environment variables configured in deployment

---

*Stack analysis: 2026-03-21*
