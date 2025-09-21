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
    const { emails } = body

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "Emails array is required" }, { status: 400 })
    }

    console.log("[v0] Starting batch sentiment analysis for", emails.length, "emails")

    // Prepare emails for batch analysis
    const emailsForAnalysis = emails.map((email, index) => ({
      index,
      subject: email.subject || "No subject",
      sender: email.sender || "Unknown sender",
      content: email.content,
    }))

    const { text } = await generateText({
      model: provider(model_name),
      prompt: `Analyze the sentiment and emotional tone of these ${emails.length} emails and respond with a JSON object.

Emails to analyze:
${emailsForAnalysis
  .map(
    (email) => `
Email ${email.index}:
Subject: ${email.subject}
From: ${email.sender}
Content: ${email.content}
---`,
  )
  .join("\n")}

Respond with a valid JSON object in this exact format:
{
  "analyses": [
    {
      "index": 0,
      "sentiment_category": "positive|negative|neutral|happy|sad|angry|emotional|professional",
      "confidence_score": 0.85,
      "reasoning": "Brief explanation"
    }
  ]
}

For each email, categorize the sentiment as one of: positive, negative, neutral, happy, sad, angry, emotional, professional. Make sure confidence_score is a number between 0 and 1.`,
    })

    console.log("[v0] AI batch response received:", text)

    let batchAnalysis
    try {
      batchAnalysis = JSON.parse(text.trim())
    } catch (parseError) {
      console.error("[v0] Failed to parse batch AI response:", parseError)
      // Create fallback analysis for all emails
      batchAnalysis = {
        analyses: emails.map((_, index) => ({
          index,
          sentiment_category: "neutral",
          confidence_score: 0.5,
          reasoning: "Unable to parse AI response, using fallback analysis",
        })),
      }
    }

    if (!batchAnalysis.analyses || !Array.isArray(batchAnalysis.analyses)) {
      console.error("[v0] Invalid batch analysis structure:", batchAnalysis)
      batchAnalysis = {
        analyses: emails.map((_, index) => ({
          index,
          sentiment_category: "neutral",
          confidence_score: 0.5,
          reasoning: "Invalid AI response structure, using fallback analysis",
        })),
      }
    }

    console.log("[v0] Final batch analysis:", batchAnalysis)

    const results = []
    const sentimentInserts = []

    // Process each analysis result
    for (const analysis of batchAnalysis.analyses) {
      const originalEmail = emails[analysis.index] || emails[0] // Fallback to first email if index is invalid

      sentimentInserts.push({
        user_id: user.id,
        email_subject: originalEmail.subject,
        email_content: originalEmail.content,
        sender_email: originalEmail.sender,
        sentiment_category: analysis.sentiment_category || "neutral",
        confidence_score: typeof analysis.confidence_score === "number" ? analysis.confidence_score : 0.5,
      })

      results.push({
        index: analysis.index,
        email: originalEmail,
        analysis: {
          sentiment_category: analysis.sentiment_category || "neutral",
          confidence_score: typeof analysis.confidence_score === "number" ? analysis.confidence_score : 0.5,
          reasoning: analysis.reasoning || "No reasoning provided",
        },
      })
    }

    // Batch insert all sentiment analyses
    const { data: insertedSentiments, error: insertError } = await supabase
      .from("email_sentiments")
      .insert(sentimentInserts)
      .select()

    if (insertError) {
      console.error("[v0] Database insert error:", insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Create agent task for batch processing
    await supabase.from("agent_tasks").insert({
      user_id: user.id,
      task_type: "sentiment_analysis",
      task_status: "completed",
      task_data: {
        batch_size: emails.length,
        processed_emails: results.length,
      },
      result_data: {
        sentiment_distribution: results.reduce(
          (acc, result) => {
            acc[result.analysis.sentiment_category] = (acc[result.analysis.sentiment_category] || 0) + 1
            return acc
          },
          {} as Record<string, number>,
        ),
        processed_at: new Date().toISOString(),
      },
      completed_at: new Date().toISOString(),
    })

    console.log("[v0] Batch sentiment analysis completed successfully")

    return NextResponse.json({
      message: `Successfully analyzed ${results.length} emails`,
      results,
      inserted_sentiments: insertedSentiments,
    })
  } catch (error) {
    console.error("[v0] Error in batch sentiment analysis:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
