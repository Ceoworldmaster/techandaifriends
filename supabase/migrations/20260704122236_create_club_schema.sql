/*
# Tech & AI Friends Club – Core Schema

## Summary
Creates three tables for the club management system:
- `profiles`: stores member info linked to Supabase auth users (name, role, term, points, admin flag)
- `activities`: stores club news/magazine entries with PDF links
- `registrations`: stores membership applications submitted via the public join form

## Tables

### profiles
- `id` (uuid, PK, FK → auth.users) – tied to Supabase auth account
- `full_name` (text) – display name
- `role` (text) – position in club (e.g. "Chủ nhiệm", "Trưởng ban")
- `role_rank` (int) – sort order: 1=Ban chủ nhiệm, 2=Trưởng ban, 3=Thành viên
- `term` (text) – academic term, e.g. "2025-2026"
- `points` (int) – gamification points
- `avatar_url` (text) – optional avatar image
- `is_admin` (boolean) – admin flag

### activities
- `id` (uuid, PK)
- `title` (text) – magazine/activity title
- `description` (text)
- `pdf_url` (text) – public URL in Supabase Storage
- `cover_url` (text) – optional cover image URL
- `issue_number` (int) – issue number
- `published_at` (timestamptz)
- `created_at` (timestamptz)

### registrations
- `id` (uuid, PK)
- `full_name` (text)
- `email` (text)
- `class_name` (text)
- `reason` (text)
- `status` (text) – 'pending' | 'approved' | 'rejected'
- `created_at` (timestamptz)

## Security
- RLS enabled on all three tables
- profiles: authenticated users can read all profiles; only admins (via service role) can insert/update
- activities: public read (anon + authenticated); admin-only insert/update via service role
- registrations: anon insert (public form); authenticated read; no public update/delete
*/

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'Thành viên',
  role_rank int NOT NULL DEFAULT 3,
  term text NOT NULL DEFAULT '2025-2026',
  points int NOT NULL DEFAULT 0,
  avatar_url text,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete_own" ON profiles;
CREATE POLICY "profiles_delete_own" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ACTIVITIES
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  pdf_url text,
  cover_url text,
  issue_number int DEFAULT 1,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_all" ON activities;
CREATE POLICY "activities_select_all" ON activities FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "activities_insert_auth" ON activities;
CREATE POLICY "activities_insert_auth" ON activities FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "activities_update_auth" ON activities;
CREATE POLICY "activities_update_auth" ON activities FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "activities_delete_auth" ON activities;
CREATE POLICY "activities_delete_auth" ON activities FOR DELETE
  TO authenticated USING (true);

-- REGISTRATIONS
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  class_name text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_insert_anon" ON registrations;
CREATE POLICY "registrations_insert_anon" ON registrations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "registrations_select_auth" ON registrations;
CREATE POLICY "registrations_select_auth" ON registrations FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "registrations_update_auth" ON registrations;
CREATE POLICY "registrations_update_auth" ON registrations FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "registrations_delete_auth" ON registrations;
CREATE POLICY "registrations_delete_auth" ON registrations FOR DELETE
  TO authenticated USING (true);

-- Storage bucket for PDFs (must be created via dashboard, but we note it here)
-- Bucket: news-pdfs (public)
