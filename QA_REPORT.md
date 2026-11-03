# Portal, Triage, and Analytics QA Report

**Run date:** 2026-11-03  
**Scope:** Admin, Agent, Developer Partner portals; inquiry triage; lead scoring; behavioral tracking; analytics.  
**Environment:** Local source review only. The configured Supabase host belongs to the deployed Jewellz Realty project and appears production. No Supabase data was read or written, and no portal E2E tests were run.

## Executive summary

The local baseline passes typecheck and production build. Lint fails with 35 errors and 8 warnings. `npm install` completed and reported 29 dependency vulnerabilities (1 low, 16 moderate, 10 high, 2 critical). Six isolated lead-scoring tests pass after a local fix for non-finite/negative inputs.

Database-backed behavior is **BLOCKED** pending a staging/test Supabase target. This includes role/RLS isolation, portal CRUD, inquiry persistence, analytics aliases on the deployed enum, dashboard metric accuracy, and data cleanup. No test accounts, QA rows, screenshots, or cleanup work were created.

### Highest risks found in static review

1. **High — self role escalation may be possible if this policy is deployed as written.** `profiles_self_update` allows a user to update their own profile row without restricting columns or adding a role-preserving `WITH CHECK`. Must verify direct JWT/RLS behavior in staging before concluding exploitability.
2. **High — appointment failure can leave a lead without its appointment.** The endpoint creates an inquiry before inserting the appointment; appointment insert failure returns 422 but leaves the inquiry row.
3. **High — analytics aliases can misclassify events.** The compatibility retry may store `detail_open` as a generic click or page view. Source docs confirm this was added for enum drift; live enum behavior is unverified.
4. **High — fallback writes can be silently incomplete.** Analytics checks the `analytics_events` insert result but ignores failures from session upsert, property analytics, and recommendation click update.
5. **Medium — analytics endpoints permit event inflation attempts.** The route rate limits by client key and first session id, but event names/property IDs are not validated against a trusted property list here. Effectiveness of the rate-limit key and RLS must be tested.
6. **Medium — public RLS grants broad updates.** The checked-in compatibility SQL gives public update access to session rows and recommendation rows (`USING (TRUE)`). If deployed, anonymous callers can attempt arbitrary updates within those tables' grants/policies.
7. **Medium — admin embedding endpoint accepts its secret in a query parameter.** URL secrets can enter access logs and browser/proxy history. Use a header-only credential and rotate any previously exposed secret.
8. **Medium — scoring fallback can lose score.** Inquiry insertion fallback omits `lead_score`, and may retry with alternate message column. On older schemas, fallback can persist a lead with a default/absent score.
9. **Medium — admin AI endpoints read bounded datasets.** Routes use hard limits (e.g. 1,000 inquiries, 2,000 sessions, 1,500 events) without pagination, so aggregate narratives may represent only a subset on larger datasets.
10. **Low — lint is not clean.** Most errors are in the generated/vendor MapLibre worker, but application files also contain lint errors and warnings.

## Baseline and local verification

| Check | Result | Evidence |
|---|---|---|
| `npm install` | PASS with warnings | Exit 0; 560 packages audited; 29 vulnerabilities reported. Peer dependency warnings include ESLint 10 versus plugin peer range up to 9. |
| `npm run typecheck` | PASS | Exit 0. |
| `npm run lint` | FAIL | 35 errors, 8 warnings. Includes application errors in admin analytics chat, portal session timeout, gallery, project list, and property filters; generated `public/maplibre-gl-worker.mjs` accounts for 25 errors. |
| `npm run build` | PASS | Next production build completed, TypeScript passed, 41 static pages generated. |
| `npm run test:unit` | PASS | 6 lead-scoring tests pass. |
| `npm run test:e2e` | BLOCKED | Not run: existing specs can create/update Auth users and insert inquiry/analytics rows; configured DB appears production. |

## Results matrix

| ID | Area | Result | Evidence / reason |
|---|---|---|---|
| ENV-01 | Supabase target safety | BLOCKED | Local env metadata points to a deployed Supabase project. No database calls were made. Need a staging project configured locally. |
| ENV-02 | Test data and cleanup | BLOCKED | No QA data created. Requires staging Auth/DB credentials. |
| BASE-01 | Typecheck | PASS | `npm run typecheck` exit 0. |
| BASE-02 | Lint | FAIL | `npm run lint`: 35 errors, 8 warnings. |
| BASE-03 | Build | PASS | `npm run build` exit 0. |
| AUTH-01 | Portal login, logout, reset, timeout | BLOCKED | Requires role test accounts and browser session checks. |
| AUTH-02 | Route role matrix and API authorization | PARTIAL | `proxy.ts` enforces page role redirects; relevant admin/profile handlers contain authorization checks. API-by-API token matrix not exercised. |
| AUTH-03 | Direct RLS, IDOR, self role update | BLOCKED | Must use role JWTs against staging. Policy review flagged self-update policy for direct verification. |
| PIPE-01 | Inquiry validation and creation | PARTIAL | Static route review only. Rate limit, reCAPTCHA, message/email/phone validation exist; persistence and fallback outcomes unverified. |
| PIPE-02 | Appointment booking and conflict handling | PARTIAL | Static review found inquiry is inserted before appointment, so appointment insert failure leaves an orphan inquiry. Race/timezone behavior untested. |
| PIPE-03 | Admin/Agent triage workflows | BLOCKED | Requires portal accounts, fixture inquiries, and DB verification. |
| PIPE-04 | Developer data isolation/CRUD | BLOCKED | Requires two test developers and owned fixtures. |
| TRACK-01 | Event inventory | PARTIAL | Static inventory below; no network/database verification. |
| TRACK-02 | Alias/fallback effects | BLOCKED | Requires deployed staging schema and direct stored-row inspection. |
| METRIC-01 | Dashboard metric accuracy | BLOCKED | No deterministic DB fixture or raw SQL comparison was run. |
| AI-01 | AI report auth/provider/fallback correctness | PARTIAL | Source review only; no endpoint calls or provider requests. Hard row limits are present. |
| SEC-01 | Service key/client bundle, XSS, upload, IDOR, mass assignment | BLOCKED | Requires build artifact/security review and adversarial route checks; not all endpoints reviewed. |
| PERF-01 | 5k/100k load, k6, N+1 | BLOCKED | No test DB/load environment. |

## Static bugs and risks

| ID | Severity | Portal/area | Finding / reproduction | Root cause | Status |
|---|---|---|---|---|---|
| SEC-01 | High | RBAC | A signed-in user may attempt `PATCH profiles/{self}` changing `role` or `is_active`; policy does not restrict updated columns. Exploitability depends on other deployed policies/grants. | `supabase/rbac-policies.sql:55` | Needs staging verification and likely policy correction. |
| PIPE-01 | High | Appointments | Force appointment insert failure after inquiry succeeds; response is 422 but inquiry remains. | `app/api/appointments/route.ts` inserts inquiry before appointment, with no transaction/compensation. | Proposed; transaction or compensating delete needed. |
| TRACK-01 | High | Analytics | Force `sessions` upsert or `property_analytics` insert failure while core event insert succeeds; API may still report tracked success. | `app/api/analytics/route.ts`, `trackAnalyticsEvent` ignores those results. | Proposed; aggregate and report all required write failures. |
| TRACK-02 | High | Analytics | Use a schema whose enum rejects preferred event; compatibility retry can store another event type. | `app/api/analytics/route.ts`, `eventTypeCandidates` and `insertWithSchemaFallback`; history documented in `docs/engagement-recording-bugs.md`. | Needs product/schema decision; avoid generic page-view aliases for distinct actions. |
| SEC-02 | Medium | Analytics/RLS | Attempt anonymous update of arbitrary session/recommendation rows if compatibility policies are active. | `supabase/cms-compatibility-views.sql:204-210, 228-238`; similar permissive policies also in `rbac-policies.sql`. | Needs deployed-policy verification and narrower ownership/field policies. |
| SEC-03 | Medium | Admin embeddings | Secret can be submitted as `?secret=` and is compared directly. | `app/api/admin/property-embeddings/route.ts:isAuthorized` | Proposed: remove query secret path; header-only auth and rotate exposed values. |
| PIPE-02 | Medium | Inquiry scoring | Force initial inquiry insert schema error; fallback retries without `lead_score`. | `app/api/inquiries/route.ts` fallback payload omits score. | Proposed: make scoring loss explicit or migrate schema; add persistence check. |
| METRIC-01 | Medium | AI analytics | On large datasets, generated metrics may use capped rows rather than complete totals. | `app/api/admin/ai-analytics-report/route.ts` uses limits on inquiries/sessions/events and views. | Needs decision: aggregate via SQL/RPC or paginate all relevant rows. |
| SCORE-01 | Medium | Lead scoring | NaN/infinite behavior inputs could produce a NaN score; negative inputs could reduce score. | `lib/lead-scoring.ts` input handling. | **Fixed locally** by treating negative/non-finite counters and dwell as zero and ignoring non-finite array entries. Regression tests added. |

## Lead scoring tests

Added `npm run test:unit` using Node's built-in test runner (Node 22 type stripping). The six tests cover score range/rounding, capped view counts, dwell thresholds, contact/source/priority/response-time signals, negative/non-finite inputs, array input, and inclusive priority thresholds. All six pass.

## Tracking inventory (source review only)

| Event | Trigger | Payload observed in source | Storage/consumer path | Result |
|---|---|---|---|---|
| `page_view` | Public route pathname changes; private route regex excludes admin/agent/developer/login/reset | immediate flag, pathname, referrer, UTM, anonymous visitor/device/browser/OS/language | `analytics_events`; session page-view count; analytics dashboards | Static only; API/DB not exercised. |
| `property_view` | Property detail tracker mounts | propertyId plus common session/page/environment fields | `analytics_events`, `property_analytics`; inquiry score behavior signals | Static only; live enum may alias. |
| `property_dwell_time` | Property page hides, exits, or unmounts after at least five seconds | propertyId, rounded durationSeconds | event metadata; lead scoring reads max/total dwell | Static only; background-tab/multi-tab semantics unverified. |
| `detail_open` | Inquiry card opens | propertyId plus common fields | event tables; interactions feed score | Static only; may be aliased to click/page-view. |
| `recommendation_click` | Recommendation click (two UI handlers) | propertyId, recommendationId, recommendationSource | event tables; attempts to set recommendation clicked fields | Static only; recommendation update errors ignored. |

The queue batches 12, caps at 60 (drops oldest with `ok:false`), flushes every 650 ms, and deduplicates event/property/path/session keys for 10 seconds. Page exit uses `sendBeacon`. `postAnalyticsBatch` treats any HTTP 2xx as success and does not inspect `{tracked:false}`, so the client can resolve `ok:true` despite a server-side tracking failure.

## Metrics, schema drift, and fallbacks

| Deliverable | Result |
|---|---|
| Per-dashboard metric source/value comparison | BLOCKED: no fixture database or direct SQL access used. |
| Live schema drift (missing columns/enums) | BLOCKED: docs record prior drift (`page_path`, `source`, event enum, session FK/source), but current live state was not queried. |
| Analytics aliases actually stored live | BLOCKED: requires staging event insertion and row inspection. |
| Fallback branches statically identified | Analytics event type alias candidates; missing-column retry; session upsert missing-column and enum fallback; inquiry message-column fallback; appointment inquiry-column variants. |
| AI narrative hallucination and cron authorization | BLOCKED: no report generation or cron call performed. |

## Cleanup log

No test users or database rows were created. No cleanup was required. No `.env*` files were edited. The pre-existing untracked `tmp-card-test.cjs` was left untouched.

## To unblock the remaining QA

1. Configure a dedicated staging/test Supabase project in the local environment (do not paste keys into chat).
2. Confirm it is safe to create and delete QA-prefixed users/rows there.
3. Run the existing E2E tests only against that staging target; extend them with isolated role, pipeline, analytics, and direct DB assertions. Record and remove all `QA-` fixtures afterward.
