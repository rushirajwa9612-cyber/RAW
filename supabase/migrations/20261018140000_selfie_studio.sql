-- Private reference/output storage. Browser clients receive only short-lived signed URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('selfie-private', 'selfie-private', false, 20971520, ARRAY['image/png','image/jpeg','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/png','image/jpeg','image/webp'];

CREATE TABLE IF NOT EXISTS public.selfie_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference_path text NOT NULL,
  people_mode text NOT NULL CHECK (people_mode IN ('single','couple')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','stopped','deleted')),
  image_count integer NOT NULL DEFAULT 0 CHECK (image_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.selfie_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.selfie_sessions(id) ON DELETE CASCADE,
  generation_id uuid NOT NULL UNIQUE REFERENCES public.generations(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  sequence integer NOT NULL,
  category text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT selfie_jobs_user_key UNIQUE(user_id, idempotency_key),
  CONSTRAINT selfie_jobs_session_sequence UNIQUE(session_id, sequence)
);

ALTER TABLE public.selfie_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.selfie_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_selfie_sessions" ON public.selfie_sessions;
CREATE POLICY "select_own_selfie_sessions" ON public.selfie_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "select_own_selfie_jobs" ON public.selfie_jobs;
CREATE POLICY "select_own_selfie_jobs" ON public.selfie_jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.selfie_sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.selfie_jobs FROM anon, authenticated;
GRANT SELECT ON public.selfie_sessions, public.selfie_jobs TO authenticated;

CREATE INDEX IF NOT EXISTS idx_selfie_sessions_user ON public.selfie_sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_selfie_jobs_session_cursor ON public.selfie_jobs(session_id, sequence);
CREATE INDEX IF NOT EXISTS idx_selfie_jobs_user_recent ON public.selfie_jobs(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.reserve_selfie_generation(
  p_user_id uuid,
  p_session_id uuid,
  p_idempotency_key text,
  p_category text,
  p_prompt text,
  p_model text DEFAULT 'gpt-image-1'
)
RETURNS TABLE(job_id uuid, generation_id uuid, sequence integer, credits_balance integer, replay boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session public.selfie_sessions%ROWTYPE;
  v_existing public.selfie_jobs%ROWTYPE;
  v_generation_id uuid;
  v_job_id uuid := gen_random_uuid();
  v_sequence integer;
  v_balance integer;
  v_cost integer := 2;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) < 16 OR length(p_idempotency_key) > 120 THEN
    RAISE EXCEPTION 'Invalid idempotency key';
  END IF;
  IF p_category NOT IN ('royal','traditional-indian','romantic','wedding','cinematic-hero','fashion','travel','festival','studio-portrait','casual-lifestyle') THEN
    RAISE EXCEPTION 'Unsupported selfie style';
  END IF;

  SELECT * INTO v_session FROM public.selfie_sessions
    WHERE id = p_session_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'active' THEN RAISE EXCEPTION 'Selfie session is not active'; END IF;

  -- Serialize every reservation for this user before checking the daily quota
  -- and idempotency key, including requests from different sessions.
  SELECT p.credits_balance INTO v_balance FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;

  SELECT * INTO v_existing FROM public.selfie_jobs
    WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.session_id <> p_session_id THEN RAISE EXCEPTION 'Idempotency key belongs to another session'; END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.generation_id, v_existing.sequence, v_balance, true;
    RETURN;
  END IF;

  IF v_session.image_count >= 20 THEN RAISE EXCEPTION 'Session image limit reached'; END IF;
  IF (SELECT count(*) FROM public.selfie_jobs j WHERE j.user_id = p_user_id AND j.created_at > now() - interval '24 hours') >= 20 THEN
    RAISE EXCEPTION 'Daily selfie request limit reached';
  END IF;
  IF v_balance < v_cost THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  UPDATE public.profiles SET credits_balance = credits_balance - v_cost WHERE id = p_user_id RETURNING credits_balance INTO v_balance;

  v_sequence := v_session.image_count + 1;
  UPDATE public.selfie_sessions SET image_count = v_sequence, updated_at = now() WHERE id = p_session_id;
  INSERT INTO public.generations(user_id,type,prompt,model,aspect_ratio,style_preset,num_images,status,metadata,credits_used)
  VALUES (p_user_id,'image',left(p_prompt,4000),COALESCE(p_model,'gpt-image-1'),
    '1:1',p_category,1,'processing',jsonb_build_object('selfie_session_id',p_session_id,'selfie_job_id',v_job_id,'selfie_sequence',v_sequence,'selfie_category',p_category),v_cost)
  RETURNING id INTO v_generation_id;
  INSERT INTO public.credits_ledger(user_id,amount,balance_after,reason,reference_type,reference_id)
  VALUES (p_user_id,-v_cost,v_balance,'selfie image generation','generation',v_generation_id);
  INSERT INTO public.selfie_jobs(id,user_id,session_id,generation_id,idempotency_key,sequence,category)
  VALUES (v_job_id,p_user_id,p_session_id,v_generation_id,p_idempotency_key,v_sequence,p_category);
  RETURN QUERY SELECT v_job_id,v_generation_id,v_sequence,v_balance,false;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_selfie_generation(uuid,uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_selfie_generation(uuid,uuid,text,text,text,text) TO service_role;
