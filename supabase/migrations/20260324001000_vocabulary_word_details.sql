-- ============================================================
-- LyricLantern Vocabulary Word Details Migration
-- Adds part of speech and example sentence fields to saved_vocabulary
-- Run this in Supabase: SQL Editor → New query → Paste → Run
-- ============================================================

ALTER TABLE public.saved_vocabulary
  ADD COLUMN IF NOT EXISTS part_of_speech TEXT,
  ADD COLUMN IF NOT EXISTS example_chinese TEXT,
  ADD COLUMN IF NOT EXISTS example_pinyin TEXT,
  ADD COLUMN IF NOT EXISTS example_english TEXT;
