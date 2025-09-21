import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleDriveService } from '@/lib/google-drive-service'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId } = params

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    // Initialize Google Drive service
    const driveService = new GoogleDriveService(user.id)

    // Check if user is authenticated
    const isAuthenticated = await driveService.isAuthenticated()
    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Not authenticated with Google Drive' }, { status: 401 })
    }

    // Get file content
    const base64Data = await driveService.getFileContent(fileId)

    return NextResponse.json({ base64Data })
  } catch (error) {
    console.error('Error getting file content:', error)
    return NextResponse.json(
      { error: 'Failed to get file content' },
      { status: 500 }
    )
  }
}
