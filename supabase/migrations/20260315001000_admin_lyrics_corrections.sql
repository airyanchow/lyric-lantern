-- ============================================================
-- LyricLantern Admin & Lyrics Corrections Migration
-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

-- 1. Add is_admin flag to profiles
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL;

-- Allow anyone to read the is_admin flag (needed for frontend admin checks)
CREATE POLICY "Anyone can read admin status"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

-- 2. LYRICS CORRECTIONS TABLE
-- ============================================================
CREATE TABLE public.lyrics_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE NOT NULL,
  video_id VARCHAR(11) NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_by_name TEXT,
  lyrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  mode TEXT NOT NULL DEFAULT 'chinese',  -- 'chinese' or 'pretranslated'
  raw_text TEXT NOT NULL,                -- original text the user pasted
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewer_notes TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX idx_lyrics_corrections_status ON public.lyrics_corrections (status);
CREATE INDEX idx_lyrics_corrections_song ON public.lyrics_corrections (song_id);
CREATE INDEX idx_lyrics_corrections_created ON public.lyrics_corrections (created_at DESC);

ALTER TABLE public.lyrics_corrections ENABLE ROW LEVEL SECURITY;

-- Anyone can view corrections (admin page needs this)
CREATE POLICY "Corrections are publicly readable"
  ON public.lyrics_corrections FOR SELECT TO anon, authenticated USING (true);

-- Anyone can submit a correction (anon or authenticated)
CREATE POLICY "Anyone can submit corrections"
  ON public.lyrics_corrections FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only admins can update corrections (approve/reject)
CREATE POLICY "Admins can update corrections"
  ON public.lyrics_corrections FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Only admins can delete corrections
CREATE POLICY "Admins can delete corrections"
  ON public.lyrics_corrections FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 3. FUNCTION: Apply approved correction (updates song lyrics)
-- ============================================================
CREATE OR REPLACE FUNCTION public.approve_lyrics_correction(
  p_correction_id UUID,
  p_processed_lyrics JSONB,
  p_reviewer_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_correction RECORD;
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  -- Get the correction
  SELECT * INTO v_correction FROM public.lyrics_corrections WHERE id = p_correction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Correction not found';
  END IF;

  -- Update the song's lyrics with processed lyrics
  UPDATE public.songs
    SET lyrics = p_processed_lyrics,
        updated_at = now()
    WHERE id = v_correction.song_id;

  -- Store processed lyrics on the correction record too
  UPDATE public.lyrics_corrections
    SET status = 'approved',
        lyrics = p_processed_lyrics,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        reviewer_notes = p_reviewer_notes
    WHERE id = p_correction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_lyrics_correction(UUID, JSONB, TEXT) TO authenticated;

-- 4. FUNCTION: Reject a correction
-- ============================================================
CREATE OR REPLACE FUNCTION public.reject_lyrics_correction(
  p_correction_id UUID,
  p_reviewer_notes TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check caller is admin
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized: admin access required';
  END IF;

  UPDATE public.lyrics_corrections
    SET status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        reviewer_notes = p_reviewer_notes
    WHERE id = p_correction_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reject_lyrics_correction(UUID, TEXT) TO authenticated;

-- ============================================================
-- After running this, set yourself as admin:
-- UPDATE public.profiles SET is_admin = true WHERE id = '<your-user-uuid>';
-- ============================================================
