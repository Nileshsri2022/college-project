-- Add foreign key relationship between birthdays and profiles
ALTER TABLE birthdays 
ADD CONSTRAINT fk_birthdays_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON birthdays(user_id);
