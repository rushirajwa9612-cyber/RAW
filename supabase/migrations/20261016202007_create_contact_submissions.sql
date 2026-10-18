/*
# Create contact_submissions table

1. New Tables
- `contact_submissions`
  - `id` (uuid, primary key)
  - `name` (text, not null) - sender's name
  - `email` (text, not null) - sender's email
  - `subject` (text, nullable) - optional subject line
  - `message` (text, not null) - the message body
  - `status` (text, default 'new') - tracking status: new, read, responded
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `contact_submissions`.
- Allow anon + authenticated to INSERT (contact form is public).
- No SELECT/UPDATE/DELETE for anon or authenticated — only service role can read and manage submissions.
*/

CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_contact" ON contact_submissions;
CREATE POLICY "anon_insert_contact"
ON contact_submissions FOR INSERT
TO anon, authenticated
WITH CHECK (true);
