import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has valid Google Drive tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (tokenError || !tokens) {
      return NextResponse.json({ isAuthenticated: false })
    }

    // Check if token is expired
    const isExpired = tokens.expiry_date && Date.now() >= tokens.expiry_date

    if (isExpired) {
      return NextResponse.json({ isAuthenticated: false })
    }

    return NextResponse.json({ isAuthenticated: true })
  } catch (error) {
    console.error('Error checking auth status:', error)
    return NextResponse.json(
      { error: 'Failed to check authentication status' },
      { status: 500 }
    )
  }
}
