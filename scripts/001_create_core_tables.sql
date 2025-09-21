-- Create core tables for the Agentic AI application

-- Users profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Birthday reminders table
CREATE TABLE IF NOT EXISTS public.birthdays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  email TEXT,
  phone TEXT,
  notification_preference TEXT CHECK (notification_preference IN ('email', 'whatsapp', 'both')) DEFAULT 'email',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email sentiment analysis table
CREATE TABLE IF NOT EXISTS public.email_sentiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_subject TEXT,
  email_content TEXT NOT NULL,
  sender_email TEXT,
  sentiment_category TEXT CHECK (sentiment_category IN ('positive', 'negative', 'neutral', 'happy', 'sad', 'angry', 'emotional', 'professional')) NOT NULL,
  confidence_score DECIMAL(3,2),
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Image processing results table
CREATE TABLE IF NOT EXISTS public.image_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  generated_caption TEXT NOT NULL,
  generated_hashtags TEXT[], -- Array of hashtags
  google_drive_file_id TEXT,
  google_sheet_row_id TEXT,
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent tasks and automation logs
CREATE TABLE IF NOT EXISTS public.agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type TEXT CHECK (task_type IN ('birthday_reminder', 'sentiment_analysis', 'image_processing')) NOT NULL,
  task_status TEXT CHECK (task_status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  task_data JSONB, -- Store task-specific data
  result_data JSONB, -- Store task results
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sentiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.image_captions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Create RLS policies for birthdays
CREATE POLICY "birthdays_select_own" ON public.birthdays FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "birthdays_insert_own" ON public.birthdays FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "birthdays_update_own" ON public.birthdays FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "birthdays_delete_own" ON public.birthdays FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for email_sentiments
CREATE POLICY "email_sentiments_select_own" ON public.email_sentiments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "email_sentiments_insert_own" ON public.email_sentiments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "email_sentiments_update_own" ON public.email_sentiments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "email_sentiments_delete_own" ON public.email_sentiments FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for image_captions
CREATE POLICY "image_captions_select_own" ON public.image_captions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "image_captions_insert_own" ON public.image_captions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "image_captions_update_own" ON public.image_captions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "image_captions_delete_own" ON public.image_captions FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for agent_tasks
CREATE POLICY "agent_tasks_select_own" ON public.agent_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agent_tasks_insert_own" ON public.agent_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agent_tasks_update_own" ON public.agent_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agent_tasks_delete_own" ON public.agent_tasks FOR DELETE USING (auth.uid() = user_id);
