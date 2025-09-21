-- Update the check constraint to allow the new fixed categories
ALTER TABLE email_sentiments 
DROP CONSTRAINT IF EXISTS email_sentiments_sentiment_category_check;

ALTER TABLE email_sentiments 
ADD CONSTRAINT email_sentiments_sentiment_category_check 
CHECK (sentiment_category IN (
  'positive', 'grateful', 'suggestive', 'constructive', 
  'excited', 'optimistic', 'disappointed', 'frustrated', 
  'negative', 'critical', 'urgent', 'demanding', 
  'neutral', 'mixed', 'cautious', 'concerned', 'appreciative'
));
