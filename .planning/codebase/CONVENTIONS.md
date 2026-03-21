# Coding Conventions

**Analysis Date:** 2026-03-21

## Naming Patterns

**Files:**
- Services: `[name].service.ts` (e.g., `survey.service.ts`, `auth.service.ts`)
- Controllers: `[name].controller.ts` (e.g., `survey.controller.ts`)
- Repositories: `[name].repository.ts` (e.g., `pg-survey.repository.ts`, `auth.repository.ts`)
- Modules: `[name].module.ts`
- DTOs: `[name].dto.ts` in `dto/` subdirectory
- Error classes: `[name].errors.ts`
- Tests: `[name].spec.ts` in `test/` directory
- React components: PascalCase for exported components (e.g., `Button.tsx`, `LocaleShell.tsx`)

**Functions:**
- Private methods: camelCase with leading underscore (e.g., `assertNonEmpty()`, `buildRuntimeResponse()`)
- Public methods: camelCase (e.g., `startInterview()`, `login()`, `evaluateCondition()`)
- Async methods: always marked with `async` keyword
- Handler functions in React: camelCase (e.g., `onClick`, `handleSubmit`)

**Variables:**
- camelCase for all variables and constants (e.g., `tenantId`, `campaignId`, `isLoading`)
- Numeric constants with underscores for readability: `60_000` for 60000
- Database/API field names: snake_case (e.g., `tenant_id`, `campaign_id`, `questionnaire_version_id`)
- React state hooks: camelCase (e.g., `const [client] = useState()`)

**Types:**
- Interface: PascalCase with `I` prefix or no prefix (e.g., `AuthUserClaims`, `ButtonProps`, `ValidationResult`)
- Type aliases: PascalCase (e.g., `ButtonVariant`, `QuestionType`, `LogLevel`)
- Enum-like objects: UPPERCASE_SNAKE_CASE for keys (e.g., `LEVEL_WEIGHT`, `ALLOWED_OPERATORS`)

## Code Style

**Formatting:**
- No explicit formatter configuration (prettier config not found)
- Standard 2-space indentation
- Semicolons required at end of statements
- String literals: single or double quotes (see examples below)

**Linting:**
- ESLint with Next.js config for frontend (`next/core-web-vitals`)
- Backend uses standard TypeScript compilation without strict eslint config
- No shared eslint config across monorepo

## Import Organization

**Order:**
1. Node.js standard library imports (e.g., `import { randomUUID } from 'node:crypto'`)
2. Third-party library imports (e.g., `import { Injectable } from '@nestjs/common'`)
3. Local relative imports (e.g., `import { SurveyService } from './survey.service'`)
4. Type imports (e.g., `import type { Config } from 'jest'`)

**Path Aliases:**
- Backend: none detected
- Frontend (user-portal): `@/*` resolves to `./src/*` per `tsconfig.json`
  - Use `@/lib/auth`, `@/components`, `@/lib/utils` for imports in Next.js

**Example from `survey.integration.spec.ts`:**
```typescript
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SURVEY_REPOSITORY } from '../src/survey/repositories/repository.tokens';
// ...local imports
```

## Error Handling

**Patterns:**
- Custom exception class: `DomainException` extends `HttpException` from NestJS
  - Constructor signature: `DomainException(code: string, message: string, status: HttpStatus, details?: unknown)`
  - Error responses include `error_code`, `message`, and optional `details`
  - Example from `auth.service.ts`:
    ```typescript
    throw new DomainException('AUTH_INVALID_CREDENTIALS', 'Credenciais inválidas', HttpStatus.UNAUTHORIZED);
    ```

- Domain-specific exceptions: `SurveyException` for survey module
  - Can include HTTP status or use default behavior
  - Example from `answer-validation.ts`:
    ```typescript
    throw new SurveyException('INVALID_RANGE', 'NPS value must be between 0 and 10');
    ```

- Try/catch: Used in interceptors and error filters to capture and transform exceptions
- Never silently ignore errors; always log or throw

## Logging

**Framework:** NestJS built-in `Logger` from `@nestjs/common`

**Custom Service:** `JsonLoggerService` at `src/common/json-logger.service.ts`
- Implements `LoggerService` interface
- Supports structured logging with context and metadata
- Log levels: `error`, `warn`, `info`, `debug` (configurable via `LOG_LEVEL` env var)

**Patterns:**
- Constructor injection: `private readonly logger = new Logger(ClassName.name);`
- Log before/after key operations:
  - Example from `survey.service.ts`:
    ```typescript
    this.logger.log(`INTERVIEW_STARTED interview_id=${interview.id} tenant_id=${interview.tenant_id}`);
    ```
- Error logging: `this.logger.error(message, trace, context)` with optional context object
- Message format: UPPERCASE_SNAKE_CASE prefix followed by key fields
- Use named fields in logs: `field_name=value` format

## Comments

**When to Comment:**
- Explain "why" not "what" (code is clear about what it does)
- Document complex business logic or non-obvious algorithm choices
- Mark temporary workarounds with explanation
- No JSDoc/TSDoc comments enforced; keep comments minimal

**Example:** Rarely used; code is self-documenting via clear naming

## Function Design

**Size:** Most functions 20-50 lines
- Keep functions focused on single responsibility
- Extract helper functions for repetitive logic

**Parameters:**
- Use objects (DTOs) for multiple related parameters
- Example from `survey.service.ts`:
  ```typescript
  async startInterview(input: StartInterviewInput): Promise<SurveyRuntimeResponse>
  ```
- Validate inputs via NestJS `ValidationPipe` or throw custom exceptions

**Return Values:**
- Always declare explicit return types (no implicit `any`)
- Use custom types for complex returns (e.g., `SurveyRuntimeResponse`, `ValidationResult`)
- Async functions always return `Promise<T>`

**Example from `rule-engine.ts`:**
```typescript
evaluateCondition(condition: DisplayCondition, answersByQuestionId: Map<string, unknown>): boolean {
  // Explicit boolean return
  // Early returns for clarity
  if (left === undefined) {
    return false;
  }
  // Switch statement with exhaustive cases
  switch (condition.operator) {
    case 'equals':
      return String(left) === String(right);
    // ...
  }
}
```

## Module Design

**Exports:**
- Each module exports a single class (service, controller, repository)
- DTOs exported from module to avoid re-exports
- Example from `tenant-user.service.ts`:
  ```typescript
  export class TenantUserService {
    // methods
  }
  ```

**Barrel Files:** Not used; no index.ts files exporting multiple items
- Imports are explicit and path-specific

**Dependency Injection:**
- NestJS constructor injection for all dependencies
- Never instantiate services directly; always inject
- Use token-based injection for interfaces (e.g., `SURVEY_REPOSITORY` token)
  ```typescript
  constructor(
    @Inject(SURVEY_REPOSITORY) private readonly repository: SurveyRepository,
  )
  ```

## React Component Conventions (Frontend)

**File Structure:**
- Components in `components/` directory with subdirectories by feature
- Pages in `app/[locale]/` following Next.js App Router conventions
- Hooks in `lib/` directory (e.g., `lib/auth/use-auth-guards.ts`)

**Component Signature:**
- Use `'use client'` directive at top of client components
- Props interface extends React element type (e.g., `React.ButtonHTMLAttributes<HTMLButtonElement>`)
- Example from `Button.tsx`:
  ```typescript
  interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
  }
  ```

**Styling:**
- Tailwind CSS for styling
- Use `cn()` utility from `@/lib/utils` for conditional classes
- Define style variants as Record types for component variations

**State Management:**
- React Query (TanStack Query) for server state: `@tanstack/react-query`
- React Hook Form for form state: `react-hook-form`
- Custom context providers for auth and theme (e.g., `AuthProvider`, `TenantThemeProvider`)
- Zod for schema validation: `zod`

---

*Convention analysis: 2026-03-21*
