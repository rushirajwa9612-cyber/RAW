import { authenticatedUser, jsonResponse, serviceClient } from '../_shared/auth.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info' };
const replicateBase = 'https://api.replicate.com/v1';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  let user;
  try { user = await authenticatedUser(req); }
  catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, corsHeaders); }
  if (!user) return jsonResponse({ error: 'Sign in to generate video.' }, 401, corsHeaders);

  const token = Deno.env.get('REPLICATE_API_TOKEN');
  if (!token) return jsonResponse({ error: 'Video generation is unavailable until Replicate is configured.' }, 503, corsHeaders);
  const model = Deno.env.get('REPLICATE_VIDEO_MODEL') || 'minimax/video-01';
  let generationId: string | null = null;
  try {
    const body = await req.json();
    if (body.generationId) {
      const { data: generation } = await serviceClient.from('generations').select('id,provider_job_id,status')
        .eq('id', body.generationId).eq('user_id', user.id).eq('type', 'video').maybeSingle();
      if (!generation) return jsonResponse({ error: 'Video request not found.' }, 404, corsHeaders);
      if (generation.status === 'completed' || generation.status === 'failed') return jsonResponse({ status: generation.status }, 200, corsHeaders);
      return jsonResponse({ generationId: generation.id, status: 'processing' }, 202, corsHeaders);
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 2000) return jsonResponse({ error: 'Enter a prompt (maximum 2000 characters).' }, 400, corsHeaders);
    const image = body.sourceImage;
    if (image && (typeof image !== 'string' || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image) || image.length > 1_400_000)) {
      return jsonResponse({ error: 'Source image must be a PNG, JPEG, or WebP smaller than 1 MB.' }, 400, corsHeaders);
    }
    const { data: created, error: createError } = await serviceClient.rpc('create_generation_with_credits', {
      p_user_id: user.id, p_type: 'video', p_prompt: prompt, p_model: model,
      p_aspect_ratio: '16:9', p_resolution: null, p_style_preset: null,
      p_num_images: 1, p_metadata: { provider: 'replicate', duration_seconds: 6, mode: image ? 'image-to-video' : 'text-to-video' },
    }).single();
    if (createError || !created) {
      const insufficient = createError?.message.toLowerCase().includes('insufficient credits');
      return jsonResponse({ error: insufficient ? 'Not enough credits.' : 'Could not create the video request.' }, insufficient ? 402 : 400, corsHeaders);
    }
    generationId = created.generation_id as string;
    const providerResponse = await fetch(`${replicateBase}/models/${model}/predictions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=60' },
      body: JSON.stringify({ input: { prompt, ...(image ? { first_frame_image: image } : {}) } }),
    });
    if (!providerResponse.ok) throw new Error('Replicate could not accept this video request.');
    const prediction = await providerResponse.json();
    await serviceClient.from('generations').update({ provider_job_id: prediction.id, model, status: 'processing' }).eq('id', generationId).eq('user_id', user.id);
    const videoUrl = extractVideoUrl(prediction.output);
    if (prediction.status === 'succeeded' && videoUrl) {
      const { data: balance } = await serviceClient.rpc('finish_generation', {
      p_generation_id: generationId, p_user_id: user.id, p_status: 'completed', p_result_urls: [videoUrl], p_error_message: null,
      });
      return jsonResponse({ generationId, status: 'completed', videoUrl, creditsBalance: balance }, 200, corsHeaders);
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      await serviceClient.rpc('finish_generation', { p_generation_id: generationId, p_user_id: user.id, p_status: 'failed', p_result_urls: [], p_error_message: 'Replicate video generation failed.' });
      return jsonResponse({ error: 'Video generation failed at the provider. Credits were refunded.' }, 502, corsHeaders);
    }
    return jsonResponse({ generationId, status: 'processing' }, 202, corsHeaders);
  } catch (error) {
    if (generationId) await serviceClient.rpc('finish_generation', {
      p_generation_id: generationId, p_user_id: user.id, p_status: 'failed', p_result_urls: [],
      p_error_message: error instanceof Error ? error.message : 'Video generation failed.',
    });
    console.error('Video generation failed:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Video generation failed.' }, 502, corsHeaders);
  }
});

function extractVideoUrl(output: unknown): string | null {
  const candidate = Array.isArray(output) ? output[0] : output;
  return typeof candidate === 'string' && candidate.startsWith('https://') ? candidate : null;
}
