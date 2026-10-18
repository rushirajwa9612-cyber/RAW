import { authenticatedUser, jsonResponse, serviceClient } from '../_shared/auth.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info' };
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  let user;
  try { user = await authenticatedUser(req); }
  catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, corsHeaders); }
  if (!user) return jsonResponse({ error: 'Sign in to check video status.' }, 401, corsHeaders);
  try {
    const { generationId } = await req.json();
    const { data: generation } = await serviceClient.from('generations').select('id,status,provider_job_id,result_url')
      .eq('id', generationId).eq('user_id', user.id).eq('type', 'video').maybeSingle();
    if (!generation) return jsonResponse({ error: 'Video request not found.' }, 404, corsHeaders);
    if (generation.status === 'completed' || generation.status === 'failed') return jsonResponse({ status: generation.status, videoUrl: generation.result_url }, 200, corsHeaders);
    if (!generation.provider_job_id) return jsonResponse({ status: 'processing' }, 202, corsHeaders);
    const token = Deno.env.get('REPLICATE_API_TOKEN');
    if (!token) return jsonResponse({ error: 'Replicate is not configured.' }, 503, corsHeaders);
    const statusResponse = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(generation.provider_job_id)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!statusResponse.ok) return jsonResponse({ error: 'Could not check provider status.' }, 502, corsHeaders);
    const prediction = await statusResponse.json();
    if (prediction.status === 'succeeded') {
      const candidate = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (typeof candidate !== 'string' || !candidate.startsWith('https://')) throw new Error('Provider returned an invalid video URL.');
      const { data: creditsBalance } = await serviceClient.rpc('finish_generation', { p_generation_id: generation.id, p_user_id: user.id, p_status: 'completed', p_result_urls: [candidate], p_error_message: null });
      return jsonResponse({ status: 'completed', videoUrl: candidate, creditsBalance }, 200, corsHeaders);
    }
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      const { data: creditsBalance } = await serviceClient.rpc('finish_generation', { p_generation_id: generation.id, p_user_id: user.id, p_status: 'failed', p_result_urls: [], p_error_message: 'Replicate video generation failed.' });
      return jsonResponse({ status: 'failed', error: 'Video generation failed. Credits were refunded.', creditsBalance }, 200, corsHeaders);
    }
    return jsonResponse({ status: 'processing' }, 202, corsHeaders);
  } catch (error) {
    console.error('Video status check failed:', error);
    return jsonResponse({ error: 'Could not check video status.' }, 500, corsHeaders);
  }
});
