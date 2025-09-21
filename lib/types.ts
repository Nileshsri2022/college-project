// Database types for the Agentic AI application

export interface Profile {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

export interface Birthday {
  id: string
  user_id: string
  person_name: string
  birth_date: string
  email?: string
  phone?: string
  notification_preference: "email" | "whatsapp" | "both"
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailSentiment {
  id: string
  user_id: string
  email_subject?: string
  email_content: string
  sender_email?: string
  sentiment_category: string
  confidence_score?: number
  analyzed_at: string
  created_at: string
}

export interface ImageCaption {
  id: string
  user_id: string
  image_url: string
  image_name?: string
  generated_caption: string
  generated_hashtags: string[]
  google_drive_file_id?: string
  google_sheet_row_id?: string
  processing_status: "pending" | "processing" | "completed" | "failed"
  created_at: string
  updated_at: string
}

export interface AgentTask {
  id: string
  user_id: string
  task_type: "birthday_reminder" | "sentiment_analysis" | "image_processing"
  task_status: "pending" | "running" | "completed" | "failed"
  task_data?: any
  result_data?: any
  scheduled_for?: string
  started_at?: string
  completed_at?: string
  error_message?: string
  created_at: string
}
