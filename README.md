# SA Intercom Backend (Modular Monolith)

## Environment

Environment templates:

- `.env.development.example`
- `.env.production.example`
- `.env.example` (legacy baseline)

Required variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET` (min 32 chars)
- `JWT_EXPIRES_IN`
- `APP_NAME`
- `LOG_LEVEL`

## Database Migrations

Versioned SQL files:

- `sql/versioned/001_init_schema.sql`
- `sql/versioned/002_indexes.sql`
- `sql/versioned/003_views.sql`
- `sql/versioned/004_phase2_alter_app_user.sql`
- `sql/versioned/100_seed_dev.sql` (optional dev seed)

Run migrations:

```bash
DATABASE_URL=postgresql://... ./scripts/run-migrations.sh
```

Run migrations + dev seeds:

```bash
DATABASE_URL=postgresql://... RUN_DEV_SEEDS=true ./scripts/run-migrations.sh
```

## Build & Runtime

```bash
npm install
npm run build
node dist/main.js
```

Health endpoint:

- `GET /health`

## PM2

PM2 config:

- `ecosystem.config.js`

Start:

```bash
mkdir -p /var/log/nps-agro-api
pm2 start ecosystem.config.js --only nps-agro-api
pm2 save
```

## Deploy (VPS)

Script:

- `scripts/deploy.sh`

Pipeline:

1. `git pull origin main`
2. `npm install`
3. `npm run build`
4. run migrations
5. restart PM2
6. validate `/health`

## Main Modules

- `auth` (`/auth/login`, `/auth/me`)
- `tenant` (`/tenants`)
- `tenant-user` (`/tenants/:tenantId/users`)
- `questionnaire` (`/questionnaires`, `/questionnaire-versions`)
- `campaign` (`/campaigns`)
- `reporting` (`/reports/campaigns/:campaignId/*`)
- `survey` (`/interviews/*`)
- `health` (`/health`)
