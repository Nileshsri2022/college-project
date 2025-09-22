-- Migration to move Gmail tokens from google_drive_tokens to gmail_tokens table
-- This resolves duplicate key constraint issues

-- Check if there are any Gmail-related tokens in google_drive_tokens
SELECT
  'Checking for Gmail tokens in google_drive_tokens table' as info,
  COUNT(*) as token_count
FROM public.google_drive_tokens
WHERE scope LIKE '%gmail%';

-- Move Gmail tokens from google_drive_tokens to gmail_tokens
INSERT INTO public.gmail_tokens (
  user_id,
  access_token,
  refresh_token,
  expiry_date,
  scope,
  token_type,
  updated_at
)
SELECT
  user_id,
  access_token,
  refresh_token,
  expiry_date,
  scope,
  token_type,
  updated_at
FROM public.google_drive_tokens
WHERE scope LIKE '%gmail%'
ON CONFLICT (user_id) DO UPDATE SET
  access_token = EXCLUDED.access_token,
  refresh_token = EXCLUDED.refresh_token,
  expiry_date = EXCLUDED.expiry_date,
  scope = EXCLUDED.scope,
  token_type = EXCLUDED.token_type,
  updated_at = EXCLUDED.updated_at;

-- Remove Gmail tokens from google_drive_tokens table
DELETE FROM public.google_drive_tokens
WHERE scope LIKE '%gmail%';

-- Verify the migration
SELECT
  'Migration completed' as status,
  'Gmail tokens moved from google_drive_tokens to gmail_tokens' as message;

-- Show final count
SELECT
  'Final token counts' as info,
  (SELECT COUNT(*) FROM public.gmail_tokens WHERE scope LIKE '%gmail%') as gmail_tokens_count,
  (SELECT COUNT(*) FROM public.google_drive_tokens WHERE scope LIKE '%gmail%') as remaining_gmail_tokens;
