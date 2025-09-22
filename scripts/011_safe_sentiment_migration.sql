-- Safe migration to add missing columns to email_sentiments table
-- This handles existing data properly

-- First, drop the existing constraint to avoid conflicts
ALTER TABLE public.email_sentiments
DROP CONSTRAINT IF EXISTS email_sentiments_sentiment_category_check;

-- Add missing columns
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS reasoning TEXT;

ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS key_emotions TEXT[];

ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS tone_indicators TEXT[];

ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS category_description TEXT;

ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;

ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

-- Update existing rows to have valid sentiment categories
-- Convert any invalid categories to 'neutral'
UPDATE public.email_sentiments
SET sentiment_category = 'neutral'
WHERE sentiment_category NOT IN (
  'positive', 'negative', 'neutral', 'happy', 'sad', 'angry', 'emotional', 'professional',
  'grateful', 'suggestive', 'constructive', 'excited', 'optimistic', 'disappointed',
  'frustrated', 'critical', 'urgent', 'demanding', 'mixed', 'cautious', 'concerned', 'appreciative'
);

-- Now add the updated constraint with expanded categories
ALTER TABLE public.email_sentiments
ADD CONSTRAINT email_sentiments_sentiment_category_check
CHECK (sentiment_category IN (
  'positive', 'negative', 'neutral', 'happy', 'sad', 'angry', 'emotional', 'professional',
  'grateful', 'suggestive', 'constructive', 'excited', 'optimistic', 'disappointed',
  'frustrated', 'critical', 'urgent', 'demanding', 'mixed', 'cautious', 'concerned', 'appreciative'
));

-- Add helpful comments
COMMENT ON TABLE public.email_sentiments IS 'Enhanced email sentiment analysis results with detailed categorization and metadata';
COMMENT ON COLUMN public.email_sentiments.reasoning IS 'AI reasoning for the sentiment classification';
COMMENT ON COLUMN public.email_sentiments.key_emotions IS 'Array of key emotions detected in the email';
COMMENT ON COLUMN public.email_sentiments.tone_indicators IS 'Array of tone indicators identified in the email';
COMMENT ON COLUMN public.email_sentiments.category_description IS 'Description of what the sentiment category represents';
COMMENT ON COLUMN public.email_sentiments.gmail_message_id IS 'Gmail message ID for reference';
COMMENT ON COLUMN public.email_sentiments.gmail_thread_id IS 'Gmail thread ID for grouping related emails';

-- Verify the migration worked
SELECT
  'Migration completed successfully' as status,
  COUNT(*) as total_rows
FROM public.email_sentiments;
