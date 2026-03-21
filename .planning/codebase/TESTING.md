# Testing Patterns

**Analysis Date:** 2026-03-21

## Test Framework

**Runner:**
- Jest 29.7.0
- Config: `jest.config.ts` at project root
- TypeScript support via `ts-jest` 29.2.5

**Assertion Library:**
- Jest built-in matchers (expect API)

**Run Commands:**
```bash
npm test                 # Run all tests with --runInBand (sequential)
npm run test:watch      # Run in watch mode
npm run test:db         # Run database integration tests only (test/survey.postgres.integration.spec.ts)
```

## Test File Organization

**Location:**
- Co-located pattern: `test/` directory at project root
- Mirror module structure: tests for `src/survey/` go in `test/survey.*.spec.ts`
- Support utilities in `test/support/` subdirectory

**Naming:**
- Unit tests: `[name].spec.ts` (e.g., `auth.service.spec.ts`, `rule-engine.spec.ts`)
- Integration tests: `[name].integration.spec.ts` (e.g., `survey.integration.spec.ts`)
- Database integration tests: `[name].postgres.integration.spec.ts`

**Structure:**
```
test/
├── auth.service.spec.ts
├── campaign.service.spec.ts
├── rule-engine.spec.ts
├── schema-validator.spec.ts
├── survey.integration.spec.ts
├── survey.postgres.integration.spec.ts
└── support/
    └── in-memory-survey.repository.ts
```

## Test Structure

**Suite Organization:**
- Top-level `describe()` block for the tested class/function
- Nested `describe()` for grouped test cases (if needed)
- Each `it()` test is self-contained

**Example from `auth.service.spec.ts`:**
```typescript
describe('AuthService', () => {
  it('returns token for valid credentials', async () => {
    // Arrange
    const passwordHash = await bcrypt.hash('secret123', 10);
    const repository: Partial<AuthRepository> = {
      findUserByEmail: jest.fn().mockResolvedValue({
        id: 'user-1',
        // ...
      }),
      updateLastLogin: jest.fn().mockResolvedValue(undefined),
    };

    // Act
    const service = new AuthService(repository as AuthRepository, jwtService as JwtService);
    const result = await service.login({ email: 'user@test.com', password: 'secret123' });

    // Assert
    expect(result.access_token).toBe('jwt-token');
  });

  it('rejects invalid credentials', async () => {
    // ...
  });
});
```

**Patterns:**
- Setup pattern: Mock dependencies in test body (not beforeEach)
  - Create partial implementations of repository/service
  - Use `jest.fn().mockResolvedValue()` for async methods
- Teardown pattern: Use `afterAll()` for cleanup (e.g., close database pool)
  ```typescript
  afterAll(async () => {
    await app.close();
  });
  ```
- Assertion pattern: Explicit expect statements; test one behavior per it()

## Mocking

**Framework:** Jest built-in mocking via `jest.fn()`

**Patterns:**
- Mock dependencies as `Partial<ServiceType>` cast to full type with `as`
- Mock resolved values: `jest.fn().mockResolvedValue(value)`
- Example from `campaign.service.spec.ts`:
  ```typescript
  const repository: Partial<CampaignRepository> = {
    getById: jest.fn().mockResolvedValue({ /* campaign data */ }),
    isQuestionnaireVersionPublishedAndScoped: jest.fn().mockResolvedValue(false),
  };
  ```

**What to Mock:**
- Repository/database layer (use in-memory test implementations)
- External services (auth, payment APIs)
- HTTP dependencies
- File system access

**What NOT to Mock:**
- Business logic classes like `RuleEngine` (test behavior directly)
- Validation functions
- Utility functions (unless they have side effects)
- Example from `rule-engine.spec.ts`: No mocks, create engine directly
  ```typescript
  const engine = new RuleEngine();
  const answers = new Map<string, unknown>([['q1', 'abc']]);
  const result = engine.evaluateCondition({ /* condition */ }, answers);
  ```

## Fixtures and Factories

**Test Data:**
- Define schema/data structures inline in tests
- Example from `survey.integration.spec.ts`:
  ```typescript
  const schema: QuestionnaireSchema = {
    meta: { name: 'NPS Revendas', version: 1 },
    questions: [
      {
        id: 'nps',
        label: 'Qual é a chance de recomendar?',
        type: 'nps',
        required: true,
        scale: { min: 0, max: 10 },
      },
      // ...
    ],
  };
  ```

**Test Support Classes:**
- `InMemorySurveyRepository` at `test/support/in-memory-survey.repository.ts`
  - Implements full `SurveyRepository` interface in-memory
  - Constructor takes `SeedData` with campaigns, respondents, and schemas
  - Used in integration tests to avoid real database
  - Allows inspection of created interviews and answers via public maps

## Coverage

**Requirements:** No coverage threshold enforced

**View Coverage:**
```bash
# Coverage is collected but not required; check if needed
npm test -- --coverage
```

**Configuration:** Configured in `jest.config.ts`
```typescript
collectCoverageFrom: ['src/**/*.ts'],
coverageDirectory: 'coverage',
```

## Test Types

**Unit Tests:**
- Scope: Single class/function in isolation
- Mocking: Mock all external dependencies
- Examples: `auth.service.spec.ts`, `rule-engine.spec.ts`, `schema-validator.spec.ts`
- Run time: Fast (milliseconds)

**Integration Tests:**
- Scope: Multiple components working together
- Mocking: Use in-memory test doubles (not real database)
- Examples: `survey.integration.spec.ts` (uses `InMemorySurveyRepository`)
- Setup: Create NestJS test module with `Test.createTestingModule()`
  ```typescript
  const moduleRef = await Test.createTestingModule({
    controllers: [SurveyController],
    providers: [
      SurveyService,
      RuleEngine,
      {
        provide: SURVEY_REPOSITORY,
        useValue: repository, // in-memory
      },
    ],
  }).compile();

  app = moduleRef.createNestApplication();
  await app.init();
  ```
- Run time: Medium (hundreds of milliseconds)

**Database Integration Tests:**
- Scope: Real PostgreSQL database integration
- Examples: `survey.postgres.integration.spec.ts`
- Environment: Requires `DATABASE_URL_TEST` env var set
- Skip logic: Tests are skipped if `DATABASE_URL_TEST` is not available
  ```typescript
  const databaseUrl = process.env.DATABASE_URL_TEST;
  const describeIfDb = databaseUrl ? describe : describe.skip;
  describeIfDb('Survey Runtime Engine (PostgreSQL integration)', () => {
    // test suite
  });
  ```
- Setup: Use raw SQL to seed test data before tests
  ```typescript
  beforeAll(async () => {
    pool = new Pool({ connectionString: databaseUrl });
    // Insert test data via SQL queries
  });
  ```
- Cleanup: Close connection pool after tests
  ```typescript
  afterAll(async () => {
    await pool.end();
  });
  ```
- Run time: Slow (seconds per test)

**E2E Tests:**
- Not currently present in codebase
- Would test full request/response cycle via HTTP
- Supertest library is installed and used in integration tests for HTTP testing

## Common Patterns

**Async Testing:**
- All async tests marked with `async` keyword
- Use `await` for promises
- No explicit `done()` callbacks needed
- Example from `auth.service.spec.ts`:
  ```typescript
  it('returns token for valid credentials', async () => {
    // ...
    const result = await service.login({ email, password });
    expect(result.access_token).toBe('jwt-token');
  });
  ```

**Error Testing:**
- Use `expect().rejects.toMatchObject()` for exceptions
- Match on error structure, not just type
- Example from `auth.service.spec.ts`:
  ```typescript
  await expect(
    service.login({ email: 'user@test.com', password: 'wrong' })
  ).rejects.toMatchObject({
    response: {
      error_code: 'AUTH_INVALID_CREDENTIALS',
    },
  });
  ```

**HTTP Testing (via Supertest):**
- Use `request(app.getHttpServer())` to make HTTP calls in tests
- Chain method, path, body, then expect status
- Example from `survey.integration.spec.ts`:
  ```typescript
  const startResponse = await request(app.getHttpServer())
    .post('/interviews/start')
    .send({
      tenant_id: 'tenant-1',
      campaign_id: 'campaign-1',
      respondent_id: 'respondent-1',
    })
    .expect(201);
  ```

**Conditional Test Execution:**
- Use `describe.skip()` for disabled test suites
- Use `describe.only()` to run single suite (avoid committing)
- Conditional skip based on environment: `const describeIfDb = databaseUrl ? describe : describe.skip;`

## Test Execution Order

**Default:** Tests run in parallel by file (controlled by Jest)
- Backend tests use `--runInBand` flag (sequential execution) to prevent database connection conflicts
- Reason: Shared state and database test data interference

```bash
npm test  # Jest config has testRegex: 'test/.*\\.spec\\.ts$'
```

---

*Testing analysis: 2026-03-21*
