const { google } = require('googleapis')
require('dotenv').config()

function generateGmailAuthUrl(userId) {
  try {
    console.log(`🔗 Generating Gmail authentication URL for user: ${userId}`)

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    )

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.metadata'
      ],
      state: userId,
      prompt: 'consent'
    })

    console.log('\n🔗 GMAIL AUTHENTICATION URL:')
    console.log('='.repeat(50))
    console.log(authUrl)
    console.log('='.repeat(50))
    console.log('\n📋 INSTRUCTIONS:')
    console.log('1. Copy the URL above')
    console.log('2. Paste it in your browser')
    console.log('3. Sign in with your Google account')
    console.log('4. Grant Gmail permissions when prompted')
    console.log('5. You will be redirected back to your app')
    console.log('\n✅ After authentication, try the Gmail sentiment analysis again')

    return authUrl
  } catch (error) {
    console.error('❌ Error generating auth URL:', error)
    throw error
  }
}

// Get user ID from command line argument
const userId = process.argv[2]
if (!userId) {
  console.error('❌ Please provide a user ID as an argument')
  console.log('Usage: node scripts/generate-gmail-auth-url.js <user-id>')
  process.exit(1)
}

generateGmailAuthUrl(userId)
