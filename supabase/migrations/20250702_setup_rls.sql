-- =================================================================
-- SQL Script for Row Level Security (RLS)
-- =================================================================
-- This script enables RLS and creates policies for the `profiles`
-- and `moods` tables. It ensures that users can only access
-- their own data.
--
-- You can run this entire script in the Supabase SQL Editor.
-- =================================================================


-- Step 1: Enable Row Level Security on both tables
-- -----------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moods ENABLE ROW LEVEL SECURITY;

-- Note: After enabling RLS, all access is denied by default until
-- a policy is created to grant access.


-- Step 2: Create policies for the `profiles` table
-- -----------------------------------------------------------------

-- Policy: Allow users to view their own profile.
CREATE POLICY "Allow individual user to read their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

-- Policy: Allow users to insert their own profile.
-- This is crucial for the initial registration (follow event).
CREATE POLICY "Allow individual user to insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Policy: Allow users to update their own profile.
CREATE POLICY "Allow individual user to update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- Step 3: Create policies for the `moods` table
-- -----------------------------------------------------------------

-- Policy: Allow users to view their own mood entries.
CREATE POLICY "Allow individual user to read their own moods"
ON public.moods FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Allow users to insert mood entries for themselves.
CREATE POLICY "Allow individual user to insert their own moods"
ON public.moods FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to update their own mood entries.
CREATE POLICY "Allow individual user to update their own moods"
ON public.moods FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Allow users to delete their own mood entries.
CREATE POLICY "Allow individual user to delete their own moods"
ON public.moods FOR DELETE
USING (auth.uid() = user_id);


-- =================================================================
-- End of Script
-- RLS is now configured. The backend must handle user sessions
-- correctly for these policies to work.
-- =================================================================
