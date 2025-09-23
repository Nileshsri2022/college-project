const { google } = require('googleapis')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugDriveFolders(userId) {
  try {
    console.log(`🔍 Debugging Google Drive folders for user: ${userId}`)

    // Get user's tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokens) {
      console.error('❌ No tokens found for user')
      return
    }

    console.log('✅ Tokens found:', {
      hasAccessToken: !!tokens.access_token,
      scope: tokens.scope,
      expiryDate: tokens.expiry_date
    })

    // Check if token is expired
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      console.log('⚠️ Token is expired')
      return
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/google-drive/callback`
    )

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type
    })

    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    console.log('🔍 Testing different folder queries...')

    // Test 1: Basic folder query
    try {
      console.log('\n📁 Test 1: Basic folder query')
      const response1 = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder'",
        fields: 'files(id, name, modifiedTime, parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 10
      })

      console.log(`✅ Found ${response1.data.files?.length || 0} folders`)
      if (response1.data.files && response1.data.files.length > 0) {
        console.log('📋 Sample folders:')
        response1.data.files.slice(0, 3).forEach((folder, index) => {
          console.log(`  ${index + 1}. ${folder.name} (${folder.id})`)
        })
      }
    } catch (error) {
      console.error('❌ Test 1 failed:', error.message)
    }

    // Test 2: Query without mimeType filter (get all files)
    try {
      console.log('\n📁 Test 2: All files query')
      const response2 = await drive.files.list({
        fields: 'files(id, name, modifiedTime, mimeType, parents)',
        orderBy: 'modifiedTime desc',
        pageSize: 20
      })

      console.log(`✅ Found ${response2.data.files?.length || 0} total files`)
      const folders = response2.data.files?.filter(file =>
        file.mimeType === 'application/vnd.google-apps.folder'
      ) || []

      console.log(`📁 Folders among them: ${folders.length}`)
      if (folders.length > 0) {
        console.log('📋 Sample folders:')
        folders.slice(0, 3).forEach((folder, index) => {
          console.log(`  ${index + 1}. ${folder.name} (${folder.id})`)
        })
      }
    } catch (error) {
      console.error('❌ Test 2 failed:', error.message)
    }

    // Test 3: Check root folder specifically
    try {
      console.log('\n📁 Test 3: Root folder check')
      const response3 = await drive.files.get({
        fileId: 'root',
        fields: 'id, name, mimeType'
      })

      console.log('✅ Root folder:', response3.data)
    } catch (error) {
      console.error('❌ Test 3 failed:', error.message)
    }

    // Test 4: Check user's "My Drive" folder
    try {
      console.log('\n📁 Test 4: My Drive folder')
      const response4 = await drive.files.list({
        q: "'root' in parents and mimeType = 'application/vnd.google-apps.folder'",
        fields: 'files(id, name, modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 10
      })

      console.log(`✅ Found ${response4.data.files?.length || 0} folders in My Drive`)
      if (response4.data.files && response4.data.files.length > 0) {
        console.log('📋 Folders in My Drive:')
        response4.data.files.forEach((folder, index) => {
          console.log(`  ${index + 1}. ${folder.name} (${folder.id})`)
        })
      }
    } catch (error) {
      console.error('❌ Test 4 failed:', error.message)
    }

    console.log('\n📋 DEBUG SUMMARY:')
    console.log('='.repeat(50))
    console.log('If no folders are found in any test:')
    console.log('1. User might not have any folders in Google Drive')
    console.log('2. Check if the Google Drive API is enabled in Google Cloud Console')
    console.log('3. Verify the OAuth consent screen includes Drive API scopes')
    console.log('4. User might need to grant permissions again')
    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

// Get user ID from command line argument
const userId = process.argv[2]
if (!userId) {
  console.error('❌ Please provide a user ID as an argument')
  console.log('Usage: node scripts/debug-drive-folders.js <user-id>')
  process.exit(1)
}

debugDriveFolders(userId)
