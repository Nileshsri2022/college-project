import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // user ID
    const error = searchParams.get('error')

    if (error) {
      console.error('Gmail OAuth error:', error)
      return NextResponse.redirect(new URL('/sentiment?error=gmail_auth_failed', request.url))
    }

    if (!code || !state) {
      console.error('Missing code or state in Gmail callback')
      return NextResponse.redirect(new URL('/sentiment?error=missing_auth_params', request.url))
    }

    console.log('🔐 Processing Gmail OAuth callback for user:', state)

    // Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID!,
      process.env.GOOGLE_CLIENT_SECRET!,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    console.log('✅ Received Gmail tokens:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      scope: tokens.scope,
      expiryDate: tokens.expiry_date
    })

    // Store tokens in database
    const supabase = await createClient()
    const { error: insertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: state,
        access_token: tokens.access_token!,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        scope: tokens.scope!,
        token_type: tokens.token_type!,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })

    if (insertError) {
      console.error('❌ Error storing Gmail tokens:', insertError)
      return NextResponse.redirect(new URL('/sentiment?error=token_storage_failed', request.url))
    }

    console.log('✅ Gmail tokens stored successfully')

    // Redirect back to sentiment page with success
    return NextResponse.redirect(new URL('/sentiment?gmail_auth=success', request.url))

  } catch (error) {
    console.error('💥 Gmail OAuth callback error:', error)
    return NextResponse.redirect(new URL('/sentiment?error=gmail_callback_failed', request.url))
  }
}
