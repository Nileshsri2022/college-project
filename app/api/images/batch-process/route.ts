import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
import { generateObject } from "ai"
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
console.log(model_name,model_apikey,model_baseurl)
const batchImageAnalysisSchema = z.object({
  analyses: z.array(
    z.object({
      index: z.number(),
      caption: z.string(),
      hashtags: z.array(z.string()),
      description: z.string(),
      mood: z.string(),
      objects: z.array(z.string()),
    }),
  ),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("images") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "At least one image is required" }, { status: 400 })
    }

    if (files.length > 10) {
      return NextResponse.json({ error: "Maximum 10 images allowed per batch" }, { status: 400 })
    }

    const results = []
    const imageInserts = []

    // Process each image
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        // Convert to base64
        const bytes = await file.arrayBuffer()
        const base64 = Buffer.from(bytes).toString("base64")
        const mimeType = file.type

        // Create database record
        const { data: imageRecord, error: insertError } = await supabase
          .from("image_captions")
          .insert({
            user_id: user.id,
            image_url: `data:${mimeType};base64,${base64}`,
            image_name: file.name,
            generated_caption: "",
            generated_hashtags: [],
            processing_status: "processing",
          })
          .select()
          .single()

        if (insertError) {
          console.error("Failed to insert image record:", insertError)
          continue
        }

        // Analyze with AI
        const { object: analysis } = await generateObject({
          model: provider(model_name),
          schema: z.object({
            caption: z.string(),
            hashtags: z.array(z.string()),
            description: z.string(),
            mood: z.string(),
            objects: z.array(z.string()),
          }),
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
          .eq("id", imageRecord.id)

        results.push({
          index: i,
          image_id: imageRecord.id,
          filename: file.name,
          analysis: {
            caption: analysis.caption,
            hashtags: analysis.hashtags,
            description: analysis.description,
            mood: analysis.mood,
            objects: analysis.objects,
          },
          status: "completed",
        })
      } catch (error) {
        console.error(`Failed to process image ${i}:`, error)
        results.push({
          index: i,
          filename: file.name,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }

    // Create batch processing task
    await supabase.from("agent_tasks").insert({
      user_id: user.id,
      task_type: "image_processing",
      task_status: "completed",
      task_data: {
        batch_size: files.length,
        processed_count: results.filter((r) => r.status === "completed").length,
        failed_count: results.filter((r) => r.status === "failed").length,
      },
      result_data: {
        results: results,
        processed_at: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    })

    return NextResponse.json({
      message: `Processed ${results.filter((r) => r.status === "completed").length} out of ${files.length} images`,
      results,
    })
  } catch (error) {
    console.error("Error in batch image processing:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
