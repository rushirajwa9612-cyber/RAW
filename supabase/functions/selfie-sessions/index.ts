import { authenticatedUser, jsonResponse, serviceClient } from '../_shared/auth.ts';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, Apikey, X-Client-Info' };
const bucket = 'selfie-private';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, cors);
  let user;
  try { user = await authenticatedUser(req); }
  catch { return jsonResponse({ error: 'Authentication service unavailable.' }, 503, cors); }
  if (!user) return jsonResponse({ error: 'Sign in to use Selfie Studio.' }, 401, cors);

  try {
    const body = await req.json();
    if (body.action === 'create') {
      const match = typeof body.photo === 'string' && body.photo.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/);
      if (!match || match[2].length > 5_600_000) return jsonResponse({ error: 'Choose a prepared PNG, JPEG, or WebP reference image under 4 MB.' }, 400, cors);
      if (body.mode !== 'single' && body.mode !== 'couple') return jsonResponse({ error: 'Choose Single or Couple mode.' }, 400, cors);
      const bytes = Uint8Array.from(atob(match[2]), (char) => char.charCodeAt(0));
      if (bytes.byteLength > 4 * 1024 * 1024) return jsonResponse({ error: 'Reference image must be under 4 MB.' }, 400, cors);
      const sessionId = crypto.randomUUID();
      const ext = match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1];
      const referencePath = `${user.id}/${sessionId}/reference.${ext}`;
      const upload = await serviceClient.storage.from(bucket).upload(referencePath, new Blob([bytes], { type: match[1] }), { contentType: match[1], upsert: false });
      if (upload.error) throw new Error('Private photo storage is not ready. Deploy the Selfie Studio migration first.');
      const { data: session, error } = await serviceClient.from('selfie_sessions').insert({ id: sessionId, user_id: user.id, reference_path: referencePath, people_mode: body.mode, status: 'active' }).select('id,user_id,people_mode,status,image_count,created_at').single();
      if (error || !session) {
        await serviceClient.storage.from(bucket).remove([referencePath]);
        throw new Error('Could not create a private selfie session.');
      }
      const { data: signed } = await serviceClient.storage.from(bucket).createSignedUrl(referencePath, 1800);
      return jsonResponse({ session, referenceUrl: signed?.signedUrl ?? null }, 201, cors);
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) return jsonResponse({ error: 'Session ID is required.' }, 400, cors);
    const { data: session } = await serviceClient.from('selfie_sessions').select('*').eq('id', sessionId).eq('user_id', user.id).maybeSingle();
    if (!session) return jsonResponse({ error: 'Selfie session not found.' }, 404, cors);

    if (body.action === 'stop') {
      const { error } = await serviceClient.from('selfie_sessions').update({ status: 'stopped', updated_at: new Date().toISOString() }).eq('id', sessionId).eq('user_id', user.id).eq('status', 'active');
      if (error) throw error;
      return jsonResponse({ status: 'stopped' }, 200, cors);
    }
    if (body.action === 'delete-item' || body.action === 'favorite-item') {
      const generationId = typeof body.generationId === 'string' ? body.generationId : '';
      const { data: job } = await serviceClient.from('selfie_jobs').select('id,generation_id').eq('session_id', sessionId).eq('generation_id', generationId).eq('user_id', user.id).maybeSingle();
      if (!job) return jsonResponse({ error: 'Image not found in this session.' }, 404, cors);
      const { data: generation } = await serviceClient.from('generations').select('id,metadata,is_favorite').eq('id', generationId).eq('user_id', user.id).maybeSingle();
      if (!generation) return jsonResponse({ error: 'Image not found.' }, 404, cors);
      if (body.action === 'favorite-item') {
        const favorite = body.favorite === true;
        const { error } = await serviceClient.from('generations').update({ is_favorite: favorite }).eq('id', generationId).eq('user_id', user.id);
        if (error) throw error;
        return jsonResponse({ favorite }, 200, cors);
      }
      const outputPath = generation.metadata?.selfie_output_path;
      if (typeof outputPath === 'string') await serviceClient.storage.from(bucket).remove([outputPath]);
      const { error } = await serviceClient.from('generations').delete().eq('id', generationId).eq('user_id', user.id);
      if (error) throw error;
      return jsonResponse({ deleted: true }, 200, cors);
    }
    if (body.action === 'delete') {
      const { data: jobs } = await serviceClient.from('selfie_jobs').select('generation_id').eq('session_id', sessionId).eq('user_id', user.id);
      const ids = (jobs ?? []).map((job) => job.generation_id);
      const { data: generations } = ids.length ? await serviceClient.from('generations').select('id,metadata').in('id', ids).eq('user_id', user.id) : { data: [] };
      const paths = [session.reference_path, ...(generations ?? []).map((row) => row.metadata?.selfie_output_path).filter((path): path is string => typeof path === 'string')];
      if (paths.length) await serviceClient.storage.from(bucket).remove(paths);
      if (ids.length) await serviceClient.from('generations').delete().in('id', ids).eq('user_id', user.id);
      const { error } = await serviceClient.from('selfie_sessions').delete().eq('id', sessionId).eq('user_id', user.id);
      if (error) throw error;
      return jsonResponse({ deleted: true }, 200, cors);
    }
    if (body.action === 'feed') {
      const cursor = Number(body.cursor ?? 0);
      const limit = Math.max(1, Math.min(20, Number(body.limit ?? 12)));
      if (!Number.isInteger(cursor) || cursor < 0) return jsonResponse({ error: 'Invalid feed cursor.' }, 400, cors);
      const { data: jobs, error } = await serviceClient.from('selfie_jobs').select('id,generation_id,sequence,category,created_at')
        .eq('session_id', sessionId).eq('user_id', user.id).gt('sequence', cursor).order('sequence', { ascending: true }).limit(limit + 1);
      if (error) throw error;
      const page = (jobs ?? []).slice(0, limit);
      const generationIds = page.map((job) => job.generation_id);
      const { data: generations } = generationIds.length ? await serviceClient.from('generations').select('id,status,metadata,credits_used,error_message,is_favorite').in('id', generationIds).eq('user_id', user.id) : { data: [] };
      const byId = new Map((generations ?? []).map((row) => [row.id, row]));
      const items = await Promise.all(page.map(async (job) => {
        const generation = byId.get(job.generation_id);
        const path = generation?.metadata?.selfie_output_path;
        const signed = typeof path === 'string' ? await serviceClient.storage.from(bucket).createSignedUrl(path, 1800) : { data: null };
        return { id: job.id, generationId: job.generation_id, sequence: job.sequence, category: job.category, status: generation?.status ?? 'failed', imageUrl: signed.data?.signedUrl ?? null, error: generation?.error_message ?? null, creditsUsed: generation?.credits_used ?? 0, favorite: generation?.is_favorite ?? false };
      }));
      const ref = await serviceClient.storage.from(bucket).createSignedUrl(session.reference_path, 1800);
      return jsonResponse({ session: { id: session.id, mode: session.people_mode, status: session.status, imageCount: session.image_count }, referenceUrl: ref.data?.signedUrl ?? null, items, nextCursor: page.at(-1)?.sequence ?? cursor, hasMore: (jobs?.length ?? 0) > limit }, 200, cors);
    }
    return jsonResponse({ error: 'Unsupported session action.' }, 400, cors);
  } catch (error) {
    console.error('Selfie session request failed:', error);
    return jsonResponse({ error: error instanceof Error ? error.message : 'Selfie session request failed.' }, 500, cors);
  }
});
