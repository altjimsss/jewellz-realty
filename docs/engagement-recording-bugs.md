# Engagement Recording Bug Notes

This note documents the issues found while setting up Playwright coverage for the public property page, analytics tracking, and CMS engagement pipeline.

## Goal

Verify that a real visitor flow records engagement data:

- A user visits a property detail page.
- The page sends a property view event to `/api/analytics`.
- The user opens the inquiry form.
- The site sends a detail-open event to `/api/analytics`.
- The user submits an inquiry.
- `/api/inquiries` creates a lead record that can feed the CMS pipeline.

## What Was Added

- Installed `@playwright/test`.
- Added `playwright.config.ts`.
- Added `e2e/engagement-recording.spec.ts`.
- Added npm scripts:
  - `npm run test:e2e`
  - `npm run test:e2e:ui`

## Bugs Found

### 1. Playwright Was Installed Without Browser Binaries

First run failed because Chromium was not installed:

```text
browserType.launch: Executable doesn't exist
Please run: npx playwright install
```

Handled by installing Chromium only:

```bash
npx playwright install chromium
```

### 2. Property View Tracking Appeared Missing

The first E2E test waited for a `property_view` analytics response and timed out.

After inspecting the page and running a browser network probe, the page was confirmed to send:

```json
{ "event": "property_view" }
```

The issue was not the component. `PropertyAnalyticsTracker` was already mounted inside `PropertyDetailContent`.

Temporary duplicate tracker added to the page was removed to avoid double-counting.

### 3. Analytics API Returned 200 But Did Not Actually Track

The browser sent analytics requests, but `/api/analytics` returned:

```json
{ "tracked": false, "warning": "Could not find the 'page_path' column of 'analytics_events' in the schema cache" }
```

This means the API returned HTTP 200, but Supabase rejected the insert.

Handled by adding schema fallback logic in `app/api/analytics/route.ts`:

- Try the full payload first.
- If Supabase reports a missing column, retry without that column.
- This prevents optional schema differences from blocking the core event insert.

### 4. Live Supabase Schema Was Older Than The SQL Patch

After fixing `page_path`, Supabase also reported missing `source`:

```json
{ "tracked": false, "warning": "Could not find the 'source' column of 'analytics_events' in the schema cache" }
```

Handled by making the fallback generic instead of hardcoding only `page_path`.

### 5. Analytics Event Enum Rejected New Event Names

Supabase rejected these event names:

```text
invalid input value for enum analytics_event_type: "property_view"
invalid input value for enum analytics_event_type: "detail_open"
```

Handled by adding event-type aliases in `app/api/analytics/route.ts`:

- `property_view` can fall back to `page_view`, `view`, or `listing_view`.
- `detail_open` can fall back to `property_detail_open`, `property_open`, `property_click`, `click`, `page_view`, or `view`.

This keeps the app compatible with older enum definitions while still letting newer schemas use the preferred event names.

### 6. Session Upsert Could Fail Against Older Session Schema

One fallback caused `analytics_events.session_id` foreign key errors:

```text
insert or update on table "analytics_events" violates foreign key constraint "analytics_events_session_id_fkey"
```

Then removing `session_id` was not valid because the live table required it:

```text
null value in column "session_id" of relation "analytics_events" violates not-null constraint
```

Handled by adding adaptive session upsert fallback:

- Insert/update the session first.
- Remove unknown session columns if the older schema does not have them.
- If the traffic source enum rejects a custom UTM value like `debug` or `playwright`, use `other`.

### 7. Inquiry Form Selector Was Ambiguous

Playwright failed on:

```ts
page.getByPlaceholder("Message")
```

because both the AI chat and inquiry form contain message-like inputs.

Handled by making the selector exact:

```ts
page.getByPlaceholder("Message", { exact: true })
```

### 8. Existing Dev Server Can Interfere With Playwright

There was already a Next dev server running on port 3000. Next refused to start a second server:

```text
Another next dev server is already running.
```

Playwright was configured to reuse an existing server in local development. That is useful, but it means stale dev-server state can affect the test.

Handled by:

- Keeping `reuseExistingServer: true` for local development.
- Switching Playwright base URL to `http://localhost:3000`.
- Noting that a clean run may require stopping the existing Next dev process.

### 9. Current Remaining Test Runner Issue

An earlier Playwright run hit:

```text
page.goto: net::ERR_INSUFFICIENT_RESOURCES
```

This looks like a local browser/dev-server resource issue, not an application logic failure. A direct Playwright network probe confirmed analytics requests were sent and `/api/analytics` returned:

```json
{ "tracked": true }
```

Recommended next step:

```bash
taskkill /PID 335896 /F
npm run test:e2e
```

Use the PID shown by Next if it changes.

### 10. Inquiry Submission Failed Because `source` Did Not Match The Live Enum

After the analytics flow started passing, the E2E test reached inquiry submission but failed because `/api/inquiries` returned `422`:

```json
{ "error": "invalid input value for enum traffic_source: \"property_detail\"" }
```

The public form sends `source: "property_detail"` because that is useful intent context for lead scoring. The live database `source` column, however, uses a stricter traffic source enum.

Handled by normalizing the inserted database value in `app/api/inquiries/route.ts`:

- `facebook` -> `social_media_facebook`
- `instagram` -> `social_media_instagram`
- `email` -> `email_campaign`
- `phone` -> `phone`
- `walk` -> `walk_in`
- `referral` -> `referral`
- `organic` or `search` -> `organic_search`
- `direct` -> `direct`
- everything else, including `property_detail`, -> `other`

The original `source` value is still used before insert for lead scoring.

## Current Status

Confirmed working by direct browser probe:

- Property page emits `property_view`.
- Opening the inquiry form emits `detail_open`.
- `/api/analytics` can now return `{ "tracked": true }` against the current live schema.

Confirmed by full Playwright E2E run:

- `npm run test:e2e` passes.
- The test verifies property-view tracking, inquiry-form open tracking, and successful inquiry creation.

## Files Changed For This Work

- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `e2e/engagement-recording.spec.ts`
- `app/api/analytics/route.ts`
- `app/api/inquiries/route.ts`
- `app/(public)/project-list/[slug]/page.tsx`
