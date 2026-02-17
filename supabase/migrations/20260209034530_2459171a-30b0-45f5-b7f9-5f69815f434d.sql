-- Add author_name and author_avatar columns to tweets table for IFTTT webhook data
ALTER TABLE public.tweets ADD COLUMN IF NOT EXISTS author_name text;
ALTER TABLE public.tweets ADD COLUMN IF NOT EXISTS author_avatar text;