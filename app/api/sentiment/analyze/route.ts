import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"
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
console.log(model_name,model_apikey,model_baseurl)

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

    const body = await request.json()
    const { email_content, email_subject, sender_email } = body

    if (!email_content) {
      return NextResponse.json({ error: "Email content is required" }, { status: 400 })
    }

    console.log("[v0] Starting sentiment analysis for user:", user.id)

    const { text } = await generateText({
      model: provider(model_name),
      prompt: `Analyze the sentiment and emotional tone of this email and categorize it into one of these FIXED categories:

AVAILABLE CATEGORIES:
- positive
- grateful  
- suggestive
- constructive
- excited
- optimistic
- disappointed
- frustrated
- negative
- critical
- urgent
- demanding
- neutral
- mixed
- cautious
- concerned
- appreciative

Subject: ${email_subject || "No subject"}
From: ${sender_email || "Unknown sender"}

Content:
${email_content}

Choose the MOST APPROPRIATE category from the list above. Respond with a valid JSON object in this exact format:
{
  "sentiment_category": "one_of_the_categories_above",
  "confidence_score": 0.85,
  "reasoning": "Brief explanation of why you chose this specific category",
  "key_emotions": ["emotion1", "emotion2"],
  "tone_indicators": ["indicator1", "indicator2"],
  "category_description": "Brief description of what this category represents"
}

IMPORTANT: The sentiment_category MUST be exactly one of the categories listed above (lowercase, no spaces).`,
    })

    console.log("[v0] AI response received:", text)

    let analysis
    try {
      analysis = JSON.parse(text.trim())
    } catch (parseError) {
      console.error("[v0] Failed to parse AI response:", parseError)
      // Fallback analysis if parsing fails
      analysis = {
        sentiment_category: "neutral",
        confidence_score: 0.5,
        reasoning: "Unable to parse AI response, using fallback analysis",
        key_emotions: ["uncertain"],
        tone_indicators: ["unclear"],
        category_description: "Fallback category description",
      }
    }

    if (!analysis.sentiment_category || typeof analysis.confidence_score !== "number") {
      console.error("[v0] Invalid analysis structure:", analysis)
      analysis = {
        sentiment_category: "neutral",
        confidence_score: 0.5,
        reasoning: "Invalid AI response structure, using fallback analysis",
        key_emotions: ["uncertain"],
        tone_indicators: ["unclear"],
        category_description: "Fallback category description",
      }
    }

    console.log("[v0] Final analysis:", analysis)

    // Save the analysis to database
    const { data: sentiment, error } = await supabase
      .from("email_sentiments")
      .insert({
        user_id: user.id,
        email_subject,
        email_content,
        sender_email,
        sentiment_category: analysis.sentiment_category,
        confidence_score: analysis.confidence_score,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Database error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create agent task for further processing if needed
    await supabase.from("agent_tasks").insert({
      user_id: user.id,
      task_type: "sentiment_analysis",
      task_status: "completed",
      task_data: {
        email_sentiment_id: sentiment.id,
        analysis_details: analysis,
      },
      result_data: {
        sentiment_category: analysis.sentiment_category,
        confidence_score: analysis.confidence_score,
        processed_at: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    })

    console.log("[v0] Sentiment analysis completed successfully")

    return NextResponse.json({
      sentiment,
      analysis: {
        sentiment_category: analysis.sentiment_category,
        confidence_score: analysis.confidence_score,
        reasoning: analysis.reasoning,
        key_emotions: analysis.key_emotions,
        tone_indicators: analysis.tone_indicators,
        category_description: analysis.category_description,
      },
    })
  } catch (error) {
    console.error("[v0] Error analyzing sentiment:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
