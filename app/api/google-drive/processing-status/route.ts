import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleDriveService } from '@/lib/google-drive-service'

export async function GET(request: NextRequest) {
  try {
    console.log('\n📊 === GOOGLE DRIVE PROCESSING STATUS REQUEST ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const driveService = new GoogleDriveService(user.id)

    // Get processing status
    const processingImages = await driveService.getProcessingStatus()
    console.log(`📊 Found ${processingImages.length} images with processing status`)

    // Get summary statistics
    const summary = {
      total: processingImages.length,
      processing: processingImages.filter(img => img.processing_status === 'processing').length,
      pending: processingImages.filter(img => img.processing_status === 'pending').length,
      completed: processingImages.filter(img => img.processing_status === 'completed').length,
      failed: processingImages.filter(img => img.processing_status === 'failed').length,
    }

    console.log('📈 Processing summary:', summary)

    const response = {
      images: processingImages,
      summary,
      lastUpdated: new Date().toISOString()
    }

    console.log('✅ === PROCESSING STATUS REQUEST COMPLETED ===')
    return NextResponse.json(response)

  } catch (error) {
    console.error('\n💥 === PROCESSING STATUS ERROR ===')
    console.error('Error details:', error)
    console.error('❌ === REQUEST FAILED ===\n')
    return NextResponse.json(
      { error: 'Failed to get processing status' },
      { status: 500 }
    )
  }
}
