# Architecture

**Analysis Date:** 2026-03-21

## Pattern Overview

**Overall:** Modular NestJS Backend with Multi-Portal Frontend

This is a monorepo combining a NestJS survey runtime engine with three separate Next.js frontend portals. The backend follows a modular architecture with dependency injection, while frontends are Next.js applications with i18n and theming support.

**Key Characteristics:**
- Modular design: Core business logic separated into logical modules (survey, campaign, questionnaire, reporting, auth, etc.)
- Layered architecture: Controllers → Services → Repositories pattern with data abstraction
- Multi-tenant support: Tenant scoping via guards and context injection
- Role-based access control (RBAC): Permission validation through decorators and guards
- Stateless API design: JWT authentication with claim-based authorization
- Repository pattern: Abstract data access with interface-based implementation
- Dependency injection: NestJS providers for loose coupling and testability

## Layers

**HTTP Transport Layer:**
- Purpose: Handle HTTP requests, responses, and cross-cutting concerns
- Location: `src/modules/bff/` (BFF = Backend-for-Frontend)
- Contains: Global interceptors, filters, and middleware
  - `request-id.interceptor.ts`: Adds unique request ID to all requests
  - `response-envelope.interceptor.ts`: Wraps all API responses in standard envelope format
  - `audit-context.interceptor.ts`: Captures audit metadata (user, timestamp, action)
  - `http-exception.filter.ts`: Centralized error handling and transformation
- Depends on: NestJS framework
- Used by: All incoming HTTP requests

**Authentication & Authorization Layer:**
- Purpose: Verify identity, extract claims, enforce permissions
- Location: `src/modules/auth/` and `src/modules/access/`
- Contains:
  - JWT strategy and guard (`auth/jwt-auth.guard.ts`, `auth/jwt.strategy.ts`)
  - Permission guard with decorator-based enforcement (`access/permission.guard.ts`)
  - Tenant scope guard (`access/tenant-scope.guard.ts`) - validates user belongs to requested tenant
  - Access control decorators (`@Public()`, `@Permissions()`, `@Roles()`, `@CurrentUser()`)
- Depends on: Passport.js, JWT tokens, RBAC definitions
- Used by: App guards registered globally in `src/app.module.ts`

**Controller Layer:**
- Purpose: Define API endpoints and parse HTTP request data
- Location: `src/survey/survey.controller.ts`, `src/modules/*/[entity].controller.ts`
- Contains: Route handlers with HTTP method decorators (@Post, @Get, @Patch, etc.)
- Examples:
  - `src/survey/survey.controller.ts`: Interview lifecycle endpoints (start, answer, complete)
  - `src/modules/campaign/campaign.controller.ts`: Campaign CRUD and state transitions
  - `src/modules/questionnaire/questionnaire.controller.ts`: Schema management and publishing
  - `src/modules/reporting/reporting.controller.ts`: Analytics and summary generation
- Depends on: Services for business logic
- Used by: HTTP clients

**Service Layer (Business Logic):**
- Purpose: Implement core business rules, orchestrate data operations, apply validation
- Location: `src/survey/survey.service.ts`, `src/modules/*/[entity].service.ts`
- Contains:
  - Interview runtime engine (`survey/survey.service.ts`): Manages interview state, question logic, answer validation
  - Campaign lifecycle (`campaign/campaign.service.ts`): Campaign state machine and lifecycle
  - Questionnaire schema management (`questionnaire/questionnaire.service.ts`): Version control and publication
  - Reporting engine (`reporting/reporting.service.ts`): Analytics aggregation and filtering
  - Rule engine (`survey/rule-engine.ts`): Display condition evaluation for conditional questions
- Depends on: Repositories, domain logic utilities, rule engines
- Used by: Controllers

**Repository Layer (Data Access Abstraction):**
- Purpose: Abstract data access, provide interface-based data operations, handle SQL queries
- Location: `src/survey/repositories/` and `src/modules/*/[entity].repository.ts`
- Contains:
  - `survey/repositories/survey.repository.ts` (interface): Contract for survey data operations
  - `survey/repositories/pg-survey.repository.ts`: PostgreSQL implementation
  - `SqlRepositoryBase`: Base class with common query methods (many, one, execute)
  - Module-specific repositories: TenantRepository, CampaignRepository, QuestionnaireRepository, etc.
- Pattern: Extends `SqlRepositoryBase` and implements typed repository interfaces
- SQL execution: Parameterized queries via `DatabaseService`
- Depends on: DatabaseService, raw SQL, PostgreSQL driver
- Used by: Services via dependency injection

**Data Access Layer:**
- Purpose: Manage database connections, execute queries, handle connection lifecycle
- Location: `src/common/database.module.ts`, `src/common/database.service.ts`
- Contains:
  - PostgreSQL connection pool via `pg` library
  - Global module exported from `DatabaseModule`
  - Query execution wrapper with result mapping
- Depends on: PostgreSQL via `pg` driver, environment configuration
- Used by: Repository implementations

**Domain/Utilities Layer:**
- Purpose: Shared business logic, validation, type definitions
- Location: `src/common/` and domain-specific utilities
- Contains:
  - `common/types.ts`: Core interfaces (AuthUserClaims, RequestWithContext, PaginationQuery)
  - `common/constants.ts`: Application constants, role definitions
  - `common/role-permissions.ts`: RBAC permission matrix
  - `common/errors.ts`: DomainException base class
  - `survey/survey.types.ts`: Interview, question, schema domain types
  - `survey/survey.errors.ts`: Survey-specific exceptions
  - `survey/answer-validation.ts`: Answer type validation and normalization
- Depends on: TypeScript, class-validator
- Used by: Services and repositories

**Common Infrastructure:**
- Purpose: Cross-cutting concerns shared across modules
- Location: `src/common/`
- Contains:
  - `json-logger.service.ts`: Structured logging with JSON output
  - `metrics.service.ts`: Application metrics collection
  - Environment validation and loading (`common/env.ts`)
- Depends on: NestJS, logging abstractions
- Used by: All modules

## Data Flow

**Interview Start Flow:**

1. Client calls `POST /interviews/start` with `{tenant_id, campaign_id, respondent_id, channel}`
2. `SurveyController.startInterview()` receives request with validated body (ValidationPipe)
3. Global guards execute:
   - `JwtAuthGuard`: Validates JWT token, extracts claims
   - `TenantScopeGuard`: Verifies user's tenant_id matches or user is platform_admin
   - `PermissionGuard`: No specific permission required for this endpoint
4. `SurveyService.startInterview()` orchestrates:
   - Validates campaign exists and belongs to tenant (via repository)
   - Validates respondent exists in campaign (via repository)
   - Loads questionnaire schema version
   - Creates interview record in database
   - Loads any existing answers
   - Executes rule engine to determine first visible question
5. `ResponseEnvelopeInterceptor` wraps response: `{success: true, data: {next_question, interview_state}, meta: {request_id, timestamp}}`
6. Client receives first question and interview session state

**Answer Submission Flow:**

1. Client calls `POST /interviews/{id}/answer` with `{tenant_id, question_id, value}`
2. `SurveyController.answerQuestion()` receives request
3. Global guards execute (auth, tenant scope verification)
4. `SurveyService.answerQuestion()` orchestrates:
   - Loads interview record, validates it exists and belongs to tenant
   - Checks interview is in answerable state (in_progress)
   - Loads questionnaire schema and existing answers
   - Finds question in schema
   - Validates question is visible based on current answers (rule engine)
   - Normalizes and validates answer value (answer-validation utility)
   - Persists answer to database with tenant/campaign/interview context
   - Updates interview status if needed
   - Determines next visible question
   - If interview complete, triggers async processing job
5. Response includes next_question and updated interview_state

**Campaign to Reporting Flow:**

1. Campaign created via `CampaignService.createCampaign()`
2. Campaign linked to questionnaire version
3. Respondents imported via campaign endpoints
4. As interviews complete, answers stored with campaign context
5. Reporting service aggregates:
   - Queries answers filtered by campaign, tenant, interview filters
   - Calculates NPS score, sentiment, and breakdowns
   - Applies question-level rules for conditional data
   - Returns executive summary with trends

**State Management:**

- **Interview State**: Immutable sequence of answer records in database, no client-side cache
- **Campaign State**: State machine transitions (draft → active → paused → completed)
- **User Context**: Derived from JWT claims at request time, not cached
- **Questionnaire Version**: Immutable schema snapshots per version, referenced by campaigns
- **Session State**: Interview's current_question_id derived from schema + answers at query time

## Key Abstractions

**SurveyRepository (Interface):**
- Purpose: Abstract all survey-related data operations, enable testing/mock implementations
- Location: `src/survey/repositories/survey.repository.ts`
- Methods:
  - `getCampaignContext(tenantId, campaignId)`: Load campaign and questionnaire version
  - `getQuestionnaireSchema(versionId)`: Load immutable schema snapshot
  - `createInterview(params)`: Create new interview record
  - `getInterview(id)`: Load interview with status
  - `getAnswers(interviewId)`: Load all answers for interview
  - `insertAnswer(params)`: Persist answer with type-specific columns
  - `updateInterviewStatus(id, status, completedAt)`: Transition interview state
  - `createProcessingJob(params)`: Queue async job (AI enrichment, etc.)
- Implementation: `src/survey/repositories/pg-survey.repository.ts`

**RuleEngine:**
- Purpose: Evaluate display conditions to determine which questions are visible
- Location: `src/survey/rule-engine.ts`
- Core method: `shouldDisplayQuestion(question, answersByQuestionId)` → boolean
- Operators supported: equals, not_equals, in, not_in, gte, lte, gt, lt
- Pattern: Recursive condition evaluation based on previous answers
- Used for: Conditional branching in questionnaires

**SqlRepositoryBase:**
- Purpose: Provide common database query patterns with type safety
- Location: `src/common/sql.repository.base.ts`
- Methods:
  - `many<T>(sql, params)`: Execute SELECT, return array of T
  - `one<T>(sql, params)`: Execute SELECT, return single T or null
  - `execute(sql, params)`: Execute INSERT/UPDATE/DELETE, return affected rows
- Pattern: Parameterized queries prevent SQL injection, consistent error handling

**Module Structure (Feature Module):**
- Pattern: Each major feature is a NestJS @Module with isolated exports
- Contains: Controller(s), Service(s), Repository/Repositories, Module file
- Example: `src/modules/campaign/` contains:
  - `campaign.controller.ts`: HTTP handlers
  - `campaign.service.ts`: Business logic
  - `campaign.repository.ts`: Data access
  - `campaign.module.ts`: NestJS module declaration and DI configuration
  - `dto/`: Data transfer objects for request validation
- Registered in: `src/app.module.ts` imports array

## Entry Points

**API Server:**
- Location: `src/main.ts`
- Triggers: npm start (Node runtime)
- Responsibilities:
  - Load and validate environment variables
  - Initialize NestJS application
  - Configure global pipes (ValidationPipe with whitelist + transform)
  - Install global security middleware (Helmet)
  - Enable CORS with configurable origins
  - Register global interceptors (RequestId, ResponseEnvelope, AuditContext)
  - Register global filters (GlobalHttpExceptionFilter)
  - Register global guards (Throttler, JwtAuth, TenantScope, Permission)
  - Start server on configured PORT
  - Log startup event with context

**Frontend Portals:**
- User Portal: `user-portal/app/layout.tsx` (Next.js root layout)
- Admin Console: `admin-console/app/layout.tsx`
- Analytics: `Analytics/app/layout.tsx`
- Each uses Next.js i18n middleware and integrates with shared API client

**Health Check:**
- Location: `src/modules/health/health.controller.ts`
- Endpoint: `GET /health` (bypasses ResponseEnvelopeInterceptor)
- Purpose: Readiness probe for deployment systems

## Error Handling

**Strategy:** Consistent exception hierarchy with HTTP status mapping

**Exception Classes:**
- `DomainException` (base): Extends HttpException, includes error_code, message, details
  - Location: `src/common/errors.ts`
  - Used for: Application-level domain errors (auth failures, validation, not found)
- `SurveyException`: Extends HttpException, survey-specific codes
  - Location: `src/survey/survey.errors.ts`
  - Used for: Interview state errors, schema validation, question/campaign lookup failures
  - Example codes: CAMPAIGN_NOT_FOUND, RESPONDENT_NOT_FOUND, QUESTION_NOT_FOUND

**Response Format (via GlobalHttpExceptionFilter):**
```json
{
  "success": false,
  "error_code": "AUTH_INVALID_CREDENTIALS",
  "message": "Credenciais inválidas",
  "details": null,
  "meta": {
    "request_id": "uuid-123",
    "timestamp": "2026-03-21T..."
  }
}
```

**Common Status Codes:**
- 400: Validation errors (invalid input)
- 401: Authentication failures (missing/invalid JWT)
- 403: Authorization failures (insufficient permissions, inactive user, tenant mismatch)
- 404: Resource not found (campaign, interview, questionnaire)
- 409: State conflict (interview not in answerable state)
- 429: Rate limited (via ThrottlerGuard)
- 500: Unexpected errors (logged with request context)

## Cross-Cutting Concerns

**Logging:** Structured JSON logging via JsonLoggerService
- All module methods log state transitions with context (interview_id, tenant_id)
- Example: `INTERVIEW_STARTED interview_id=uuid tenant_id=uuid`
- Integrated with NestJS logger lifecycle

**Validation:** Multi-layer approach
- DTO validation: class-validator decorators on request bodies
- GlobalValidationPipe: Whitelist unknown fields, auto-transform types
- Domain validation: Business logic checks in services (e.g., campaign exists, respondent valid)
- Answer validation: Type-specific normalization in `answer-validation.ts`

**Authentication:** JWT-based with tenant awareness
- JwtStrategy extracts claims from bearer token
- JwtAuthGuard enforces token presence (except @Public routes)
- Claims include: sub (user ID), tenant_id, role, permissions, email
- TenantScopeGuard verifies user's effective tenant matches request

**Authorization:** Role-based with fine-grained permissions
- Defined in: `src/common/role-permissions.ts`
- Roles: platform_admin, tenant_admin, survey_manager, analyst, respondent
- Permissions system: RBAC matrix mapping roles to permission strings
- @Permissions decorator on handlers specifies required permission
- PermissionGuard validates user has all required permissions
- @Public decorator bypasses permission checks (e.g., /health, auth endpoints)

**Request Context:**
- RequestIdInterceptor: Generates UUID for each request, stores in request.requestId
- AuditContextInterceptor: Captures user, tenant, action, timestamp
- All responses include request_id in meta for tracing

**Rate Limiting:**
- ThrottlerGuard globally limits 100 requests per 60 seconds per IP
- Applied to all routes except /health

---

*Architecture analysis: 2026-03-21*
