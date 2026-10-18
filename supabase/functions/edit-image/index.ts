import { authenticatedUser, jsonResponse, serviceClient } from '../_shared/auth.ts';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info' };

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  let user;
  try {
    user = await authenticatedUser(req);
    if (!user) return jsonResponse({ error: 'Sign in to edit images.' }, 401, corsHeaders);
  } catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, corsHeaders); }

  try {
    const { imageUrl, tool, instruction, bgReplacement, outpaintDirection } = await req.json();
    // Only accept a bounded, user-uploaded data URL. Never fetch a caller-supplied URL from the server.
    const match = typeof imageUrl === 'string' && imageUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
    if (!match || match[2].length > 14_000_000) return jsonResponse({ error: 'Upload a PNG, JPEG, or WebP image smaller than 10 MB.' }, 400, corsHeaders);
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'Image editing is not configured yet.' }, 503, corsHeaders);

    let prompt = typeof instruction === 'string' ? instruction.slice(0, 1500) : '';
    if (tool === 'bg-remove') prompt = `Remove the background and replace it with ${bgReplacement === 'white' ? 'a plain white background' : bgReplacement === 'black' ? 'a plain black background' : 'a transparent background'}.`;
    if (tool === 'upscale') prompt = 'Enhance and upscale this image to higher resolution and quality.';
    if (tool === 'outpaint' && !prompt) prompt = `Expand the image ${outpaintDirection === 'horizontal' ? 'horizontally' : outpaintDirection === 'vertical' ? 'vertically' : 'in all directions'}, extending the scene naturally.`;
    if (!prompt) return jsonResponse({ error: 'Describe the edit you want.' }, 400, corsHeaders);

    const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
    const extension = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
    const formData = new FormData();
    formData.append('image', new Blob([bytes], { type: match[1] }), `upload.${extension}`);
    formData.append('prompt', prompt);
    formData.append('model', Deno.env.get('OPENAI_EDIT_MODEL') || 'dall-e-2');
    formData.append('n', '1');
    formData.append('size', '1024x1024');
    const response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: formData });
    if (!response.ok) return jsonResponse({ error: 'Image editing provider failed.' }, 502, corsHeaders);
    const data = await response.json();
    const resultUrl = data.data?.[0]?.url;
    if (!resultUrl) return jsonResponse({ error: 'No result image was returned.' }, 502, corsHeaders);
    const { data: record, error: recordError } = await serviceClient.rpc('create_generation_with_credits', {
      p_user_id: user.id, p_type: 'edit', p_prompt: prompt,
      p_model: Deno.env.get('OPENAI_EDIT_MODEL') || 'dall-e-2', p_aspect_ratio: '1:1',
      p_style_preset: null, p_num_images: 1, p_metadata: { tool },
    }).single();
    if (!recordError && record?.generation_id) {
      await serviceClient.rpc('finish_generation', {
        p_generation_id: record.generation_id, p_user_id: user.id,
        p_status: 'completed', p_result_urls: [resultUrl], p_error_message: null,
      });
    }
    return jsonResponse({ resultUrl }, 200, corsHeaders);
  } catch (error) {
    console.error('Image editing failed:', error);
    return jsonResponse({ error: 'Image editing failed.' }, 500, corsHeaders);
  }
});
