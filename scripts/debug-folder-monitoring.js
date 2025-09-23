const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function debugFolderMonitoring(userId) {
  try {
    console.log(`🔍 Debugging folder monitoring setup for user: ${userId}`)

    // Check if user has Google Drive tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (tokenError || !tokens) {
      console.error('❌ No Google Drive tokens found')
      return
    }

    console.log('✅ Google Drive tokens found')

    // Check monitored folders
    const { data: monitoredFolders, error: foldersError } = await supabase
      .from('google_drive_monitored_folders')
      .select('*')
      .eq('user_id', userId)

    if (foldersError) {
      console.error('❌ Error checking monitored folders:', foldersError)
      return
    }

    console.log(`📁 Found ${monitoredFolders?.length || 0} monitored folders`)

    if (monitoredFolders && monitoredFolders.length > 0) {
      console.log('📋 Monitored folders:')
      monitoredFolders.forEach((folder, index) => {
        console.log(`  ${index + 1}. ${folder.folder_name} (${folder.folder_id})`)
        console.log(`     - Active: ${folder.is_active}`)
        console.log(`     - Image formats: ${folder.image_formats?.join(', ') || 'none'}`)
        console.log(`     - Created: ${folder.created_at}`)
        if (folder.webhook_channel_id) {
          console.log(`     - Webhook: ${folder.webhook_channel_id}`)
        }
      })
    } else {
      console.log('⚠️ No folders are currently being monitored')
      console.log('💡 User needs to select a folder in the UI first')
    }

    // Check processing status
    const { data: processingImages, error: processingError } = await supabase
      .from('image_captions')
      .select('*')
      .eq('user_id', userId)
      .in('processing_status', ['processing', 'pending'])

    if (processingError) {
      console.error('❌ Error checking processing status:', processingError)
      return
    }

    console.log(`📊 Found ${processingImages?.length || 0} images being processed`)

    if (processingImages && processingImages.length > 0) {
      console.log('📋 Processing images:')
      processingImages.forEach((image, index) => {
        console.log(`  ${index + 1}. ${image.image_name}`)
        console.log(`     - Status: ${image.processing_status}`)
        console.log(`     - Created: ${image.created_at}`)
      })
    }

    console.log('\n📋 DEBUG SUMMARY:')
    console.log('='.repeat(50))

    if (monitoredFolders && monitoredFolders.length > 0) {
      console.log('✅ Folder monitoring is set up')
      console.log('✅ Webhook should be active')
      console.log('✅ New images should be processed automatically')
    } else {
      console.log('❌ No folders are being monitored')
      console.log('💡 Go to Image Caption Generator and select a folder')
      console.log('💡 Click "Select Folder" and choose a folder to monitor')
    }

    if (processingImages && processingImages.length > 0) {
      console.log('✅ Images are being processed')
    } else {
      console.log('ℹ️ No images currently processing (this is normal if no new images)')
    }

    console.log('='.repeat(50))

  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

// Get user ID from command line argument
const userId = process.argv[2]
if (!userId) {
  console.error('❌ Please provide a user ID as an argument')
  console.log('Usage: node scripts/debug-folder-monitoring.js <user-id>')
  process.exit(1)
}

debugFolderMonitoring(userId)
