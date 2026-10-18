import { authenticatedUser, jsonResponse, serviceClient } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  let user;
  try { user = await authenticatedUser(req); }
  catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, corsHeaders); }
  if (!user) return jsonResponse({ error: 'Sign in to generate images.' }, 401, corsHeaders);

  let generationId: string | null = null;
  try {
    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const numImages = Number(body.numImages ?? 1);
    const aspectRatio = ['1:1','16:9','9:16','4:3','3:2','21:9'].includes(body.aspectRatio) ? body.aspectRatio : '1:1';
    const stylePreset = typeof body.stylePreset === 'string' ? body.stylePreset.slice(0, 80) : null;
    if (!prompt || prompt.length > 4000 || !Number.isInteger(numImages) || numImages < 1 || numImages > 4) {
      return jsonResponse({ error: 'Enter a prompt (maximum 4000 characters) and choose 1–4 images.' }, 400, corsHeaders);
    }
    const { data: created, error: createError } = await serviceClient.rpc('create_generation_with_credits', {
      p_user_id: user.id, p_type: 'image', p_prompt: prompt,
      p_model: Deno.env.get('OPENAI_IMAGE_MODEL') || 'dall-e-3',
      p_aspect_ratio: aspectRatio, p_style_preset: stylePreset,
      p_num_images: numImages, p_metadata: {},
    }).single();
    if (createError || !created) {
      const insufficient = createError?.message.toLowerCase().includes('insufficient credits');
      return jsonResponse({ error: insufficient ? 'Not enough credits.' : 'Could not create the generation request.' }, insufficient ? 402 : 400, corsHeaders);
    }
    generationId = created.generation_id;

    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) throw new Error('Image provider is not configured.');
    const sizeMap: Record<string, string> = { '1:1': '1024x1024', '16:9': '1792x1024', '9:16': '1024x1792', '4:3': '1792x1024', '3:2': '1792x1024', '21:9': '1792x1024' };
    const stylePrompt = stylePreset ? `, ${stylePreset} style` : '';
    const images: string[] = [];
    for (let index = 0; index < numImages; index += 1) {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: Deno.env.get('OPENAI_IMAGE_MODEL') || 'dall-e-3', prompt: `${prompt}${stylePrompt}, high quality, detailed`, n: 1, size: sizeMap[aspectRatio], quality: 'standard' }),
      });
      if (!response.ok) throw new Error('Image provider request failed.');
      const providerData = await response.json();
      const image = (providerData.data || []).map((item: { url?: string; b64_json?: string }) => item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null)).find(Boolean);
      if (image) images.push(image);
    }
    if (!images.length) throw new Error('Image provider returned no images.');
    const { data: balance } = await serviceClient.rpc('finish_generation', {
      p_generation_id: generationId, p_user_id: user.id, p_status: 'completed', p_result_urls: images, p_error_message: null,
    });
    return jsonResponse({ generationId, images, creditsBalance: balance }, 200, corsHeaders);
  } catch (error) {
    if (generationId) await serviceClient.rpc('finish_generation', {
      p_generation_id: generationId, p_user_id: user.id, p_status: 'failed', p_result_urls: [],
      p_error_message: error instanceof Error ? error.message : 'Image generation failed.',
    });
    console.error('Image generation failed:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Image generation failed.' }, 502, corsHeaders);
  }
});
