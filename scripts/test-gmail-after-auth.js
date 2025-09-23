const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function testGmailAfterAuth(userId) {
  try {
    console.log(`🧪 Testing Gmail functionality for user: ${userId}`)

    // Check if user has Gmail tokens
    const { data: gmailTokens, error: gmailError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (gmailError && gmailError.code !== 'PGRST116') {
      console.error('❌ Error checking Gmail tokens:', gmailError)
      return
    }

    if (gmailTokens) {
      console.log('✅ Gmail tokens found!')
      console.log('📊 Token details:', {
        hasAccessToken: !!gmailTokens.access_token,
        hasRefreshToken: !!gmailTokens.refresh_token,
        scope: gmailTokens.scope,
        expiryDate: gmailTokens.expiry_date
      })

      // Check scopes
      const scopes = gmailTokens.scope ? gmailTokens.scope.split(' ') : []
      const hasGmailScopes = scopes.some(scope =>
        scope.includes('gmail.readonly') ||
        scope.includes('gmail.modify') ||
        scope.includes('gmail.metadata')
      )

      if (hasGmailScopes) {
        console.log('✅ User has proper Gmail scopes!')
        console.log('🎯 Gmail scopes found:', scopes.filter(s => s.includes('gmail')))
      } else {
        console.log('⚠️ User still has non-Gmail scopes:', scopes)
      }
    } else {
      console.log('📭 No Gmail tokens found - user needs to authenticate')
    }

    // Check if there are any remaining Drive tokens
    const { data: driveTokens, error: driveError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (driveError && driveError.code !== 'PGRST116') {
      console.error('❌ Error checking Drive tokens:', driveError)
      return
    }

    if (driveTokens) {
      console.log('⚠️ Drive tokens still exist:', {
        scope: driveTokens.scope,
        hasAccessToken: !!driveTokens.access_token
      })
    } else {
      console.log('✅ No Drive tokens found - clean slate!')
    }

    console.log('\n📋 SUMMARY:')
    console.log('='.repeat(50))
    if (gmailTokens && hasGmailScopes) {
      console.log('✅ READY: User can now use Gmail sentiment analysis')
      console.log('🎯 Go to /sentiment page and try Gmail analysis')
    } else {
      console.log('⏳ PENDING: User needs to authenticate with Gmail scopes')
      console.log('🔗 Use the authentication URL provided earlier')
    }
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Error testing Gmail functionality:', error)
  }
}

// Get user ID from command line argument
const userId = process.argv[2]
if (!userId) {
  console.error('❌ Please provide a user ID as an argument')
  console.log('Usage: node scripts/test-gmail-after-auth.js <user-id>')
  process.exit(1)
}

testGmailAfterAuth(userId)
