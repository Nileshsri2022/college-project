import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

// Gmail OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI
)

// OAuth scopes needed for Gmail API
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.metadata'
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate OAuth URL with Gmail scopes
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state: user.id, // Include user ID in state for security
      prompt: 'consent' // Force consent to get refresh token and proper scopes
    })
    console.log("url=>",authUrl)
    console.log("url=>",authUrl)
    console.log("url=>",authUrl)
    console.log("url=>",authUrl)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Gmail auth error:', error)
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear stored Gmail tokens from database
    const { error: gmailDeleteError } = await supabase
      .from('gmail_tokens')
      .delete()
      .eq('user_id', user.id)

    if (gmailDeleteError) {
      console.error('Error deleting Gmail tokens:', gmailDeleteError)
    }

    // Also clear from google_drive_tokens as fallback
    const { error: driveDeleteError } = await supabase
      .from('google_drive_tokens')
      .delete()
      .eq('user_id', user.id)

    if (driveDeleteError) {
      console.error('Error deleting Drive tokens:', driveDeleteError)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Gmail sign out error:', error)
    return NextResponse.json(
      { error: 'Failed to sign out' },
      { status: 500 }
    )
  }
}
