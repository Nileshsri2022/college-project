import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GmailService } from '@/lib/gmail-service'
import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { z } from "zod"

require('dotenv').config()
const model_name = process.env.MODEL_NAME!
const model_baseurl = process.env.MODEL_BASE_URL!
const model_apikey = process.env.MODEL_API_KEY
const provider = createOpenAICompatible({
  name: "provider-name",
  apiKey: model_apikey,
  baseURL: model_baseurl,
})

// Zod schema for sentiment analysis results
const sentimentAnalysisSchema = z.object({
  sentiment_category: z.string(),
  confidence_score: z.number(),
  reasoning: z.string(),
  key_emotions: z.array(z.string()),
  tone_indicators: z.array(z.string()),
  category_description: z.string(),
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

export async function POST(request: NextRequest) {
  try {
    console.log('\n📧 === GMAIL SENTIMENT ANALYSIS REQUEST STARTED ===')
    console.log(`⏰ Request time: ${new Date().toISOString()}`)

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`👤 User authenticated: ${user.id}`)

    const body = await request.json()
    const { maxEmails = 10, markAsRead = true } = body

    console.log(`📧 Max emails to analyze: ${maxEmails}`)
    console.log(`📖 Mark emails as read: ${markAsRead}`)

    // Initialize Gmail service
    console.log('📧 Initializing Gmail service...')
    const gmailService = new GmailService(user.id)
    console.log('✅ Gmail service initialized')

    // Check if user is authenticated with Gmail
    console.log('🔐 Checking Gmail authentication...')
    const isAuthenticated = await gmailService.isAuthenticated()
    console.log('🔐 Gmail authentication status:', isAuthenticated)

    if (!isAuthenticated) {
      console.error('❌ Not authenticated with Gmail')
      return NextResponse.json({
        error: 'Not authenticated with Gmail. Please authenticate first.',
        authUrl: await gmailService.authenticate()
      }, { status: 401 })
    }

    console.log('✅ Gmail authentication confirmed')

    // Fetch emails from Gmail
    console.log('📥 Fetching emails from Gmail...')
    const emails = await gmailService.listEmails(maxEmails)
    console.log(`📧 Retrieved ${emails.length} emails from Gmail`)

    if (emails.length === 0) {
      console.log('📭 No unread emails found')
      return NextResponse.json({
        success: true,
        message: 'No unread emails found to analyze',
        results: [],
        summary: {
          total_emails: 0,
          analyzed_emails: 0,
          failed_emails: 0
        }
      })
    }

    console.log('📋 Email details:', emails.map(email => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      snippet: email.snippet?.substring(0, 100) + '...'
    })))

    // Process emails for sentiment analysis
    const results = []
    let analyzedCount = 0
    let failedCount = 0

    for (const email of emails) {
      try {
        console.log(`\n📧 === ANALYZING EMAIL: ${email.subject} ===`)
        console.log(`📧 From: ${email.from}`)
        console.log(`📧 Email ID: ${email.id}`)

        // Prepare content for analysis
        const emailContent = email.body || email.snippet || ''
        const emailSubject = email.subject || 'No Subject'
        const senderEmail = email.from || 'Unknown'

        console.log(`📝 Content length: ${emailContent.length} characters`)

        // Skip very short content
        if (emailContent.length < 10) {
          console.log('⚠️ Skipping email with insufficient content')
          failedCount++
          continue
        }

        // Analyze sentiment using LLM
        console.log('🤖 Sending email to LLM for sentiment analysis...')
        const { text: analysisText } = await generateText({
          model: provider(model_name),
          messages: [
            {
              role: "user",
              content: `Analyze the sentiment and emotional tone of this email and categorize it into one of these FIXED categories:

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

Subject: ${emailSubject}
From: ${senderEmail}

Content:
${emailContent}

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
            },
          ],
        })

        console.log('📥 Received raw response from LLM:')
        console.log('--- RAW LLM OUTPUT START ---')
        console.log(analysisText)
        console.log('--- RAW LLM OUTPUT END ---')

        // Parse the AI response
        console.log('🔍 Parsing LLM response...')
        let parsedResponse
        try {
          parsedResponse = parseAIResponse(analysisText)
        } catch (parseError) {
          console.error('❌ Failed to parse AI response:', parseError)
          parsedResponse = {
            sentiment_category: "neutral",
            confidence_score: 0.5,
            reasoning: "Unable to parse AI response, using fallback analysis",
            key_emotions: ["uncertain"],
            tone_indicators: ["unclear"],
            category_description: "Fallback category description",
          }
        }

        // Validate against schema
        console.log('🔎 Validating against schema...')
        const validatedResponse = sentimentAnalysisSchema.parse(parsedResponse)

        console.log('✅ Schema validation passed')
        console.log('📊 Analysis result:', validatedResponse)

        // Save to database
        console.log('💾 Saving sentiment analysis to database...')
        const { data: sentimentRecord, error: dbError } = await supabase
          .from("email_sentiments")
          .insert({
            user_id: user.id,
            email_subject: emailSubject,
            email_content: emailContent,
            sender_email: senderEmail,
            sentiment_category: validatedResponse.sentiment_category,
            confidence_score: validatedResponse.confidence_score,
            reasoning: validatedResponse.reasoning,
            key_emotions: validatedResponse.key_emotions,
            tone_indicators: validatedResponse.tone_indicators,
            category_description: validatedResponse.category_description,
            gmail_message_id: email.id,
            gmail_thread_id: email.threadId,
          })
          .select()
          .single()

        if (dbError) {
          console.error("❌ Failed to save sentiment record:", dbError)
        } else {
          console.log(`✅ Sentiment record saved with ID: ${sentimentRecord.id}`)
        }

        // Mark email as read if requested
        if (markAsRead) {
          try {
            await gmailService.markAsRead(email.id)
          } catch (markError) {
            console.error(`⚠️ Failed to mark email as read: ${markError}`)
          }
        }

        // Create agent task record
        console.log('📝 Creating agent task record...')
        await supabase.from("agent_tasks").insert({
          user_id: user.id,
          task_type: "gmail_sentiment_analysis",
          task_status: "completed",
          task_data: {
            gmail_message_id: email.id,
            email_subject: emailSubject,
            sender_email: senderEmail,
          },
          result_data: {
            sentiment_category: validatedResponse.sentiment_category,
            confidence_score: validatedResponse.confidence_score,
            analysis_details: validatedResponse,
            processed_at: new Date().toISOString(),
          },
          completed_at: new Date().toISOString(),
        })

        console.log('✅ Agent task record created')

        results.push({
          email_id: email.id,
          subject: emailSubject,
          from: senderEmail,
          date: email.date,
          status: 'completed',
          sentiment_analysis: validatedResponse
        })

        analyzedCount++
        console.log(`✅ Successfully analyzed: ${emailSubject}`)

      } catch (error) {
        console.error(`\n❌ === FAILED TO ANALYZE EMAIL: ${email.subject} ===`)
        console.error('🔍 Error details:', error)

        failedCount++
        results.push({
          email_id: email.id,
          subject: email.subject,
          from: email.from,
          date: email.date,
          status: 'failed',
          error: error instanceof Error ? error.message : "Unknown error"
        })

        console.error(`❌ Failed to analyze: ${email.subject}`)
      }
    }

    const summary = {
      total_emails: emails.length,
      analyzed_emails: analyzedCount,
      failed_emails: failedCount
    }

    console.log(`\n📊 === GMAIL SENTIMENT ANALYSIS SUMMARY ===`)
    console.log(`📧 Total emails: ${summary.total_emails}`)
    console.log(`✅ Successfully analyzed: ${summary.analyzed_emails}`)
    console.log(`❌ Failed: ${summary.failed_emails}`)
    console.log('🏁 === GMAIL SENTIMENT ANALYSIS COMPLETE ===')

    return NextResponse.json({
      success: true,
      message: `Analyzed ${analyzedCount} out of ${emails.length} emails`,
      results,
      summary
    })

  } catch (error) {
    console.error('\n💥 === GMAIL SENTIMENT ANALYSIS ERROR ===')
    console.error('Error details:', error)
    console.error('❌ === REQUEST FAILED ===\n')
    return NextResponse.json(
      { error: 'Failed to analyze Gmail emails' },
      { status: 500 }
    )
  }
}
