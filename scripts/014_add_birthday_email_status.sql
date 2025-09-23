-- Add email status tracking columns to birthdays table
ALTER TABLE public.birthdays
ADD COLUMN IF NOT EXISTS email_status TEXT CHECK (email_status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS last_email_attempt TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS email_error_message TEXT,
ADD COLUMN IF NOT EXISTS email_message_id TEXT;

-- Create index for better query performance on email status
CREATE INDEX IF NOT EXISTS idx_birthdays_email_status ON public.birthdays(email_status);
CREATE INDEX IF NOT EXISTS idx_birthdays_birth_date_email_status ON public.birthdays(birth_date, email_status);

-- Update existing birthdays to have 'pending' status
UPDATE public.birthdays
SET email_status = 'pending'
WHERE email_status IS NULL AND is_active = true;
