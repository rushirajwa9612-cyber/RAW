import { authenticatedUser, jsonResponse, serviceClient } from '../_shared/auth.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info' };
const bucket = 'selfie-private';
const styles: Record<string, string> = {
  royal: 'royal historical Indian portrait, ornate period clothing, elegant palace setting, tasteful cinematic light',
  'traditional-indian': 'traditional Indian attire and handcrafted textiles, culturally respectful styling, warm natural light',
  romantic: 'romantic editorial portrait, soft sunset light, gentle atmosphere, refined color palette',
  wedding: 'elegant wedding portrait, refined ceremonial clothing, tasteful floral details, soft portrait lighting',
  'cinematic-hero': 'cinematic hero portrait, dramatic but natural lighting, confident pose, film still composition',
  fashion: 'high fashion luxury editorial portrait, premium styling, elegant studio light, magazine composition',
  travel: 'travel editorial portrait in a beautiful scenic destination, natural candid pose, warm daylight',
  festival: 'joyful Indian festival portrait, colorful but tasteful traditional details, festive lights',
  'studio-portrait': 'professional studio portrait, clean backdrop, softbox lighting, polished but natural finish',
  'casual-lifestyle': 'casual lifestyle portrait, candid relaxed pose, natural daylight, contemporary setting',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  let user;
  try { user = await authenticatedUser(req); }
  catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, cors); }
  if (!user) return jsonResponse({ error: 'Sign in to generate selfie images.' }, 401, cors);

  const model = Deno.env.get('OPENAI_SELFIE_MODEL') || 'gpt-image-1';
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) return jsonResponse({ error: 'Image generation is not configured.' }, 503, cors);
  let generationId: string | null = null;
  let outputPath: string | null = null;
  const startedAt = Date.now();
  try {
    const body = await req.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : '';
    const category = typeof body.category === 'string' && styles[body.category] ? body.category : '';
    if (!sessionId || !category || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return jsonResponse({ error: 'Invalid selfie generation request.' }, 400, cors);
    const { data: session } = await serviceClient.from('selfie_sessions').select('id,user_id,reference_path,people_mode,status')
      .eq('id', sessionId).eq('user_id', user.id).maybeSingle();
    if (!session) return jsonResponse({ error: 'Selfie session not found.' }, 404, cors);
    if (session.status !== 'active') return jsonResponse({ error: 'This session is stopped. Start a new session to generate more.' }, 409, cors);

    const prompt = session.people_mode === 'couple'
      ? `Edit the supplied reference photo into ${styles[category]}. Keep both people in the image as two distinct individuals. Preserve each person's recognizable facial appearance, skin tone, hair and relative position as much as the image model allows. Do not swap identities, merge the people, add another person, or remove either person. Preserve a natural, respectful, photorealistic result. This is an approximation and must not change who is present.`
      : `Edit the supplied reference photo into ${styles[category]}. Keep the same person and preserve their recognizable facial appearance, skin tone, hair and age as much as the image model allows. Do not replace the subject or add other people. Preserve a natural, respectful, photorealistic result. This is an approximation and is not a guarantee of exact identity.`;
    const { data: reserved, error: reserveError } = await serviceClient.rpc('reserve_selfie_generation', {
      p_user_id: user.id, p_session_id: session.id, p_idempotency_key: idempotencyKey,
      p_category: category, p_prompt: prompt, p_model: model,
    }).single();
    if (reserveError || !reserved) {
      const message = reserveError?.message.toLowerCase() ?? '';
      const status = message.includes('credit') ? 402 : message.includes('limit') ? 429 : 400;
      return jsonResponse({ error: message.includes('credit') ? 'Not enough credits for another image.' : message.includes('limit') ? 'Your selfie usage limit was reached. Try again later or start a new session.' : 'Could not reserve this image request.' }, status, cors);
    }
    generationId = reserved.generation_id;
    if (reserved.replay) {
      const { data: prior } = await serviceClient.from('generations').select('status,metadata,error_message').eq('id', generationId).eq('user_id', user.id).maybeSingle();
      const oldPath = prior?.metadata?.selfie_output_path;
      if (prior?.status === 'completed' && typeof oldPath === 'string') {
        const { data: signed } = await serviceClient.storage.from(bucket).createSignedUrl(oldPath, 1800);
        return jsonResponse({ jobId: reserved.job_id, generationId, sequence: reserved.sequence, status: 'completed', imageUrl: signed?.signedUrl ?? null, creditsBalance: reserved.credits_balance }, 200, cors);
      }
      if (prior?.status === 'processing') return jsonResponse({ jobId: reserved.job_id, generationId, sequence: reserved.sequence, status: 'processing' }, 202, cors);
      return jsonResponse({ error: prior?.error_message || 'This request failed. Use Retry to start a new request.' }, 409, cors);
    }

    const { data: reference, error: downloadError } = await serviceClient.storage.from(bucket).download(session.reference_path);
    if (downloadError || !reference) throw new Error('Could not read the private reference photo.');
    const mime = reference.type || 'image/png';
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(mime)) throw new Error('Unsupported reference image type.');
    const formData = new FormData();
    formData.append('image[]', reference, session.reference_path.split('/').at(-1) || 'reference.png');
    formData.append('prompt', prompt);
    formData.append('model', model);
    formData.append('size', '1024x1024');
    formData.append('n', '1');
    if (model.startsWith('gpt-image')) {
      formData.append('quality', 'low');
      formData.append('output_format', 'jpeg');
    } else {
      formData.append('response_format', 'b64_json');
    }
    const providerResponse = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: formData, signal: AbortSignal.timeout(110_000),
    });
    if (!providerResponse.ok) {
      console.error('Selfie image provider returned', providerResponse.status);
      throw new Error('The image provider could not create this result. Credits will be refunded.');
    }
    const providerData = await providerResponse.json();
    const encoded = providerData.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || encoded.length > 28_000_000) throw new Error('The provider did not return a usable image. Credits will be refunded.');
    const imageBytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
    if (imageBytes.byteLength > 20 * 1024 * 1024) throw new Error('The generated image was too large to store.');
    outputPath = `${user.id}/${session.id}/${generationId}.jpg`;
    const { error: uploadError } = await serviceClient.storage.from(bucket).upload(outputPath, new Blob([imageBytes], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: false });
    if (uploadError) throw new Error('Could not save the generated image privately. Credits will be refunded.');
    const { error: metadataError } = await serviceClient.from('generations').update({ metadata: { selfie_session_id: session.id, selfie_job_id: reserved.job_id, selfie_sequence: reserved.sequence, selfie_category: category, selfie_output_path: outputPath } }).eq('id', generationId).eq('user_id', user.id);
    if (metadataError) throw new Error('Could not save the result metadata. Credits will be refunded.');
    const { error: finishError } = await serviceClient.rpc('finish_generation', { p_generation_id: generationId, p_user_id: user.id, p_status: 'completed', p_result_urls: [], p_error_message: null });
    if (finishError) throw new Error('Could not complete the generation record.');
    const { data: signed } = await serviceClient.storage.from(bucket).createSignedUrl(outputPath, 1800);
    console.log(JSON.stringify({ event: 'selfie_generation_complete', latency_ms: Date.now() - startedAt, provider: 'openai', model }));
    return jsonResponse({ jobId: reserved.job_id, generationId, sequence: reserved.sequence, category, status: 'completed', imageUrl: signed?.signedUrl ?? null, creditsBalance: reserved.credits_balance }, 200, cors);
  } catch (error) {
    if (outputPath) await serviceClient.storage.from(bucket).remove([outputPath]);
    if (generationId) await serviceClient.rpc('finish_generation', { p_generation_id: generationId, p_user_id: user.id, p_status: 'failed', p_result_urls: [], p_error_message: error instanceof Error ? error.message : 'Selfie image generation failed.' });
    console.error('Selfie generation failed:', JSON.stringify({ latency_ms: Date.now() - startedAt, error: error instanceof Error ? error.message : 'unknown' }));
    return jsonResponse({ error: error instanceof Error ? error.message : 'Selfie image generation failed.' }, 502, cors);
  }
});
