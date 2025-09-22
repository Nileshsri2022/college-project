-- Add missing columns to email_sentiments table for enhanced sentiment analysis

-- Add reasoning column
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- Add key_emotions column (array of text)
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS key_emotions TEXT[];

-- Add tone_indicators column (array of text)
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS tone_indicators TEXT[];

-- Add category_description column
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS category_description TEXT;

-- Add gmail_message_id column
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS gmail_message_id TEXT;

-- Add gmail_thread_id column
ALTER TABLE public.email_sentiments
ADD COLUMN IF NOT EXISTS gmail_thread_id TEXT;

-- Update sentiment categories to include more options
ALTER TABLE public.email_sentiments
DROP CONSTRAINT IF EXISTS email_sentiments_sentiment_category_check;

ALTER TABLE public.email_sentiments
ADD CONSTRAINT email_sentiments_sentiment_category_check
CHECK (sentiment_category IN (
  'positive', 'negative', 'neutral', 'happy', 'sad', 'angry', 'emotional', 'professional',
  'grateful', 'suggestive', 'constructive', 'excited', 'optimistic', 'disappointed',
  'frustrated', 'critical', 'urgent', 'demanding', 'mixed', 'cautious', 'concerned', 'appreciative'
));

-- Add comment to document the table structure
COMMENT ON TABLE public.email_sentiments IS 'Enhanced email sentiment analysis results with detailed categorization and metadata';
COMMENT ON COLUMN public.email_sentiments.reasoning IS 'AI reasoning for the sentiment classification';
COMMENT ON COLUMN public.email_sentiments.key_emotions IS 'Array of key emotions detected in the email';
COMMENT ON COLUMN public.email_sentiments.tone_indicators IS 'Array of tone indicators identified in the email';
COMMENT ON COLUMN public.email_sentiments.category_description IS 'Description of what the sentiment category represents';
COMMENT ON COLUMN public.email_sentiments.gmail_message_id IS 'Gmail message ID for reference';
COMMENT ON COLUMN public.email_sentiments.gmail_thread_id IS 'Gmail thread ID for grouping related emails';
