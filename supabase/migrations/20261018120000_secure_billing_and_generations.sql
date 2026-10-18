-- Prevent authenticated clients from changing billing state directly.
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (display_name, avatar_url, bio) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "insert_own_ledger" ON public.credits_ledger;
REVOKE INSERT, UPDATE, DELETE ON public.credits_ledger FROM anon, authenticated;

-- Generation records and their billing state are created/settled only by trusted server functions.
DROP POLICY IF EXISTS "insert_own_generations" ON public.generations;
DROP POLICY IF EXISTS "update_own_generations" ON public.generations;
CREATE POLICY "update_own_generation_favorites" ON public.generations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
REVOKE INSERT, UPDATE ON public.generations FROM anon, authenticated;
GRANT UPDATE (is_favorite) ON public.generations TO authenticated;

CREATE OR REPLACE FUNCTION public.create_generation_with_credits(
  p_user_id uuid,
  p_type text,
  p_prompt text,
  p_model text DEFAULT NULL,
  p_aspect_ratio text DEFAULT '1:1',
  p_resolution text DEFAULT NULL,
  p_style_preset text DEFAULT NULL,
  p_num_images integer DEFAULT 1,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(generation_id uuid, credits_balance integer, credits_used integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_balance integer;
  v_cost integer;
  v_id uuid;
BEGIN
  IF p_type NOT IN ('image', 'video', 'edit') THEN RAISE EXCEPTION 'Unsupported generation type'; END IF;
  IF p_type = 'image' AND (p_num_images < 1 OR p_num_images > 4) THEN RAISE EXCEPTION 'Invalid image count'; END IF;
  v_cost := CASE p_type WHEN 'image' THEN 2 * p_num_images WHEN 'video' THEN 10 ELSE 0 END;

  SELECT p.credits_balance INTO v_balance FROM public.profiles p WHERE p.id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_balance < v_cost THEN RAISE EXCEPTION 'Insufficient credits'; END IF;
  UPDATE public.profiles SET credits_balance = v_balance - v_cost WHERE id = p_user_id;

  INSERT INTO public.generations(user_id, type, prompt, model, aspect_ratio, resolution, style_preset,
    num_images, status, metadata, credits_used)
  VALUES (p_user_id, p_type, p_prompt, p_model, p_aspect_ratio, p_resolution, p_style_preset,
    p_num_images, 'processing', COALESCE(p_metadata, '{}'::jsonb), v_cost)
  RETURNING id INTO v_id;

  IF v_cost > 0 THEN
    INSERT INTO public.credits_ledger(user_id, amount, balance_after, reason, reference_type, reference_id)
    VALUES (p_user_id, -v_cost, v_balance - v_cost, p_type || ' generation', 'generation', v_id);
  END IF;
  RETURN QUERY SELECT v_id, v_balance - v_cost, v_cost;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_generation(
  p_generation_id uuid,
  p_user_id uuid,
  p_status text,
  p_result_urls text[] DEFAULT '{}',
  p_error_message text DEFAULT NULL
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_gen public.generations%ROWTYPE;
  v_balance integer;
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN RAISE EXCEPTION 'Invalid final status'; END IF;
  SELECT * INTO v_gen FROM public.generations WHERE id = p_generation_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Generation not found'; END IF;
  IF v_gen.status IN ('completed', 'failed') THEN
    SELECT credits_balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
    RETURN v_balance;
  END IF;

  IF p_status = 'failed' AND v_gen.credits_used > 0 THEN
    UPDATE public.profiles SET credits_balance = credits_balance + v_gen.credits_used
      WHERE id = p_user_id RETURNING credits_balance INTO v_balance;
    INSERT INTO public.credits_ledger(user_id, amount, balance_after, reason, reference_type, reference_id)
      VALUES (p_user_id, v_gen.credits_used, v_balance, 'generation refund', 'generation', v_gen.id);
  ELSE
    SELECT credits_balance INTO v_balance FROM public.profiles WHERE id = p_user_id;
  END IF;

  UPDATE public.generations SET status = p_status,
    result_url = CASE WHEN p_status = 'completed' THEN p_result_urls[1] ELSE NULL END,
    result_urls = CASE WHEN p_status = 'completed' THEN p_result_urls ELSE '{}'::text[] END,
    thumbnail_url = CASE WHEN p_status = 'completed' THEN p_result_urls[1] ELSE NULL END,
    error_message = CASE WHEN p_status = 'failed' THEN left(p_error_message, 500) ELSE NULL END,
    completed_at = now()
    WHERE id = p_generation_id;
  RETURN v_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.create_generation_with_credits(uuid,text,text,text,text,text,text,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_generation_with_credits(uuid,text,text,text,text,text,text,integer,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.finish_generation(uuid,uuid,text,text[],text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_generation(uuid,uuid,text,text[],text) TO service_role;
