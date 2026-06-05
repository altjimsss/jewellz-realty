# Load Testing Jewellz Realty

Use this after deploying the app and running the Supabase SQL patches. Do not judge capacity from `next dev`; test against a production or staging deployment.

## Prerequisites

Install k6:

```bash
winget install k6
```

Run the Supabase SQL files in this order:

```text
supabase/cms-compatibility-views.sql
supabase/performance-hardening.sql
```

## Test Commands

Replace `BASE_URL` with your deployed URL. `PROPERTY_ID` should be the UUID of the property used by `PROPERTY_PATH`.

```bash
$env:BASE_URL="https://your-site.example.com"
$env:PROPERTY_PATH="/project-list/azure-studio-condo"
$env:PROPERTY_ID="your-property-uuid"

$env:USERS="200"; npm run load:k6
$env:USERS="500"; npm run load:k6
$env:USERS="1000"; npm run load:k6
```

## Pass Criteria

Treat the platform as healthy only when:

- failed requests stay below 2%
- p95 request duration stays below 2.5 seconds
- `/api/analytics` accepts batched events without repeated 429s
- `/api/inquiries` still creates valid leads during traffic
- CMS analytics still show the recorded engagement after the test

If 500 or 1000 users fail, reduce analytics event volume first, then check Supabase database CPU, connection usage, and API rate limits.
