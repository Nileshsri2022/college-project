-- Create table for storing Google Drive monitored folders
CREATE TABLE IF NOT EXISTS google_drive_monitored_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    image_formats TEXT[] DEFAULT '{".jpg", ".jpeg", ".png", ".gif", ".webp"}',
    polling_interval INTEGER DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    webhook_channel_id TEXT,
    webhook_resource_id TEXT,
    webhook_expiration TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, folder_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_google_drive_monitored_folders_user_id ON google_drive_monitored_folders(user_id);
CREATE INDEX IF NOT EXISTS idx_google_drive_monitored_folders_active ON google_drive_monitored_folders(is_active);

-- Enable RLS
ALTER TABLE google_drive_monitored_folders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own monitored folders" ON google_drive_monitored_folders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monitored folders" ON google_drive_monitored_folders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monitored folders" ON google_drive_monitored_folders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monitored folders" ON google_drive_monitored_folders
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_google_drive_monitored_folders_updated_at
    BEFORE UPDATE ON google_drive_monitored_folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
