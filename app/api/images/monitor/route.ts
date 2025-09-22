import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
import { z } from "zod"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

require('dotenv').config()
const model_name = process.env.MODEL_NAME!
const model_baseurl = process.env.MODEL_BASE_URL!
const model_apikey = process.env.MODEL_API_KEY
const provider = createOpenAICompatible({
  name: "provider-name",
  apiKey: model_apikey,
  baseURL: model_baseurl,
})

const imageAnalysisSchema = z.object({
  caption: z.string(),
  hashtags: z.array(z.string()),
  description: z.string(),
  mood: z.string(),
  objects: z.array(z.string()),
})

export async function POST(request: NextRequest) {
  try {
    console.log('\n🖼️ === IMAGE MONITORING STARTED ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const body = await request.json()
    const { action = 'process_pending', maxImages = 5 } = body

    console.log(`🔧 Monitor action: ${action}`)
    console.log(`📊 Max images to process: ${maxImages}`)

    switch (action) {
      case 'process_pending':
        return await processPendingImages(supabase, user.id, maxImages)
      case 'check_status':
        return await checkProcessingStatus(supabase, user.id)
      case 'retry_failed':
        return await retryFailedImages(supabase, user.id, maxImages)
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('💥 Image monitoring error:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function processPendingImages(supabase: any, userId: string, maxImages: number) {
  console.log('\n🔍 === PROCESSING PENDING IMAGES ===')

  // Find images that need processing
  const { data: pendingImages, error: queryError } = await supabase
    .from("image_captions")
    .select("*")
    .eq("user_id", userId)
    .in("processing_status", ["pending", "processing"])
    .order("created_at", { ascending: true })
    .limit(maxImages)

  if (queryError) {
    console.error('❌ Error querying pending images:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  console.log(`📊 Found ${pendingImages?.length || 0} pending images`)

  if (!pendingImages || pendingImages.length === 0) {
    console.log('📭 No pending images found')
    return NextResponse.json({
      message: 'No pending images found',
      processed: 0,
      results: []
    })
  }

  const results = []
  let processedCount = 0
  let failedCount = 0

  for (const image of pendingImages) {
    try {
      console.log(`\n🖼️ === PROCESSING IMAGE: ${image.image_name} ===`)
      console.log(`🆔 Image ID: ${image.id}`)
      console.log(`📊 Current status: ${image.processing_status}`)

      // Update status to processing
      await supabase
        .from("image_captions")
        .update({ processing_status: "processing", updated_at: new Date().toISOString() })
        .eq("id", image.id)

      // Extract base64 data from image_url
      const base64Match = image.image_url.match(/data:image\/[^;]+;base64,(.+)/)
      if (!base64Match) {
        throw new Error('Invalid image URL format')
      }
      const base64 = base64Match[1]

      // Analyze with AI
      console.log('🤖 Sending image to LLM for analysis...')
      const { object: analysis } = await generateObject({
        model: provider(model_name),
        schema: imageAnalysisSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate a social media caption and hashtags for this image. Keep it engaging and relevant.",
              },
              {
                type: "image",
                image: base64,
              },
            ],
          },
        ],
      })

      console.log('✅ AI analysis completed')
      console.log(`📝 Caption: ${analysis.caption.substring(0, 100)}...`)
      console.log(`🏷️ Hashtags: ${analysis.hashtags.slice(0, 3).join(', ')}...`)

      // Update database record
      await supabase
        .from("image_captions")
        .update({
          generated_caption: analysis.caption,
          generated_hashtags: analysis.hashtags,
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", image.id)

      // Create agent task record
      await supabase.from("agent_tasks").insert({
        user_id: userId,
        task_type: "image_processing",
        task_status: "completed",
        task_data: {
          image_id: image.id,
          image_name: image.image_name,
        },
        result_data: {
          analysis: analysis,
          processed_at: new Date().toISOString(),
        },
        completed_at: new Date().toISOString(),
      })

      results.push({
        image_id: image.id,
        image_name: image.image_name,
        status: 'completed',
        analysis: analysis
      })

      processedCount++
      console.log(`✅ Successfully processed: ${image.image_name}`)

    } catch (error) {
      console.error(`❌ Failed to process image ${image.image_name}:`, error)

      // Update status to failed
      await supabase
        .from("image_captions")
        .update({
          processing_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", image.id)

      results.push({
        image_id: image.id,
        image_name: image.image_name,
        status: 'failed',
        error: error instanceof Error ? error.message : "Unknown error"
      })

      failedCount++
    }
  }

  console.log(`\n📊 === PROCESSING SUMMARY ===`)
  console.log(`✅ Successfully processed: ${processedCount}`)
  console.log(`❌ Failed: ${failedCount}`)
  console.log(`📈 Total: ${pendingImages.length}`)

  return NextResponse.json({
    message: `Processed ${processedCount} out of ${pendingImages.length} images`,
    processed: processedCount,
    failed: failedCount,
    total: pendingImages.length,
    results: results
  })
}

async function checkProcessingStatus(supabase: any, userId: string) {
  console.log('\n📊 === CHECKING PROCESSING STATUS ===')

  const { data: statusData, error } = await supabase
    .from("image_captions")
    .select("processing_status")
    .eq("user_id", userId)

  if (error) {
    console.error('❌ Error checking status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const statusCounts = statusData?.reduce((acc: any, item: any) => {
    acc[item.processing_status] = (acc[item.processing_status] || 0) + 1
    return acc
  }, {})

  console.log('📊 Status breakdown:', statusCounts)

  return NextResponse.json({
    total_images: statusData?.length || 0,
    status_breakdown: statusCounts || {},
    pending_count: statusCounts?.pending || 0,
    processing_count: statusCounts?.processing || 0,
    completed_count: statusCounts?.completed || 0,
    failed_count: statusCounts?.failed || 0
  })
}

async function retryFailedImages(supabase: any, userId: string, maxImages: number) {
  console.log('\n🔄 === RETRYING FAILED IMAGES ===')

  // Find failed images
  const { data: failedImages, error: queryError } = await supabase
    .from("image_captions")
    .select("*")
    .eq("user_id", userId)
    .eq("processing_status", "failed")
    .order("created_at", { ascending: true })
    .limit(maxImages)

  if (queryError) {
    console.error('❌ Error querying failed images:', queryError)
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  console.log(`📊 Found ${failedImages?.length || 0} failed images to retry`)

  if (!failedImages || failedImages.length === 0) {
    return NextResponse.json({
      message: 'No failed images found to retry',
      retried: 0,
      results: []
    })
  }

  // Process failed images (same logic as processPendingImages)
  const results = []
  let retriedCount = 0

  for (const image of failedImages) {
    try {
      console.log(`🔄 Retrying image: ${image.image_name}`)

      // Update status to processing
      await supabase
        .from("image_captions")
        .update({ processing_status: "processing", updated_at: new Date().toISOString() })
        .eq("id", image.id)

      // Extract base64 and process (same as above)
      const base64Match = image.image_url.match(/data:image\/[^;]+;base64,(.+)/)
      if (!base64Match) {
        throw new Error('Invalid image URL format')
      }
      const base64 = base64Match[1]

      const { object: analysis } = await generateObject({
        model: provider(model_name),
        schema: imageAnalysisSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Generate a social media caption and hashtags for this image. Keep it engaging and relevant.",
              },
              {
                type: "image",
                image: base64,
              },
            ],
          },
        ],
      })

      // Update database record
      await supabase
        .from("image_captions")
        .update({
          generated_caption: analysis.caption,
          generated_hashtags: analysis.hashtags,
          processing_status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", image.id)

      results.push({
        image_id: image.id,
        image_name: image.image_name,
        status: 'completed',
        analysis: analysis
      })

      retriedCount++
      console.log(`✅ Successfully retried: ${image.image_name}`)

    } catch (error) {
      console.error(`❌ Failed to retry image ${image.image_name}:`, error)
      results.push({
        image_id: image.id,
        image_name: image.image_name,
        status: 'failed',
        error: error instanceof Error ? error.message : "Unknown error"
      })
    }
  }

  console.log(`📊 Retry summary: ${retriedCount} retried, ${failedImages.length - retriedCount} still failed`)

  return NextResponse.json({
    message: `Retried ${retriedCount} out of ${failedImages.length} images`,
    retried: retriedCount,
    still_failed: failedImages.length - retriedCount,
    results: results
  })
}
