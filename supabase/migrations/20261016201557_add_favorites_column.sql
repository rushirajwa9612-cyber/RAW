/*
# Add favorites support to generations

1. Modified Tables
- `generations`: Added `is_favorite` boolean column (defaults to false)
  Allows users to bookmark their favorite generations for quick access.

2. Security
- No new policies needed. The existing `update_own_generations` policy
  already covers updating the `is_favorite` column since it's an UPDATE
  on a row the user owns.

3. Notes
- The column is nullable-safe with a default of false so existing rows
  are automatically backfilled.
*/

ALTER TABLE generations
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;
