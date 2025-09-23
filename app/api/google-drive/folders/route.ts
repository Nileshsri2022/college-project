import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleDriveService } from '@/lib/google-drive-service'

export async function GET(request: NextRequest) {
  try {
    console.log('\n📁 === GOOGLE DRIVE FOLDERS REQUEST ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const driveService = new GoogleDriveService(user.id)

    // Check if user is authenticated with Google Drive
    const isAuthenticated = await driveService.isAuthenticated()
    if (!isAuthenticated) {
      console.error('❌ Not authenticated with Google Drive')
      return NextResponse.json({ error: 'Not authenticated with Google Drive' }, { status: 401 })
    }

    console.log('✅ Google Drive authentication confirmed')

    // Get folders from Google Drive
    const folders = await driveService.getFolders()
    console.log(`📁 Retrieved ${folders.length} folders from Google Drive`)

    // Get currently monitored folders
    const monitoredFolders = await driveService.getMonitoredFolders()
    console.log(`📋 Found ${monitoredFolders.length} monitored folders`)

    const response = {
      folders,
      monitoredFolders,
      summary: {
        total_folders: folders.length,
        monitored_count: monitoredFolders.length
      }
    }

    console.log('✅ === GOOGLE DRIVE FOLDERS REQUEST COMPLETED ===')
    return NextResponse.json(response)

  } catch (error) {
    console.error('\n💥 === GOOGLE DRIVE FOLDERS ERROR ===')
    console.error('Error details:', error)
    console.error('❌ === REQUEST FAILED ===\n')
    return NextResponse.json(
      { error: 'Failed to get folders' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('\n📁 === SETUP FOLDER MONITORING REQUEST ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const body = await request.json()
    const { folderId, folderName, imageFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'] } = body

    if (!folderId || !folderName) {
      console.error('❌ Folder ID and name are required')
      return NextResponse.json({ error: 'Folder ID and name are required' }, { status: 400 })
    }

    console.log(`📁 Setting up monitoring for folder: ${folderName} (${folderId})`)

    const driveService = new GoogleDriveService(user.id)

    // Check if user is authenticated with Google Drive
    const isAuthenticated = await driveService.isAuthenticated()
    if (!isAuthenticated) {
      console.error('❌ Not authenticated with Google Drive')
      return NextResponse.json({ error: 'Not authenticated with Google Drive' }, { status: 401 })
    }

    console.log('✅ Google Drive authentication confirmed')

    // Setup folder monitoring
    await driveService.setupFolderMonitoring(folderId, folderName, imageFormats)

    console.log('✅ === FOLDER MONITORING SETUP COMPLETED ===')

    return NextResponse.json({
      success: true,
      message: `Started monitoring folder: ${folderName}`,
      folder: {
        folderId,
        folderName,
        imageFormats
      }
    })

  } catch (error) {
    console.error('\n💥 === SETUP FOLDER MONITORING ERROR ===')
    console.error('Error details:', error)
    console.error('❌ === REQUEST FAILED ===\n')
    return NextResponse.json(
      { error: 'Failed to setup folder monitoring' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('\n📁 === STOP FOLDER MONITORING REQUEST ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    if (!folderId) {
      console.error('❌ Folder ID is required')
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    console.log(`📁 Stopping monitoring for folder: ${folderId}`)

    const driveService = new GoogleDriveService(user.id)

    // Stop folder monitoring
    await driveService.stopFolderMonitoring(folderId)

    console.log('✅ === FOLDER MONITORING STOPPED ===')

    return NextResponse.json({
      success: true,
      message: 'Stopped monitoring folder'
    })

  } catch (error) {
    console.error('\n💥 === STOP FOLDER MONITORING ERROR ===')
    console.error('Error details:', error)
    console.error('❌ === REQUEST FAILED ===\n')
    return NextResponse.json(
      { error: 'Failed to stop folder monitoring' },
      { status: 500 }
    )
  }
}
