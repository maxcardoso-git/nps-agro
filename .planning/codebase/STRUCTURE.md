# Codebase Structure

**Analysis Date:** 2026-03-21

## Directory Layout

```
NPS-Agro/
├── src/                           # Backend NestJS application
│   ├── main.ts                    # Application entry point, bootstraps NestJS
│   ├── app.module.ts              # Root module with all imports and global guards
│   ├── common/                    # Shared utilities and infrastructure
│   │   ├── database.module.ts     # PostgreSQL connection pool module
│   │   ├── database.service.ts    # Query execution wrapper
│   │   ├── sql.repository.base.ts # Base class for all repositories
│   │   ├── json-logger.service.ts # Structured JSON logging
│   │   ├── metrics.service.ts     # Application metrics
│   │   ├── env.ts                 # Environment variable validation
│   │   ├── errors.ts              # DomainException base class
│   │   ├── types.ts               # Core interfaces (AuthUserClaims, etc.)
│   │   ├── constants.ts           # App-wide constants and role definitions
│   │   └── role-permissions.ts    # RBAC permission matrix
│   │
│   ├── survey/                    # Interview runtime engine (core feature)
│   │   ├── survey.controller.ts   # Interview API endpoints
│   │   ├── survey.service.ts      # Interview lifecycle orchestration (13KB)
│   │   ├── survey.module.ts       # Feature module declaration
│   │   ├── survey.types.ts        # Interview domain types (InterviewSession, Question, etc.)
│   │   ├── survey.errors.ts       # Survey-specific exceptions
│   │   ├── answer-validation.ts   # Answer type validation and normalization
│   │   ├── rule-engine.ts         # Display condition evaluation engine
│   │   └── repositories/
│   │       ├── survey.repository.ts      # Interface defining data contract
│   │       ├── pg-survey.repository.ts   # PostgreSQL implementation
│   │       └── repository.tokens.ts      # DI token constants
│   │
│   └── modules/                   # Feature modules
│       ├── auth/                  # Authentication and JWT
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.repository.ts
│       │   ├── auth.module.ts
│       │   ├── jwt-auth.guard.ts  # JWT validation guard
│       │   ├── jwt.strategy.ts    # Passport JWT strategy
│       │   └── dto/               # Login DTO
│       │
│       ├── access/                # Authorization and permissions
│       │   ├── permission.guard.ts        # RBAC permission enforcement
│       │   ├── tenant-scope.guard.ts      # Tenant isolation validation
│       │   ├── permissions.decorator.ts   # @Permissions() decorator
│       │   ├── roles.decorator.ts         # @Roles() decorator
│       │   ├── public.decorator.ts        # @Public() decorator (bypass auth)
│       │   └── current-user.decorator.ts  # @CurrentUser() decorator
│       │
│       ├── bff/                   # Backend-for-Frontend (HTTP infrastructure)
│       │   ├── bff.module.ts
│       │   ├── request-id.interceptor.ts       # Adds unique request ID
│       │   ├── response-envelope.interceptor.ts # Wraps responses in {success, data, meta}
│       │   ├── audit-context.interceptor.ts    # Captures audit context
│       │   └── http-exception.filter.ts        # Global error handling
│       │
│       ├── campaign/              # Campaign lifecycle management
│       │   ├── campaign.controller.ts     # Campaign CRUD and state transitions
│       │   ├── campaign.service.ts        # Campaign orchestration
│       │   ├── campaign.repository.ts     # Campaign data access
│       │   ├── campaign.module.ts
│       │   └── dto/                       # CreateCampaignDto, UpdateCampaignDto
│       │
│       ├── questionnaire/         # Questionnaire schema management
│       │   ├── questionnaire.controller.ts # Schema endpoints
│       │   ├── questionnaire.service.ts    # Schema lifecycle (draft, publish, version)
│       │   ├── questionnaire.repository.ts # Schema data access
│       │   ├── questionnaire.module.ts
│       │   └── dto/                        # CreateQuestionnaireDto, etc.
│       │
│       ├── reporting/             # Analytics and reporting
│       │   ├── reporting.controller.ts  # Report endpoints
│       │   ├── reporting.service.ts     # Report aggregation
│       │   ├── reporting.repository.ts  # Analytics queries
│       │   ├── reporting.module.ts
│       │   └── dto/                     # ReportFiltersDto
│       │
│       ├── tenant/                # Multi-tenancy support
│       │   ├── tenant.controller.ts
│       │   ├── tenant.service.ts
│       │   ├── tenant.repository.ts
│       │   ├── tenant.module.ts
│       │   └── dto/
│       │
│       ├── tenant-user/           # User management within tenants
│       │   ├── tenant-user.controller.ts
│       │   ├── tenant-user.service.ts
│       │   ├── tenant-user.repository.ts
│       │   ├── tenant-user.module.ts
│       │   └── dto/
│       │
│       └── health/                # Health check endpoint
│           ├── health.controller.ts
│           └── health.module.ts
│
├── user-portal/                   # Next.js respondent portal
│   ├── app/
│   │   ├── layout.tsx            # Root layout with i18n and theming
│   │   ├── [locale]/             # Dynamic locale routing
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/        # Dashboard page
│   │   │   ├── campaigns/        # Campaign list page
│   │   │   ├── interviews/       # Interview explorer page
│   │   │   └── login/            # Login page
│   │   └── middleware.ts         # Next.js i18n middleware
│   ├── components/
│   │   ├── ui/                   # Base UI components (buttons, forms, etc.)
│   │   ├── layout/               # Layout components (header, sidebar, footer)
│   │   └── charts/               # Chart components (Recharts-based)
│   ├── modules/
│   │   ├── dashboard/
│   │   │   └── components/       # Dashboard-specific components
│   │   ├── campaign-analytics/
│   │   │   └── components/       # Campaign analytics components
│   │   └── interview-explorer/
│   │       └── components/       # Interview exploration components
│   ├── lib/
│   │   ├── auth/                 # Auth helpers and hooks
│   │   ├── theme/                # Theme configuration
│   │   ├── i18n/                 # Internationalization setup
│   │   └── types/                # TypeScript types
│   ├── messages/                 # i18n message files (en, pt, etc.)
│   ├── public/                   # Static assets
│   ├── styles/                   # Global CSS (Tailwind config)
│   ├── package.json              # User portal dependencies
│   ├── tsconfig.json
│   ├── next.config.mjs           # Next.js configuration
│   ├── tailwind.config.ts        # Tailwind CSS configuration
│   └── middleware.ts             # Next.js request middleware
│
├── admin-console/                # Next.js admin portal
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── [locale]/
│   │   │   ├── tenants/          # Tenant management
│   │   │   ├── users/            # User management
│   │   │   └── settings/         # Admin settings
│   │   └── middleware.ts
│   ├── components/               # Admin-specific UI components
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom React hooks
│   ├── i18n/                     # i18n configuration
│   ├── lib/                      # Utility functions
│   ├── messages/                 # i18n messages
│   ├── providers/                # Context providers
│   ├── package.json
│   └── middleware.ts
│
├── Analytics/                    # Next.js analytics portal
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── [locale]/
│   │   │   ├── campaigns/        # Campaign analytics views
│   │   │   ├── reports/          # Report generation
│   │   │   └── dashboard/        # Analytics dashboard
│   │   └── middleware.ts
│   ├── components/               # Analytics-specific components
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom hooks
│   ├── lib/
│   ├── messages/                 # i18n messages
│   └── package.json
│
├── sql/                          # Database migrations and schemas
│   └── *.sql                     # Migration files
│
├── scripts/                      # Utility scripts
│   ├── run-migrations.sh         # Database migration runner
│   ├── deploy.sh                 # VPS deployment script
│   └── *.sh
│
├── test/                         # Backend test suite
│   ├── survey.postgres.integration.spec.ts # PostgreSQL integration tests
│   └── *.spec.ts
│
├── dist/                         # Compiled backend output (generated)
│   └── **/*.js                   # Compiled JavaScript
│
├── .planning/                    # GSD planning documents
│   └── codebase/                 # This directory
│
├── package.json                  # Backend dependencies (NestJS, PostgreSQL, JWT, etc.)
├── tsconfig.json                 # Backend TypeScript configuration
├── tsconfig.build.json           # Build-specific TypeScript config
├── jest.config.js                # Jest test configuration
├── .eslintrc.json                # ESLint configuration
├── .env.example                  # Example environment variables
└── .gitignore
```

## Directory Purposes

**src/**
- Purpose: Backend NestJS application source code
- Contains: TypeScript modules, controllers, services, repositories
- Key files: main.ts (entry), app.module.ts (root), common/ (shared)
- Language: TypeScript (.ts files)

**src/common/**
- Purpose: Shared infrastructure and utilities across all modules
- Contains: Database layer, logging, validation, type definitions, RBAC matrix
- Key files: database.service.ts, sql.repository.base.ts, types.ts, role-permissions.ts
- Usage: Imported by all modules for DI and common functionality

**src/survey/**
- Purpose: Core interview runtime engine - handles interview lifecycle
- Contains: Controller, Service (orchestration), Repository (data access), RuleEngine, TypeDefinitions
- Key files: survey.service.ts (13KB - largest service), rule-engine.ts
- Critical: This is the main business logic feature

**src/modules/**
- Purpose: Feature modules implementing specific business capabilities
- Organization: Each module (auth, campaign, questionnaire, etc.) is self-contained
- Pattern: controller.ts → service.ts → repository.ts with dto/ for validation

**user-portal/, admin-console/, Analytics/**
- Purpose: Frontend applications for different user roles
- Technology: Next.js 15 with React 19, TailwindCSS, next-intl for i18n
- Structure: App router with dynamic [locale] segments for internationalization
- Pattern: Shared components, domain-specific modules, context providers for state

**sql/**
- Purpose: Database schema and migration files
- Contains: SQL migration scripts executed via `npm run migrate`
- Naming: Numbered or timestamped .sql files

**test/**
- Purpose: Backend integration and unit tests
- Framework: Jest (configured in jest.config.js)
- Key test: survey.postgres.integration.spec.ts tests survey flow with real PostgreSQL

**dist/**
- Purpose: Compiled backend output (DO NOT COMMIT)
- Generated: By `npm run build` (tsc -p tsconfig.build.json)
- Contains: JavaScript versions of src/ (included in .gitignore)

## Key File Locations

**Entry Points:**
- Backend: `src/main.ts` - NestJS bootstrap, loads env, configures middleware/guards, starts server
- User Portal: `user-portal/app/layout.tsx` - Root React layout, i18n provider
- Admin Console: `admin-console/app/layout.tsx` - Admin root layout
- Analytics: `Analytics/app/layout.tsx` - Analytics root layout

**Configuration:**
- Backend env: `.env.example` - Template with required variables
- Backend database: `sql/*.sql` - Migration files, executed by migrate script
- Backend build: `tsconfig.json`, `tsconfig.build.json` - TypeScript compilation config
- Frontend (Next.js): `next.config.mjs`, `tailwind.config.ts` - Framework configuration
- Frontend i18n: `messages/` directories in each portal - Translation files

**Core Logic:**
- Interview runtime: `src/survey/survey.service.ts` - 13KB, handles all interview logic
- Campaign management: `src/modules/campaign/campaign.service.ts`
- Questionnaire schema: `src/modules/questionnaire/questionnaire.service.ts`
- Reporting engine: `src/modules/reporting/reporting.service.ts`
- Permission system: `src/common/role-permissions.ts` - RBAC matrix definition
- Auth validation: `src/modules/auth/auth.service.ts`, `src/modules/access/permission.guard.ts`

**Testing:**
- Test entry: `test/survey.postgres.integration.spec.ts` - Integration test with real DB
- Jest config: `jest.config.js` - Runner configuration
- Run tests: `npm test` or `npm run test:watch`

**Shared Infrastructure:**
- Database: `src/common/database.service.ts`, `src/common/database.module.ts` - Connection pool, query execution
- Logger: `src/common/json-logger.service.ts` - Structured JSON logging throughout application
- Error handling: `src/common/errors.ts` - DomainException base class with HTTP mapping
- HTTP layer: `src/modules/bff/` - Request/response interceptors and filters

## Naming Conventions

**Files:**
- Controllers: `[domain].controller.ts` - Example: `survey.controller.ts`, `campaign.controller.ts`
- Services: `[domain].service.ts` - Example: `survey.service.ts`
- Repositories: `[domain].repository.ts` (interface) and `pg-[domain].repository.ts` (implementation)
- Modules: `[domain].module.ts` - Example: `survey.module.ts`
- DTOs: `[action]-[entity].dto.ts` - Example: `create-campaign.dto.ts`, `update-campaign.dto.ts`
- Guards: `[purpose].guard.ts` - Example: `jwt-auth.guard.ts`, `permission.guard.ts`
- Interceptors: `[purpose].interceptor.ts` - Example: `response-envelope.interceptor.ts`
- Utilities: `[purpose].ts` - Example: `answer-validation.ts`, `rule-engine.ts`
- Interfaces/Types: `[domain].types.ts` or inline - Example: `survey.types.ts`
- Constants: `constants.ts` or `[domain].constants.ts`

**Directories:**
- Feature modules: kebab-case - Example: `tenant-user/`, `admin-console/`
- Subdirectories: descriptive plural when containing multiple items - Example: `repositories/`, `components/`, `dto/`, `modules/`
- Locale-specific: `[locale]` (dynamic Next.js segment) - Example: `[locale]/campaigns/`

**Functions/Classes:**
- Classes: PascalCase - Example: `SurveyService`, `RuleEngine`, `SqlRepositoryBase`
- Functions: camelCase - Example: `validateAndNormalizeAnswer()`, `shouldDisplayQuestion()`
- Methods: camelCase - Example: `startInterview()`, `answerQuestion()`
- Constants: UPPER_SNAKE_CASE - Example: `SURVEY_REPOSITORY`, `DB_POOL`, `IS_PUBLIC_KEY`
- Decorators: camelCase or PascalCase - Example: `@CurrentUser()`, `@Permissions()`, `@Public()`

## Where to Add New Code

**New Interview-Related Feature:**
- Implementation: `src/survey/survey.service.ts` (add method to orchestration)
- Database: `src/survey/repositories/pg-survey.repository.ts` (add query method)
- Interface: Update `src/survey/repositories/survey.repository.ts` (add method signature)
- Types: Update `src/survey/survey.types.ts` if new domain types needed
- Controller: Update `src/survey/survey.controller.ts` (add endpoint if client-facing)
- Tests: Add test case to `test/survey.postgres.integration.spec.ts`

**New Business Feature Module (e.g., Feedback, Sentiment):**
1. Create directory: `src/modules/[feature-name]/`
2. Create files:
   - `src/modules/[feature-name]/[feature].controller.ts` - HTTP handlers
   - `src/modules/[feature-name]/[feature].service.ts` - Business logic
   - `src/modules/[feature-name]/[feature].repository.ts` - Data access interface
   - `src/modules/[feature-name]/[feature].module.ts` - NestJS module
   - `src/modules/[feature-name]/[feature].types.ts` (if domain types needed)
   - `src/modules/[feature-name]/dto/` directory for request/response DTOs
3. Register in `src/app.module.ts` imports array
4. Define routes following REST pattern:
   - `GET /[features]` - List with filters
   - `POST /[features]` - Create
   - `GET /[features]/:id` - Get one
   - `PATCH /[features]/:id` - Update
   - `POST /[features]/:id/[action]` - State transitions
5. Add permission checks via `@Permissions()` decorator on handlers
6. Extend `SqlRepositoryBase` for repository implementation

**New Shared Utility:**
- Location: `src/common/[utility-name].ts`
- Export: Named exports for functions, interfaces, constants
- Usage: Import throughout application

**New Frontend Component (User Portal):**
- UI Component: `user-portal/components/ui/[ComponentName].tsx`
- Feature Component: `user-portal/modules/[feature]/components/[ComponentName].tsx`
- Custom Hook: `user-portal/lib/[hookName].ts` if reusable across features
- Context: `user-portal/contexts/[Context].tsx` if state is shared across components

**New Permission:**
- Add to: `src/common/role-permissions.ts` - Update ROLE_PERMISSIONS matrix
- Format: `'[resource].[action]'` - Example: `'feedback.read'`, `'sentiment.create'`
- Apply: Use `@Permissions('feedback.read')` on controller methods

**New Error Type:**
- For survey: Extend `SurveyException` in `src/survey/survey.errors.ts`
- For domain: Extend `DomainException` in `src/common/errors.ts`
- Define: Code string, message, HTTP status code
- Throw from: Service layer with meaningful context

## Special Directories

**node_modules/**
- Purpose: npm dependencies
- Generated: By npm install
- Committed: No (in .gitignore)
- Modify: Never edit directly, update package.json and reinstall

**dist/**
- Purpose: Compiled backend JavaScript output
- Generated: By npm run build (TypeScript compilation)
- Committed: No (in .gitignore)
- Contains: Mirror of src/ structure as .js files with source maps
- Runtime: This is what runs in production via `node dist/main.js`

**.planning/codebase/**
- Purpose: GSD architecture and structure documentation
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, etc.
- Committed: Yes (reference documents)
- Updated: By `/gsd:map-codebase` command

---

*Structure analysis: 2026-03-21*
