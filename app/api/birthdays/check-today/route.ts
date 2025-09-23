import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { generateText } from "ai"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import { processNotificationTasks } from "@/lib/notification-service"
export const runtime = "nodejs"
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

const generateBirthdayMessage = async (name: string): Promise<string> => {
  try {
    const { text } = await generateText({
      model: provider(model_name),
      prompt: `Generate a warm, personalized birthday message for someone named ${name}. Keep it friendly, positive, and around 2-3 sentences. Make it feel genuine and heartfelt.`,
      maxOutputTokens: 100,
    })
    return text.trim()
  } catch (error) {
    console.error("Error generating AI message:", error)
    // Fallback to static messages
    const messages = [
      `May your special day be filled with happiness, laughter, and all your favorite things!`,
      `Wishing you a year ahead filled with joy, success, and wonderful memories!`,
      `Hope your birthday is as amazing as you are! Here's to another year of adventures!`,
      `May this new year of life bring you endless opportunities and beautiful moments!`,
      `Sending you warm wishes for a birthday that's as special and wonderful as you!`,
    ]
    const messageIndex = name.length % messages.length
    return messages[messageIndex]
  }
}

export async function POST() {
  try {
    console.log("[v0] Starting birthday check process...")
    const supabase = await createClient()

    console.log("[v0] Calling get_todays_birthdays RPC function...")
    const { data: todaysBirthdays, error } = await supabase.rpc("get_todays_birthdays")

    if (error) {
      console.error("[v0] Error fetching birthdays:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[v0] Found ${todaysBirthdays?.length || 0} birthdays today:`, todaysBirthdays)
    const results = []

    for (const birthday of todaysBirthdays || []) {
      try {
        // Generate a preview message (but don't send it)
        const personalizedMessage = await generateBirthdayMessage(birthday.person_name)
        const fullMessage = `Happy Birthday ${birthday.person_name}! ${personalizedMessage}`

        const userEmail = birthday.profile_email || "unknown@email.com"

        // Single consolidated log per birthday
        console.log(`[v0] Birthday found: ${birthday.person_name} (${birthday.email}) - Message: "${fullMessage.substring(0, 50)}..." [LOGGED ONLY]`)

        results.push({
          birthday: birthday.person_name,
          message: fullMessage,
          notification_method: birthday.notification_preference,
          status: "logged_only", // Indicate this was only logged, not sent
          note: "Use 'Send Pending Notifications' to actually send this message"
        })
      } catch (messageError) {
        console.error(`[v0] Error generating preview message for ${birthday.person_name}:`, messageError)
        const fallbackMessage = `Happy Birthday ${birthday.person_name}! Wishing you a wonderful day filled with joy and celebration!`

        console.log(`[v0] Birthday found: ${birthday.person_name} (fallback message) [LOGGED ONLY]`)

        results.push({
          birthday: birthday.person_name,
          message: fallbackMessage,
          notification_method: birthday.notification_preference,
          status: "logged_only",
          fallback: true,
          note: "Use 'Send Pending Notifications' to actually send this message"
        })
      }
    }

    console.log(`[v0] Birthday check process completed. Found ${results.length} birthdays (LOGGED ONLY - no emails sent)`)
    return NextResponse.json({
      message: `Found ${todaysBirthdays?.length || 0} birthdays today (logged only - no emails sent)`,
      results,
      note: "Use 'Send Pending Notifications' button to actually send birthday emails"
    })
  } catch (error) {
    console.error("[v0] Error in birthday check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
