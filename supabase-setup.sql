-- ============================================================
-- LyricLantern Database Setup
-- Run this ENTIRE script in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. PROFILES TABLE (auto-created when users sign up)
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. SONGS TABLE (cached song data + rankings)
-- ============================================================
CREATE TABLE public.songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id VARCHAR(11) NOT NULL UNIQUE,
  youtube_url TEXT NOT NULL,
  title TEXT,
  artist TEXT,
  duration_ms INTEGER,
  thumbnail_url TEXT,
  lyrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  view_count BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.songs
  ADD CONSTRAINT songs_video_id_format
  CHECK (video_id ~ '^[a-zA-Z0-9_-]{11}$');

CREATE INDEX idx_songs_view_count ON public.songs (view_count DESC);
CREATE INDEX idx_songs_created_at ON public.songs (created_at DESC);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Songs are publicly readable"
  ON public.songs FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can insert songs"
  ON public.songs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Anon users can insert songs"
  ON public.songs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "No direct updates from clients"
  ON public.songs FOR UPDATE TO anon, authenticated USING (false);

CREATE POLICY "No deletes from clients"
  ON public.songs FOR DELETE TO anon, authenticated USING (false);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_songs_updated
  BEFORE UPDATE ON public.songs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 3. ATOMIC VIEW COUNT INCREMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_view_count(p_video_id VARCHAR)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.songs SET view_count = view_count + 1
  WHERE video_id = p_video_id
  RETURNING view_count;
$$;

GRANT EXECUTE ON FUNCTION public.increment_view_count(VARCHAR) TO anon, authenticated;

-- 4. INSERT OR RETURN CACHED SONG
-- ============================================================
CREATE OR REPLACE FUNCTION public.insert_processed_song(
  p_video_id VARCHAR,
  p_youtube_url TEXT,
  p_title TEXT,
  p_artist TEXT,
  p_duration_ms INTEGER,
  p_thumbnail TEXT,
  p_lyrics JSONB
) RETURNS SETOF public.songs
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.songs (video_id, youtube_url, title, artist, duration_ms, thumbnail_url, lyrics)
  VALUES (p_video_id, p_youtube_url, p_title, p_artist, p_duration_ms, p_thumbnail, p_lyrics)
  ON CONFLICT (video_id) DO NOTHING;
  SELECT * FROM public.songs WHERE video_id = p_video_id;
$$;

GRANT EXECUTE ON FUNCTION public.insert_processed_song TO anon, authenticated;

-- 5. SAVED VOCABULARY TABLE
-- ============================================================
CREATE TABLE public.saved_vocabulary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chinese TEXT NOT NULL,
  pinyin TEXT NOT NULL,
  english TEXT NOT NULL,
  song_title TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_saved_vocabulary_user_id ON public.saved_vocabulary(user_id);

ALTER TABLE public.saved_vocabulary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vocabulary"
  ON public.saved_vocabulary FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own vocabulary"
  ON public.saved_vocabulary FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own vocabulary"
  ON public.saved_vocabulary FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================
-- DONE! All tables, policies, and functions are set up.
-- ============================================================
