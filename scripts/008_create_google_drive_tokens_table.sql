-- Create table for storing Google Drive OAuth tokens
CREATE TABLE IF NOT EXISTS google_drive_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date BIGINT,
  scope TEXT,
  token_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_drive_tokens_user_id ON google_drive_tokens(user_id);

-- Enable Row Level Security
ALTER TABLE google_drive_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to only access their own tokens
-- First drop the policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can only access their own Google Drive tokens" ON google_drive_tokens;

CREATE POLICY "Users can only access their own Google Drive tokens" ON google_drive_tokens
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
-- First drop the trigger and function if they exist to avoid conflicts
DROP TRIGGER IF EXISTS update_google_drive_tokens_updated_at ON google_drive_tokens;
DROP FUNCTION IF EXISTS update_google_drive_tokens_updated_at();

CREATE FUNCTION update_google_drive_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_google_drive_tokens_updated_at
  BEFORE UPDATE ON google_drive_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_google_drive_tokens_updated_at();
