# Production deploy checklist

## Before deploy

- [ ] Review the pending database migration `20261018120000_secure_billing_and_generations.sql` against the target Supabase schema.
- [ ] Review and apply `20261018140000_selfie_studio.sql` in staging; verify the private `selfie-private` bucket, owner RLS, and service-role-only reservation function.
- [ ] Back up the production database and apply migrations in a staging project first.
- [ ] Verify authenticated clients cannot update `profiles.plan` or `profiles.credits_balance`, insert ledger rows, or insert/update generation billing fields; confirm profile display fields and generation favorites still work.
- [ ] Configure Supabase Edge Function secrets (`OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, and Supabase-provided variables). Do not expose secrets through Vite env variables or source control.
- [ ] For Selfie Studio, set `OPENAI_API_KEY`; optionally set `OPENAI_VISION_MODEL=gpt-4o-mini` and `OPENAI_SELFIE_MODEL=gpt-image-1`. Confirm the OpenAI account can call the selected vision and image-edit models, limits, and billing.
- [ ] Deploy `ai-chat`, `generate-image`, `edit-image`, `generate-video`, and `video-status` functions. Keep `verify_jwt = true`.
- [ ] Deploy `selfie-detect`, `selfie-generate`, and `selfie-sessions`; keep `verify_jwt = true`. Test missing/expired tokens and cross-user session/image access.
- [ ] Enable `VITE_VIDEO_GENERATION_ENABLED=true` only after Replicate credentials, billing, and the video functions are verified. Otherwise leave the feature disabled.
- [ ] Set the production frontend's Supabase URL and anon key; verify allowed origins/CORS are restricted to production domains where practical.
- [ ] Confirm user-facing plan/credit purchase claims match implemented billing; no payment processor is included in this repository.

## Verify after deploy

- [ ] Run `npm run test`, `npm run lint`, and `npm run build` on the release commit.
- [ ] Test sign-in, session refresh, sign-out, and direct Edge Function calls with missing, invalid, expired, and valid access tokens.
- [ ] Test concurrent image/video requests and insufficient balances; check each accepted request has exactly one debit and ledger entry.
- [ ] Force provider failures/timeouts and confirm the generation is marked failed and credits are refunded exactly once.
- [ ] Confirm `edit-image` accepts a supported uploaded data URL and rejects external URLs, private-network URLs, malformed data, and oversized content.
- [ ] Create one text-to-video job and one image-to-video job; verify status polling, output playback, failure handling, and refunds.
- [ ] Test single and couple selfie count confirmation, image upload/camera denial fallback, initial 4 then 2-image batches, stop behavior, duplicate requests, credit exhaustion, provider errors/refunds, favorites, per-image delete, session delete, and signed URL expiry.
- [ ] Confirm deployment uses HTTPS for browser camera access and that provider account quotas cover expected image-edit requests.
- [ ] Review Supabase logs for auth failures, provider errors, timeouts, and unexpected database permissions.
- [ ] Verify no secrets appear in built assets, browser network requests, logs, or committed files.

## Rollback

- [ ] Keep the previous frontend release and database backup available.
- [ ] If provider integration fails, set `VITE_VIDEO_GENERATION_ENABLED=false` and redeploy the frontend.
- [ ] Do not remove billing RPCs or permissions until in-flight generations have settled and ledger reconciliation is complete.
