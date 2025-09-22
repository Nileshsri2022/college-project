import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleDriveService } from '@/lib/google-drive-service'
import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

require('dotenv').config()
const model_name=process.env.MODEL_NAME!
const model_baseurl=process.env.MODEL_BASE_URL!
const model_apikey=process.env.MODEL_API_KEY
const provider = createOpenAICompatible({
  name: "provider-name",
  apiKey: model_apikey,
  baseURL: model_baseurl,
})

export async function POST(request: NextRequest) {
  try {
    console.log('\n🔧 === GOOGLE DRIVE DEBUG ENDPOINT ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const body = await request.json()
    const { action, folderId } = body

    console.log('🔧 Debug action:', action)
    console.log('📁 Folder ID:', folderId)

    const driveService = new GoogleDriveService(user.id)

    switch (action) {
      case 'test_auth':
        console.log('🔐 Testing Google Drive authentication...')
        const isAuthenticated = await driveService.isAuthenticated()
        console.log('🔐 Auth result:', isAuthenticated)
        return NextResponse.json({ authenticated: isAuthenticated })

      case 'list_files':
        if (!folderId) {
          return NextResponse.json({ error: 'Folder ID required' }, { status: 400 })
        }
        console.log('📂 Testing file listing...')
        const files = await driveService.listFiles(folderId)
        console.log('📂 Files found:', files.length)
        return NextResponse.json({ files })

      case 'check_processed':
        console.log('🗄️ Testing database query for processed images...')
        const { data: existingImages, error: dbError } = await supabase
          .from('image_captions')
          .select('google_drive_file_id')
          .eq('user_id', user.id)
          .not('google_drive_file_id', 'is', null)

        console.log('🗄️ Database query result:', {
          count: existingImages?.length || 0,
          error: dbError?.message
        })
        return NextResponse.json({
          processedCount: existingImages?.length || 0,
          processedFileIds: existingImages?.map(img => img.google_drive_file_id) || []
        })

      case 'test_llm':
        console.log('🤖 Testing LLM connection...')
        try {
          const { text } = await generateText({
            model: provider(model_name),
            messages: [{ role: "user", content: "Say 'Hello World' and nothing else." }],
          })
          return NextResponse.json({ success: true, response: text })
        } catch (error) {
          console.error('❌ LLM test failed:', error)
          return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        }

      default:
        return NextResponse.json({ error: 'Invalid debug action' }, { status: 400 })
    }
  } catch (error) {
    console.error('💥 Debug endpoint error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}
