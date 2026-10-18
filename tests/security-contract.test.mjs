import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('billing columns and client-written ledger/generation rows are revoked', async () => {
  const sql = await read('../supabase/migrations/20261018120000_secure_billing_and_generations.sql');
  assert.match(sql, /REVOKE INSERT, UPDATE ON public\.profiles FROM anon, authenticated/i);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE ON public\.credits_ledger FROM anon, authenticated/i);
  assert.match(sql, /REVOKE INSERT, UPDATE ON public\.generations FROM anon, authenticated/i);
});

test('generation debit, record and ledger entry are in one locked SQL transaction function', async () => {
  const sql = await read('../supabase/migrations/20261018120000_secure_billing_and_generations.sql');
  const fn = sql.split('CREATE OR REPLACE FUNCTION public.create_generation_with_credits')[1]?.split('$$;')[0] ?? '';
  assert.match(fn, /FOR UPDATE/i);
  assert.match(fn, /UPDATE public\.profiles SET credits_balance/i);
  assert.match(fn, /INSERT INTO public\.generations/i);
  assert.match(fn, /INSERT INTO public\.credits_ledger/i);
  assert.match(fn, /Insufficient credits/i);
});

test('all callable functions verify a real user using the supplied access token', async () => {
  for (const path of [
    '../supabase/functions/ai-chat/index.ts',
    '../supabase/functions/generate-image/index.ts',
    '../supabase/functions/edit-image/index.ts',
    '../supabase/functions/generate-video/index.ts',
    '../supabase/functions/video-status/index.ts',
  ]) {
    assert.match(await read(path), /authenticatedUser\(req\)/, `${path} must authenticate the request`);
  }
  for (const path of [
    '../supabase/functions/selfie-detect/index.ts',
    '../supabase/functions/selfie-generate/index.ts',
    '../supabase/functions/selfie-sessions/index.ts',
  ]) assert.match(await read(path), /authenticatedUser\(req\)/, `${path} must authenticate the request`);
  assert.match(await read('../src/lib/edgeFunctions.ts'), /session\.access_token/);
});

test('selfie generation uses private storage and reserves debit/job/ledger atomically', async () => {
  const sql = await read('../supabase/migrations/20261018140000_selfie_studio.sql');
  assert.match(sql, /VALUES \('selfie-private', 'selfie-private', false/i);
  const reservation = sql.split('CREATE OR REPLACE FUNCTION public.reserve_selfie_generation')[1]?.split('$$;')[0] ?? '';
  assert.match(reservation, /FOR UPDATE/i);
  assert.match(reservation, /credits_balance = credits_balance - v_cost/i);
  assert.match(reservation, /INSERT INTO public\.credits_ledger/i);
  assert.match(reservation, /INSERT INTO public\.selfie_jobs/i);
  assert.ok(reservation.indexOf('FOR UPDATE') < reservation.indexOf('Daily selfie request limit reached'));
  assert.match(sql, /UNIQUE\(user_id, idempotency_key\)/i);
  assert.match(reservation, /20 image slots|image_count >= 20/i);
});

test('Selfie Studio sends authenticated calls and chat discloses unsupported attachment tools', async () => {
  const ui = await read('../src/pages/SelfieStudio.tsx');
  assert.match(ui, /selfie-detect/);
  assert.match(ui, /selfie-sessions/);
  assert.match(ui, /selfie-generate/);
  assert.match(ui, /IntersectionObserver/);
  assert.match(ui, /Stop generation/);
  const composer = await read('../src/components/ChatComposer.tsx');
  assert.match(composer, /gpt-4o-mini/);
  assert.match(composer, /Documents \(PDF\/DOCX\)/);
  assert.match(composer, /disabled=\{unavailable\.has\(item\)\}/);
});

test('image editor never fetches a caller-supplied image URL', async () => {
  const fn = await read('../supabase/functions/edit-image/index.ts');
  assert.match(fn, /imageUrl\.match\(\/\^data:/);
  assert.doesNotMatch(fn, /fetch\(imageUrl\)/);
  assert.match(fn, /14_000_000/);
});

test('video UI remains disabled unless provider configuration explicitly enables it', async () => {
  const ui = await read('../src/pages/VideoGenerator.tsx');
  assert.match(ui, /VITE_VIDEO_GENERATION_ENABLED === 'true'/);
  assert.match(ui, /disabled=\{!videoEnabled \|\| !prompt\.trim\(\)\}/);
});
