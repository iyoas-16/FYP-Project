
DROP POLICY IF EXISTS "auth insert cache" ON public.url_cache;
DROP POLICY IF EXISTS "auth update cache" ON public.url_cache;

CREATE OR REPLACE FUNCTION public.upsert_url_cache(
  _url_hash TEXT,
  _url TEXT,
  _result public.detection_result,
  _confidence REAL,
  _method TEXT,
  _details JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth required';
  END IF;
  INSERT INTO public.url_cache (url_hash, url, result, confidence_score, detection_method, details)
  VALUES (_url_hash, _url, _result, _confidence, _method, _details)
  ON CONFLICT (url_hash) DO UPDATE
    SET result = EXCLUDED.result,
        confidence_score = EXCLUDED.confidence_score,
        detection_method = EXCLUDED.detection_method,
        details = EXCLUDED.details,
        created_at = now();
END;
$$;
