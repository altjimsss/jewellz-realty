# Automatic Property Embeddings

This setup makes new or edited CMS properties generate embeddings automatically.

## 1. Deploy the Edge Function

```bash
supabase login
supabase link --project-ref yhqocckbuvyzxhrbcqao
supabase functions deploy generate-property-embedding --no-verify-jwt
```

## 2. Add Function Secrets

```bash
supabase secrets set PROPERTY_EMBEDDING_WEBHOOK_SECRET="choose-a-long-random-secret"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in hosted Supabase Edge Functions.

## 3. Create the Database Webhook

In Supabase Dashboard:

1. Go to `Database` → `Webhooks`.
2. Click `Create a new hook`.
3. Name: `generate-property-embedding`.
4. Table: `public.properties`.
5. Events: `Insert` and `Update`.
6. Type: `Supabase Edge Functions`.
7. Function: `generate-property-embedding`.
8. Method: `POST`.
9. Headers:

```txt
x-webhook-secret: choose-a-long-random-secret
```

10. Save and enable the webhook.

## 4. How It Works

- The SQL trigger fills `embedding_text` for every property.
- The webhook calls the Edge Function after insert/update.
- The Edge Function runs Supabase `gte-small` AI embeddings.
- The Edge Function updates `properties.embedding`.
- If an embedding already exists, it skips the row to avoid webhook loops.

## 5. Verify

Add or edit a property in the CMS, then run:

```sql
SELECT title, embedding IS NOT NULL AS has_embedding, embedding_updated_at
FROM properties
ORDER BY updated_at DESC
LIMIT 5;
```

The edited property should show `has_embedding = true`.
