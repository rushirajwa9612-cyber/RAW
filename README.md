# RAW 2.0

RAW 2.0 is a Vite + React application backed by Supabase Auth, Postgres and Edge Functions.

## Local setup

1. Install Node.js 20 or newer and the Supabase CLI.
2. Copy `.env.example` to `.env` and set the Supabase project URL and public anon key. Never put service-role or provider secrets in a `VITE_*` variable.
3. Run `npm install`, then `npm run dev`.
4. Configure the Supabase project URL and keys in the Supabase CLI, then apply migrations with `supabase db push`.
5. Deploy the functions listed in `supabase/config.toml` with `supabase functions deploy <function-name>`.

## Supabase Edge Function secrets

Set these only in Supabase's secret manager (never commit them):

- Required for auth and database operations: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase supplies these in hosted Edge Functions).
- Image generation and editing: `OPENAI_API_KEY`; optional `OPENAI_IMAGE_MODEL` and `OPENAI_EDIT_MODEL`.
- Chat: `OPENAI_API_KEY`; optional `OPENAI_CHAT_MODEL`.
- Selfie Studio: `OPENAI_API_KEY`; optional `OPENAI_VISION_MODEL` (defaults to `gpt-4o-mini`) and `OPENAI_SELFIE_MODEL` (defaults to `gpt-image-1`). Person counting is a low-detail vision request. Each finished/failed image is settled through the existing server billing RPC; the selfie reservation costs 2 credits per image and enforces 20 jobs per user per 24 hours and 20 image slots per session. Provider pricing and account access still apply.
- Video: `REPLICATE_API_TOKEN`; optional `REPLICATE_VIDEO_MODEL` (defaults to `minimax/video-01`). Set frontend `VITE_VIDEO_GENERATION_ENABLED=true` only after this secret is configured and the function has been deployed.

Video uses Replicate's official Minimax Video-01 model. It supports a six-second landscape output and optional first-frame image. Provider pricing and model availability are controlled by Replicate; verify the account has billing enabled before production use.

## Validation

- `npm run test` runs repository security-contract regression tests.
- `npm run lint` runs ESLint.
- `npm run build` type-checks and builds the production bundle.

## Chat and Selfie Studio support

- The chat composer accepts up to five PNG/JPEG/WebP images and small TXT/CSV files (50 KB each). PDF, DOCX, XLSX, PPTX, library import, sketch input, web search, and deep research are visibly unavailable because this repository has no processing/search integration for them.
- Chat offers `gpt-4o-mini` and `gpt-4o`; access depends on the configured OpenAI account. Speech input requires browser speech-recognition support and microphone permission. Camera access starts only after the user opens the camera dialog and requires HTTPS or localhost.
- Selfie references and generated results are kept in the private `selfie-private` bucket. Signed URLs expire after 30 minutes. Deleting a session removes its reference and generated files. The configured OpenAI image-edit endpoint receives the reference image; likeness is approximate, especially for Couple mode.
- To deploy Selfie Studio, apply `supabase/migrations/20261018140000_selfie_studio.sql`, then deploy `selfie-detect`, `selfie-generate`, and `selfie-sessions` with JWT verification enabled. Set the provider secrets above before trying live generation. No provider key belongs in `.env` or browser assets.
- The first batch requests four images with two concurrent provider calls; later automatic batches request two. Stop prevents queued calls from starting, but already-running provider requests may complete and be billed. Current limits are intentionally finite and should be adjusted only after reviewing provider cost and quota.

See [PRODUCTION_DEPLOY_CHECKLIST.md](./PRODUCTION_DEPLOY_CHECKLIST.md) before a release.
