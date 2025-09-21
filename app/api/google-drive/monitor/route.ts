import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleDriveService } from '@/lib/google-drive-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 })
    }

    // Initialize Google Drive service
    const driveService = new GoogleDriveService(user.id)

    // Check if user is authenticated
    const isAuthenticated = await driveService.isAuthenticated()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Not authenticated with Google Drive' }, { status: 401 })
    }

    // Get files from the folder
    const files = await driveService.listFiles(folderId)

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error monitoring Google Drive folder:', error)
    return NextResponse.json(
      { error: 'Failed to monitor folder' },
      { status: 500 }
    )
  }
}
