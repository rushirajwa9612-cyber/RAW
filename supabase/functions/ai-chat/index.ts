import { authenticatedUser, jsonResponse } from '../_shared/auth.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey' };
const imagePattern = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405, cors);
  let user;
  try { user = await authenticatedUser(req); } catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, cors); }
  if (!user) return jsonResponse({ error: 'Sign in again to continue.' }, 401, cors);
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message || message.length > 12000) return jsonResponse({ error: 'Message is required and must be under 12,000 characters.' }, 400, cors);
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (attachments.length > 5) return jsonResponse({ error: 'Up to five attachments are supported.' }, 400, cors);
    const content: Array<Record<string, unknown>> = [{ type: 'text', text: message }];
    for (const item of attachments) {
      if (!item || typeof item.name !== 'string' || typeof item.data !== 'string') return jsonResponse({ error: 'Invalid attachment.' }, 400, cors);
      if (item.type === 'image') {
        if (item.data.length > 5_600_000 || !imagePattern.test(item.data)) return jsonResponse({ error: `${item.name} is invalid or too large.`, }, 400, cors);
        content.push({ type: 'image_url', image_url: { url: item.data, detail: 'low' } });
      } else if (item.type === 'text') {
        if (item.data.length > 50_000) return jsonResponse({ error: `${item.name} exceeds the 50 KB text limit.` }, 400, cors);
        content.push({ type: 'text', text: `Attached file ${item.name}:\n${item.data}` });
      } else return jsonResponse({ error: 'Only images, TXT, and CSV attachments are supported.' }, 415, cors);
    }
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return jsonResponse({ error: 'AI chat is not configured. Set OPENAI_API_KEY in Supabase Edge Function secrets.' }, 503, cors);
    const requestedModel = typeof body.model === 'string' ? body.model : 'gpt-4o-mini';
    const model = ['gpt-4o-mini','gpt-4o'].includes(requestedModel) ? requestedModel : '';
    if (!model) return jsonResponse({ error: 'Unsupported chat model.' }, 400, cors);
    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const messages = [
      { role: 'system', content: 'You are ORVEXA AI, a helpful creative assistant. Be concise, clear, and honest about unavailable tools. You cannot browse the web or conduct background research in this chat.' },
      ...history.filter((h: {role?:string;content?:unknown}) => (h.role === 'user' || h.role === 'assistant') && typeof h.content === 'string' && h.content.length <= 12000).map((h: {role:string;content:string}) => ({role:h.role,content:h.content})),
      { role: 'user', content },
    ];
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages, max_tokens: 1000, temperature: 0.7 }), signal: AbortSignal.timeout(60_000) });
    if (!response.ok) {
      console.error('AI provider error status:', response.status);
      return jsonResponse({ error: response.status === 429 ? 'AI provider rate limit reached. Try again shortly.' : 'AI provider could not complete this request.' }, response.status === 429 ? 429 : 502, cors);
    }
    const result = await response.json();
    const reply = result.choices?.[0]?.message?.content;
    if (typeof reply !== 'string' || !reply.trim()) return jsonResponse({ error: 'AI provider returned an empty response.' }, 502, cors);
    return jsonResponse({ response: reply }, 200, cors);
  } catch (error) {
    console.error('AI chat failed:', error instanceof Error ? error.message : 'unknown error');
    return jsonResponse({ error: 'Could not process the chat request. Please try again.' }, 500, cors);
  }
});
