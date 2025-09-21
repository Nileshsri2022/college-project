import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GoogleDriveService } from '@/lib/google-drive-service'
import { generateText } from "ai"
import { z } from "zod"
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

// Add a simple test log that should always appear
console.log('🧪 MONITOR ROUTE TEST - This should always be visible')

// Zod schema for image analysis
const imageAnalysisSchema = z.object({
  caption: z.string().describe("A detailed, engaging caption describing the image"),
  hashtags: z.array(z.string()).describe("Relevant hashtags for social media (without # symbol)"),
  description: z.string().describe("Detailed description of what's in the image"),
  mood: z.string().describe("The mood or atmosphere of the image"),
  colors: z.array(z.string()).describe("Dominant colors in the image"),
  objects: z.array(z.string()).describe("Main objects or subjects visible in the image"),
  setting: z.string().describe("The setting or location type of the image"),
})

// Helper: parse JSON from AI response
function parseAIResponse(raw: string) {
  try {
    // First try to parse as direct JSON
    return JSON.parse(raw.trim())
  } catch {
    // If that fails, try to extract from markdown code blocks
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim())
    }

    // Try to find JSON-like content between common delimiters
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0].trim())
    }

    throw new Error("Could not parse JSON from AI response")
  }
}

// Retry wrapper for AI calls
async function generateAnalysisWithRetry(base64: string, retries = 1) {
  let lastError: any

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🤖 === LLM ANALYSIS ATTEMPT ${attempt}/${retries} ===`)
      console.log(`📊 Model: ${model_name}`)
      console.log(`🌐 Base URL: ${model_baseurl}`)
      console.log(`🔑 API Key: ${model_apikey ? '***configured***' : 'NOT SET'}`)

      console.log('📤 Sending request to LLM...')
      const { text: analysisText } = await generateText({
        model: provider(model_name),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze the image and return ONLY a JSON object matching this exact schema:

{
  "caption": "string",
  "hashtags": ["string"],
  "description": "string",
  "mood": "string",
  "colors": ["string"],
  "objects": ["string"],
  "setting": "string"
}

Return only valid JSON without any markdown formatting or code blocks. Do not wrap the JSON in \`\`\`json or any other formatting.`,
              },
              { type: "image", image: base64 },
            ],
          },
        ],
      })

      console.log('📥 Received raw response from LLM:')
      console.log('--- RAW LLM OUTPUT START ---')
      console.log(analysisText)
      console.log('--- RAW LLM OUTPUT END ---')

      // Parse the AI response which may be wrapped in markdown code blocks
      console.log('🔍 Parsing LLM response...')
      const parsedResponse = parseAIResponse(analysisText)

      console.log('✅ Parsed response:')
      console.log(JSON.stringify(parsedResponse, null, 2))

      // Validate against schema
      console.log('🔎 Validating against schema...')
      const validatedResponse = imageAnalysisSchema.parse(parsedResponse)

      console.log('✅ Schema validation passed')
      console.log(`🎉 === LLM ANALYSIS ATTEMPT ${attempt} SUCCESSFUL ===`)

      return validatedResponse
    } catch (err) {
      lastError = err
      console.warn(`⚠️  === LLM ANALYSIS ATTEMPT ${attempt} FAILED ===`)
      console.warn('Error details:', err)
      console.warn(`Retrying... (${attempt}/${retries})`)
    }
  }

  console.error('💥 === ALL LLM ANALYSIS ATTEMPTS FAILED ===')
  throw new Error(`AI analysis failed after ${retries} retries: ${lastError}`)
}

export async function GET(request: NextRequest) {
  try {
    console.log('\n🔍 === GOOGLE DRIVE MONITOR REQUEST STARTED ===')
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
    const processImages = searchParams.get('processImages') === 'true'

    console.log(`📁 Folder ID: ${folderId}`)
    console.log(`🤖 Process Images: ${processImages}`)

    if (!folderId) {
      console.error('❌ Folder ID is required but not provided')
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

    let processedResults: any[] = []

    if (processImages) {
      console.log('🚀 STARTING GOOGLE DRIVE IMAGE PROCESSING WITH LLM')
      console.log(`📁 Total files found in folder: ${files.length}`)

      // Get already processed file IDs to avoid duplicates
      console.log('🔍 Checking for already processed images...')
      const { data: existingImages } = await supabase
        .from('image_captions')
        .select('google_drive_file_id')
        .eq('user_id', user.id)
        .not('google_drive_file_id', 'is', null)

      const processedFileIds = new Set(
        existingImages?.map(img => img.google_drive_file_id) || []
      )

      console.log(`✅ Found ${processedFileIds.size} already processed images`)

      // Filter out already processed files
      const unprocessedFiles = files.filter(file => !processedFileIds.has(file.id))

      console.log(`🆕 Found ${unprocessedFiles.length} unprocessed images to process`)
      console.log('📋 Unprocessed images:', unprocessedFiles.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType
      })))

      // Process unprocessed images
      for (const file of unprocessedFiles) {
        try {
          console.log(`\n🖼️  === PROCESSING IMAGE: ${file.name} ===`)
          console.log(`📄 File ID: ${file.id}`)
          console.log(`🔗 MIME Type: ${file.mimeType}`)

          // Get file content as base64
          console.log('📥 Downloading file content from Google Drive...')
          const base64Data = await driveService.getFileContent(file.id)
          console.log(`✅ Downloaded ${base64Data.length} bytes of image data`)

          // Create database record
          console.log('💾 Creating database record...')
          const { data: imageRecord, error: insertError } = await supabase
            .from("image_captions")
            .insert({
              user_id: user.id,
              image_url: `data:${file.mimeType};base64,${base64Data}`,
              image_name: file.name,
              google_drive_file_id: file.id,
              generated_caption: "",
              generated_hashtags: [],
              processing_status: "processing",
            })
            .select()
            .single()

          if (insertError) {
            console.error("❌ Failed to insert image record:", insertError)
            continue
          }

          console.log(`✅ Database record created with ID: ${imageRecord.id}`)

          // Analyze with AI
          console.log('🤖 Sending image to LLM for analysis...')
          const analysis = await generateAnalysisWithRetry(base64Data)

          console.log('🎉 === LLM ANALYSIS COMPLETE ===')
          console.log('📝 Caption:', analysis.caption)
          console.log('🏷️  Hashtags:', analysis.hashtags)
          console.log('📖 Description:', analysis.description)
          console.log('🎭 Mood:', analysis.mood)
          console.log('🎨 Colors:', analysis.colors)
          console.log('📦 Objects:', analysis.objects)
          console.log('🏞️  Setting:', analysis.setting)

          // Update database record
          console.log('💾 Updating database with analysis results...')
          const { error: updateError } = await supabase
            .from("image_captions")
            .update({
              generated_caption: analysis.caption,
              generated_hashtags: analysis.hashtags,
              processing_status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", imageRecord.id)

          if (updateError) {
            console.error("❌ Failed to update image record:", updateError)
            continue
          }

          console.log('✅ Database updated successfully')

          // Insert agent task record
          console.log('📝 Creating agent task record...')
          await supabase.from("agent_tasks").insert({
            user_id: user.id,
            task_type: "image_processing",
            task_status: "completed",
            task_data: {
              image_caption_id: imageRecord.id,
              image_name: file.name,
              google_drive_file_id: file.id,
            },
            result_data: {
              caption: analysis.caption,
              hashtags: analysis.hashtags,
              analysis_details: analysis,
              processed_at: new Date().toISOString(),
            },
            completed_at: new Date().toISOString(),
          })

          console.log('✅ Agent task record created')

          processedResults.push({
            file_id: file.id,
            file_name: file.name,
            status: 'completed',
            analysis: analysis
          })

          console.log(`✅ Successfully processed: ${file.name}`)

        } catch (error) {
          console.error(`\n❌ === FAILED TO PROCESS IMAGE: ${file.name} ===`)
          console.error('🔍 Error details:', error)

          // Mark as failed in database
          await supabase
            .from("image_captions")
            .update({
              processing_status: "failed",
              updated_at: new Date().toISOString()
            })
            .eq("google_drive_file_id", file.id)
            .eq("user_id", user.id)

          processedResults.push({
            file_id: file.id,
            file_name: file.name,
            status: 'failed',
            error: error instanceof Error ? error.message : "Unknown error"
          })

          console.error(`❌ Failed to process: ${file.name}`)
        }
      }

      console.log(`\n📊 === PROCESSING SUMMARY ===`)
      console.log(`📁 Total files: ${files.length}`)
      console.log(`✅ Successfully processed: ${processedResults.filter(r => r.status === 'completed').length}`)
      console.log(`❌ Failed: ${processedResults.filter(r => r.status === 'failed').length}`)
      console.log('🏁 === GOOGLE DRIVE PROCESSING COMPLETE ===')
    }

    const response = {
      files,
      processed_results: processedResults,
      summary: {
        total_files: files.length,
        processed_count: processedResults.filter(r => r.status === 'completed').length,
        failed_count: processedResults.filter(r => r.status === 'failed').length
      }
    }

    console.log('\n📤 === RESPONSE BEING SENT ===')
    console.log('📊 Response summary:', response.summary)
    console.log('📁 Files count:', response.files.length)
    console.log('⚡ Processed results count:', response.processed_results.length)
    console.log('✅ === GOOGLE DRIVE MONITOR REQUEST COMPLETED ===\n')

    return NextResponse.json(response)
  } catch (error) {
    console.error('\n💥 === GOOGLE DRIVE MONITOR ERROR ===')
    console.error('Error details:', error)
    console.error('❌ === REQUEST FAILED ===\n')
    return NextResponse.json(
      { error: 'Failed to monitor folder' },
      { status: 500 }
    )
  }
}
