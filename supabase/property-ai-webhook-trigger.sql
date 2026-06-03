-- Direct SQL version of the Database Webhook for automatic property embeddings.
-- This invokes the deployed Edge Function after property insert/update.

CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TRIGGER IF EXISTS trg_generate_property_embedding_insert ON public.properties;
DROP TRIGGER IF EXISTS trg_generate_property_embedding_update ON public.properties;

CREATE OR REPLACE FUNCTION public.invoke_property_embedding_webhook()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
	request_id BIGINT;
	payload JSONB;
BEGIN
	payload := jsonb_build_object(
		'type', TG_OP,
		'table', TG_TABLE_NAME,
		'schema', TG_TABLE_SCHEMA,
		'record', to_jsonb(NEW),
		'old_record', CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END
	);

	SELECT net.http_post(
		url := 'https://yhqocckbuvyzxhrbcqao.supabase.co/functions/v1/generate-property-embedding',
		body := payload,
		headers := '{"Content-Type":"application/json","x-webhook-secret":"jewellz-auto-embedding-secret-2026"}'::JSONB,
		timeout_milliseconds := 5000
	)
	INTO request_id;

	RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_property_embedding_insert
AFTER INSERT ON public.properties
FOR EACH ROW
WHEN (NEW.embedding IS NULL AND NEW.embedding_text IS NOT NULL)
EXECUTE FUNCTION public.invoke_property_embedding_webhook();

CREATE TRIGGER trg_generate_property_embedding_update
AFTER UPDATE ON public.properties
FOR EACH ROW
WHEN (
	NEW.embedding IS NULL
	AND NEW.embedding_text IS NOT NULL
	AND OLD.embedding_text IS DISTINCT FROM NEW.embedding_text
)
EXECUTE FUNCTION public.invoke_property_embedding_webhook();
