# AI Analytics Reports

The CMS Analytics overview supports automatic AI reports for:

- daily reports
- weekly reports
- monthly reports

Each report uses two layers:

- deterministic analytics models: linear regression for inquiry forecasting and classification labels for listing/pipeline risk
- AI narrative: Groq (primary AI) or OpenRouter (fallback) turns the computed metrics into descriptive findings, predictive insights, actions, and risk flags

## Required Environment Variables

```env
# Primary AI: Groq
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b,qwen/qwen3.8-27b,openai/gpt-oss-20b

# Fallback AI: OpenRouter (optional)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_ANALYTICS_MODEL=openai/gpt-oss-120b:free
CRON_SECRET=use-a-long-random-secret
```

`GROQ_API_KEY` is prioritized as the primary provider. If missing or rate-limited, the system falls back to `OPENROUTER_API_KEY`, followed by deterministic smart fallback reports.

## Supabase SQL

Run these in order:

```text
supabase/cms-compatibility-views.sql
supabase/performance-hardening.sql
```

Do not run `supabase/analytics-materialized-views.sql`; it is deprecated because its old column names no longer match the CMS queries.

This creates/updates `ai_analytics_reports` with:

- `period_label`
- `summary`
- `report`
- `model_outputs`

## Automatic Schedule

`vercel.json` schedules:

- daily: every day at 12:10 AM Philippine time
- weekly: every Monday at 12:20 AM Philippine time
- monthly: every first day of the month at 12:30 AM Philippine time

The cron route is:

```text
/api/admin/ai-analytics-report?run=1&period=daily
```

On Vercel, cron requests are accepted through the Vercel cron header. `CRON_SECRET` is still used for manual cron-style testing outside Vercel.

## CMS Behavior

From the CMS:

```text
Analytics -> Predictive Analytics -> AI Analytics Report
```

The report is generated from tracked sessions/page views, inquiries, listings, recommendations, and agent activity. The CMS loads the latest stored weekly report; if none exists it creates one and displays it. If no AI key is configured, the report is clearly labelled as a deterministic fallback instead of being presented as AI output.

## Manual API Testing

From a local/API client with an admin Supabase token:

```bash
curl -X POST http://localhost:3000/api/admin/ai-analytics-report \
  -H "Authorization: Bearer ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"period\":\"weekly\"}"
```

Cron-style local test:

```bash
curl "http://localhost:3000/api/admin/ai-analytics-report?run=1&period=daily&secret=YOUR_CRON_SECRET"
```
