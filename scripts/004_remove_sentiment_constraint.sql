-- Remove the check constraint on sentiment_category to allow dynamic AI-generated categories
-- This enables the AI to create any sentiment category it deems appropriate

-- Drop the existing check constraint
ALTER TABLE public.email_sentiments 
DROP CONSTRAINT IF EXISTS email_sentiments_sentiment_category_check;

-- The sentiment_category column will now accept any text value
-- This allows the AI to dynamically determine appropriate sentiment categories
-- without being limited to predefined options

-- Add a comment to document this change
COMMENT ON COLUMN public.email_sentiments.sentiment_category IS 'AI-generated sentiment category - no restrictions to allow dynamic categorization';
