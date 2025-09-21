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
        console.log(`[v0] Processing birthday for ${birthday.person_name}...`)
        console.log(`[v0] Birthday data:`, {
          id: birthday.id,
          person_name: birthday.person_name,
          email: birthday.email,
          phone: birthday.phone,
          notification_preference: birthday.notification_preference,
          profile_email: birthday.profile_email,
          user_id: birthday.user_id,
        })

        const personalizedMessage = await generateBirthdayMessage(birthday.person_name)
        const fullMessage = `Happy Birthday ${birthday.person_name}! ${personalizedMessage}`
        console.log(`[v0] Generated message for ${birthday.person_name}: ${fullMessage}`)

        const userEmail = birthday.profile_email || "unknown@email.com"
        console.log(`[v0] User email: ${userEmail}, Recipient email: ${birthday.email}`)

        console.log(`[v0] Creating agent task for ${birthday.person_name}...`)
        const taskData = {
          birthday_id: birthday.id,
          person_name: birthday.person_name,
          message: fullMessage,
          notification_preference: birthday.notification_preference,
          recipient_email: birthday.email,
          recipient_phone: birthday.phone,
          user_email: userEmail,
        }
        console.log(`[v0] Task data:`, taskData)

        // Create agent task for sending notification
        const { data: task, error: taskError } = await supabase
          .from("agent_tasks")
          .insert({
            user_id: birthday.user_id,
            task_type: "birthday_reminder",
            task_status: "pending",
            task_data: taskData,
            scheduled_for: new Date().toISOString(),
          })
          .select()
          .single()

        if (taskError) {
          console.error(`[v0] Error creating task for ${birthday.person_name}:`, taskError)
          continue
        }

        console.log(`[v0] Successfully created task ${task.id} for ${birthday.person_name}`)

        results.push({
          birthday: birthday.person_name,
          message: fullMessage,
          task_id: task.id,
          notification_method: birthday.notification_preference,
        })
      } catch (messageError) {
        console.error(`[v0] Error generating message for ${birthday.person_name}:`, messageError)
        const fallbackMessage = `Happy Birthday ${birthday.person_name}! Wishing you a wonderful day filled with joy and celebration!`
        const userEmail = birthday.profile_email || "unknown@email.com"

        const { data: task } = await supabase
          .from("agent_tasks")
          .insert({
            user_id: birthday.user_id,
            task_type: "birthday_reminder",
            task_status: "pending",
            task_data: {
              birthday_id: birthday.id,
              person_name: birthday.person_name,
              message: fallbackMessage,
              notification_preference: birthday.notification_preference,
              recipient_email: birthday.email,
              recipient_phone: birthday.phone,
              user_email: userEmail,
            },
            scheduled_for: new Date().toISOString(),
          })
          .select()
          .single()

        results.push({
          birthday: birthday.person_name,
          message: fallbackMessage,
          task_id: task?.id,
          notification_method: birthday.notification_preference,
          fallback: true,
        })
      }
    }

    if (results.length > 0) {
      console.log(`[v0] Auto-triggering notification sending for ${results.length} birthday tasks`)

      try {
        const notificationResult = await processNotificationTasks()

        if (notificationResult.success) {
          console.log(`[v0] Auto-triggered notifications successfully:`, notificationResult)
        } else {
          console.error(`[v0] Notification processing failed:`, notificationResult.error)
        }
      } catch (autoSendError) {
        console.error(`[v0] Failed to auto-trigger notifications:`, autoSendError)
      }
    } else {
      console.log("[v0] No birthday tasks created, skipping auto-trigger")
    }

    console.log(`[v0] Birthday check process completed. Results:`, results)
    return NextResponse.json({
      message: `Found ${todaysBirthdays?.length || 0} birthdays today${results.length > 0 ? " and auto-triggered email sending" : ""}`,
      results,
    })
  } catch (error) {
    console.error("[v0] Error in birthday check:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
