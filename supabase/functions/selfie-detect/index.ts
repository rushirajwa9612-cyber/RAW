import { authenticatedUser, jsonResponse } from '../_shared/auth.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info' };
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  try {
    if (!await authenticatedUser(req)) return jsonResponse({ error: 'Sign in to analyze this photo.' }, 401, cors);
  } catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, cors); }
  try {
    const { photo } = await req.json();
    if (typeof photo !== 'string' || photo.length > 5_600_000 || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) {
      return jsonResponse({ error: 'Choose a prepared image under 4 MB.' }, 400, cors);
    }
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return jsonResponse({ error: 'Automatic person count is unavailable. Please choose Single or Couple manually.' }, 503, cors);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25_000),
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4o-mini',
        response_format: { type: 'json_object' }, temperature: 0, max_tokens: 80,
        messages: [{ role: 'system', content: 'Count visible people in the supplied photo only. Do not identify them or infer sensitive attributes. Return JSON only: {"people_count":0|1|2|3,"confidence":0.0}. Use 3 for three or more, 0 if uncertain or none.' }, { role: 'user', content: [{ type: 'text', text: 'How many people are visible in this reference photo?' }, { type: 'image_url', image_url: { url: photo, detail: 'low' } }] }],
      }),
    });
    if (!response.ok) return jsonResponse({ error: 'Automatic detection failed. Please choose Single or Couple manually.' }, 502, cors);
    const data = await response.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const peopleCount = [0, 1, 2, 3].includes(Number(result.people_count)) ? Number(result.people_count) : 0;
    const confidence = Math.max(0, Math.min(1, Number(result.confidence) || 0));
    return jsonResponse({ peopleCount, confidence, needsConfirmation: confidence < 0.75 || peopleCount === 0 || peopleCount > 2 }, 200, cors);
  } catch (error) {
    console.error('Selfie photo analysis failed:', error);
    return jsonResponse({ error: 'Automatic detection failed. Please choose Single or Couple manually.' }, 500, cors);
  }
});
