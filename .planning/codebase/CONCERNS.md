# Codebase Concerns

**Analysis Date:** 2026-03-21

## Tech Debt

**Hardcoded API URL in frontend:**
- Issue: The frontend API client has a hardcoded IP address as fallback, making it inflexible for different environments
- Files: `user-portal/lib/api.ts:11`
- Impact: If `NEXT_PUBLIC_API_URL` environment variable is not set, the frontend always points to `http://72.61.52.70:3310`. This breaks portability and makes testing/staging deployments difficult
- Fix approach: Remove the hardcoded fallback or use a proper environment-aware configuration. Either require the env var to be set or use relative paths (`/api/*`) with API routing

**Weak JWT fallback secret:**
- Issue: JWT strategy uses `'dev-secret'` as fallback when `JWT_SECRET` env var is missing
- Files: `src/modules/auth/jwt.strategy.ts:12`
- Impact: In development environments with missing env vars, authentication becomes trivially bypassable with a known secret
- Fix approach: Remove the fallback entirely and let the env validation in `loadAndValidateEnv()` catch missing JWT_SECRET at startup. Environment validation already enforces 32+ character requirement

**Raw SQL string interpolation in campaign repository:**
- Issue: While parameterized queries are used correctly, the dynamic WHERE clause construction in `campaign.repository.ts` manually builds SQL predicates
- Files: `src/modules/campaign/campaign.repository.ts:90-142`
- Impact: Low immediate risk (parameters are still bound), but the pattern could be misused elsewhere. Makes SQL injection patterns easier to copy
- Fix approach: Consider using a query builder (Knex, Prisma) or extract clause building to a dedicated utility with strict validation rules

## Known Bugs

**Session storage dual-write vulnerability:**
- Symptoms: Authentication session is stored in both cookie AND localStorage, but readSession() has preference order that may diverge
- Files: `user-portal/lib/auth/session.ts:23-51`
- Trigger: User logs in, session stored in both. If cookie expires but localStorage persists, stale token continues to be used
- Workaround: Manual logout clears both, but passive expiry only affects one storage medium
- Fix approach: Pick one storage mechanism. Either use httpOnly cookie (requires Next.js API middleware) or localStorage with explicit expiry checking on read

**Password validation too permissive:**
- Symptoms: Login form accepts empty password (min(1) in Zod, trimmed string check)
- Files: `user-portal/app/[locale]/login/page.tsx:17`
- Trigger: Type whitespace-only password, passes client validation, backend will reject but UX is poor
- Impact: Low security risk (server validates), but UX issue for users
- Fix approach: Change Zod schema to `z.string().min(1).trim()` to normalize whitespace

**Missing required question validation in interview completion:**
- Symptoms: Service checks for answered required questions, but doesn't verify question schema consistency
- Files: `src/survey/survey.service.ts:160-172`
- Trigger: If questionnaire schema changes after interview starts, progress calculation may become inconsistent
- Impact: Edge case but could allow completing interviews with missing answers if schema is updated mid-interview
- Fix approach: Store questionnaire version immutably with interview, validate no schema changes mid-flight

## Security Considerations

**Access token stored in localStorage (XSS vulnerability):**
- Risk: Sensitive JWT token stored in browser's localStorage, accessible to any injected JavaScript
- Files: `user-portal/lib/auth/session.ts:17-26` and `user-portal/app/[locale]/login/page.tsx:40-41`
- Current mitigation: Cookie has SameSite=Lax, but localStorage has no protection
- Recommendations:
  1. Use httpOnly, Secure cookies only (inaccessible to JS)
  2. If localStorage needed, sign tokens with short expiry (< 5 mins) and refresh via API endpoint
  3. Add CSP header to block inline scripts and restrict script sources

**Base64 session encoding is not encryption:**
- Risk: Session data in localStorage is base64-encoded but NOT encrypted. Full session (including token) is readable in plaintext
- Files: `user-portal/lib/auth/session.ts:4-14`
- Current mitigation: None
- Recommendations:
  1. If localStorage is necessary, encrypt session with AES-256-GCM
  2. Better: Migrate to httpOnly cookie + CSRF token pattern
  3. Minimum: Add Content Security Policy headers

**Credential timing attack vulnerability:**
- Risk: Login endpoint returns same error message for "user not found" and "invalid password", but response times may differ due to bcrypt.compare()
- Files: `src/modules/auth/auth.service.ts:17-26`
- Current mitigation: Both invalid cases return 401 with identical message
- Recommendations:
  1. Add random delay to constant-time hash verification (if needed for high-security applications)
  2. Current approach is reasonable for most use cases; document this decision

**No rate limiting on login endpoint:**
- Risk: Brute force attacks on authentication endpoint
- Files: `src/modules/auth/` controller (not shown but referenced in package.json)
- Current mitigation: Package.json shows `@nestjs/throttler` is available but may not be applied
- Recommendations:
  1. Apply throttle guard to login endpoint (max 5 attempts per minute per IP)
  2. Add account lockout after N failed attempts
  3. Log suspicious authentication patterns

## Performance Bottlenecks

**N+1 query pattern in dashboard interviews fetch:**
- Problem: Dashboard fetches 500 interviews at once (`page_size: 500`) and then filters in-memory
- Files: `user-portal/app/[locale]/dashboard/page.tsx:73` and `modules/dashboard/transform.ts`
- Cause: API returns full paginated list, no server-side filtering on region/sentiment/nps/dates. Frontend filters with `applyFilters()` on entire result set
- Improvement path:
  1. Implement server-side filtering in `/reports/campaigns/{campaignId}/interviews` endpoint
  2. Reduce default page_size to 50-100
  3. Add query parameters for region, sentiment, nps_min, nps_max, date_from, date_to
  4. Use database indexes on these columns

**Large schema validation on every answer submission:**
- Problem: Schema validator runs full validation including all question rules on each answer
- Files: `src/survey/survey.service.ts:89-105` fetches and validates entire schema per request
- Cause: Schema is fetched from database and parsed on every answer submission
- Improvement path:
  1. Cache questionnaire schema in memory (redis with TTL)
  2. Invalidate cache when schema is updated
  3. Consider embedding schema_json directly in questionnaire_version table with indexed query

**Serial answer fetches in interview lifecycle:**
- Problem: `getAnswers()` called multiple times per request (startInterview, answerQuestion, nextQuestion, completeInterview)
- Files: `src/survey/survey.service.ts` - multiple methods call `this.repository.getAnswers()`
- Cause: No caching of answers between operations
- Improvement path:
  1. Cache answers within interview context (request-scoped)
  2. Batch answer fetches if multiple interviews processed
  3. Use connection pooling effectively (already configured with pg Pool)

**Dashboard renders 3 independent queries sequentially:**
- Problem: Campaigns list, executive summary, and interviews are fetched with separate queries, no parallel optimization
- Files: `user-portal/app/[locale]/dashboard/page.tsx:49-76`
- Cause: useQuery hooks execute in sequence by dependency chain
- Improvement path:
  1. Campaigns list is fine (independent)
  2. Summary and interviews both depend on campaignId - can't parallelize
  3. However: Once campaignId selected, these should fetch in parallel (they do via useQuery)
  4. Consider server-side rendering for initial data load to avoid waterfalls

## Fragile Areas

**Rule engine logic complexity:**
- Files: `src/survey/rule-engine.ts` (not fully reviewed)
- Why fragile: Survey flow depends on conditional question visibility based on rule engine. If rules are complex, changes risk breaking interview flow
- Safe modification: Add rule unit tests for each operator (equals, not_equals, in, not_in, gte, lte, gt, lt) and verify with integration tests
- Test coverage: Minimal (rule-engine.spec.ts exists but needs verification of coverage)

**Interview state mutation during completion:**
- Files: `src/survey/survey.service.ts:142-195`
- Why fragile: Interview completion directly mutates response object state (lines 188-191 set fields directly)
- Safe modification: Build final state object rather than mutating returned object. Ensure no side effects after DB write
- Test coverage: Integration test exists but check for edge cases (network failure mid-write, race conditions)

**Type coercion in answer extraction:**
- Files: `src/survey/survey.service.ts:279-293` - extractValue() uses multiple type checks with no validation schema
- Why fragile: If database schema or question type definitions change, type mismatches could silently convert values incorrectly
- Safe modification: Add runtime type guards and explicit type validation. Consider zod for schema validation
- Test coverage: answer-validation.ts has test but extractValue() behavior should be tested separately

**Session serialization without schema versioning:**
- Files: `user-portal/lib/auth/session.ts:4-14`
- Why fragile: Session format is base64-encoded JSON with no version marker. If AuthSession interface changes, old sessions silently fail to decode
- Safe modification: Add version field to serialized session format; implement migration logic for format changes
- Test coverage: No tests for session serialization/deserialization edge cases

## Scaling Limits

**Database connection pool default:**
- Current capacity: Pool connection default is database config (likely 10-20 connections)
- Limit: With 500-interview dashboard queries and concurrent user loads, pool exhaustion possible
- Scaling path:
  1. Monitor pool utilization in production
  2. Increase pool max size if needed (tuning required)
  3. Consider connection pooling service (PgBouncer) in front of database
  4. Implement connection timeout and retry logic

**Interview data fetching (500 record limit):**
- Current capacity: Dashboard loads `page_size: 500` interviews at once
- Limit: Browser memory/rendering will struggle with 500+ table rows; API response time degrades
- Scaling path:
  1. Implement virtual scrolling in table component
  2. Reduce page_size to 50-100
  3. Add server-side filtering to reduce payload
  4. Implement cursor-based pagination for large datasets

**Questionnaire schema size unconstrained:**
- Current capacity: No limit on number of questions or schema_json size
- Limit: Very large questionnaires (1000+ questions) will cause:
   - Slow schema parsing and validation on every answer
   - Large JSON payloads
   - Memory pressure in frontend
- Scaling path:
  1. Add MAX_QUESTIONS constraint (suggest 500)
  2. Implement schema compression or chunking
  3. Cache schema aggressively
  4. Add pagination/multi-step questionnaires for UX

## Dependencies at Risk

**@nestjs/throttler not applied:**
- Risk: Package is in dependencies but no evidence of guards applied to login/sensitive endpoints
- Impact: API is vulnerable to brute force attacks
- Migration plan: Apply `@Throttle()` decorator to AuthController.login() with rate limits (e.g., 5 requests/minute per IP)

**Outdated type definitions:**
- Risk: @types/passport-jwt, @types/pg, @types/jest versions are from early 2024, may lag behind library updates
- Impact: Low but could miss type safety improvements
- Migration plan: Update devDependencies quarterly; use `npm audit` to check for known vulnerabilities

**bcryptjs security considerations:**
- Risk: bcryptjs (JavaScript implementation) vs bcrypt (native) - slower, may limit hash rounds
- Impact: Low risk for typical web app; more concerning for high-security applications
- Migration plan: OK to keep for now; document decision. If performance becomes issue, consider native bcrypt with async workers

## Missing Critical Features

**No audit logging for sensitive operations:**
- Problem: Authentication (login/logout) and data changes are not logged to audit trail
- Blocks: Compliance requirements, security incident investigation, user accountability
- Files affected: `src/modules/auth/auth.service.ts`, `src/survey/survey.service.ts`
- Priority: High (regulatory/compliance requirement for most SaaS)
- Fix approach: Implement AuditLog entity; log all auth attempts, survey completions, configuration changes

**No data encryption at rest:**
- Problem: Interview answers and respondent data stored plaintext in PostgreSQL
- Blocks: GDPR/CCPA compliance, especially for sensitive survey responses
- Files affected: All repositories inserting to `core.answer`, `core.respondent` tables
- Priority: Medium-High (depends on data sensitivity and regulatory requirements)
- Fix approach: Add column-level encryption (PgCrypto) or application-level encryption for PII fields

**No mechanism to prevent concurrent interview modifications:**
- Problem: No optimistic or pessimistic locking on interviews
- Blocks: Race conditions if same interview answered by multiple clients simultaneously
- Files affected: `src/survey/survey.service.ts` - answerQuestion() and nextQuestion()
- Priority: Low (unlikely in practice but possible with mobile apps)
- Fix approach: Add version/timestamp column to interview; implement optimistic locking check before update

## Test Coverage Gaps

**Frontend authentication flow not tested:**
- What's not tested: Session storage, read/write, token refresh, logout
- Files: `user-portal/lib/auth/session.ts`, `user-portal/lib/auth/auth-context.tsx`, `user-portal/app/[locale]/login/page.tsx`
- Risk: Regressions in auth flow silently break entire application
- Priority: High (critical user path)
- Approach: Add Jest tests for session.ts functions, integration tests for login/logout with mock API

**Dashboard filter logic untested:**
- What's not tested: applyFilters() transformation, date range parsing, sentinel value handling
- Files: `user-portal/modules/dashboard/transform.ts`
- Risk: Filter bugs result in incorrect analytics display (data integrity issue)
- Priority: Medium
- Approach: Add Jest unit tests with sample interview data; test edge cases (empty filters, future dates, invalid ranges)

**Rule engine coverage incomplete:**
- What's not tested: All operator combinations, edge cases with null/undefined values, deeply nested conditions
- Files: `src/survey/rule-engine.ts` (rule-engine.spec.ts exists but needs verification)
- Risk: Survey logic bugs could cause questions to show/hide incorrectly, breaking interview flow
- Priority: High (core logic)
- Approach: Add tests for each operator with valid/invalid inputs; test rule precedence and short-circuit behavior

**API error handling for edge cases:**
- What's not tested: Malformed JSON, missing required fields, oversized payloads, slow database timeouts
- Files: `src/modules/bff/http-exception.filter.ts` and all controllers
- Risk: Unhandled errors leak internal details or crash service
- Priority: Medium
- Approach: Add supertest integration tests for common HTTP error scenarios

---

*Concerns audit: 2026-03-21*
