const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function clearGmailTokens(userId) {
  try {
    console.log(`🧹 Clearing Gmail tokens for user: ${userId}`)

    // Clear from gmail_tokens table
    const { error: gmailError } = await supabase
      .from('gmail_tokens')
      .delete()
      .eq('user_id', userId)

    if (gmailError) {
      console.warn('⚠️ Failed to clear gmail_tokens:', gmailError)
    } else {
      console.log('✅ Cleared gmail_tokens table')
    }

    // Also clear from google_drive_tokens as fallback
    const { error: driveError } = await supabase
      .from('google_drive_tokens')
      .delete()
      .eq('user_id', userId)

    if (driveError) {
      console.warn('⚠️ Failed to clear google_drive_tokens:', driveError)
    } else {
      console.log('✅ Cleared google_drive_tokens table')
    }

    console.log('✅ Successfully cleared all tokens for user:', userId)
    console.log('🔄 User should now re-authenticate with Gmail scopes')
  } catch (error) {
    console.error('❌ Error clearing tokens:', error)
    throw error
  }
}

// Get user ID from command line argument
const userId = process.argv[2]
if (!userId) {
  console.error('❌ Please provide a user ID as an argument')
  console.log('Usage: node scripts/clear-gmail-tokens.js <user-id>')
  process.exit(1)
}

clearGmailTokens(userId)
