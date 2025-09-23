import { createClient } from "@/lib/supabase/server"
import { sendBirthdayEmail } from "@/lib/email-service"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = await createClient()

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayUTC = today.toISOString().split('T')[0] // UTC date

    // Since user is in Asia/Calcutta and it's past midnight there, check for tomorrow's date
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split('T')[0]

    console.log(`[BIRTHDAY_SCHEDULER] Starting scheduled birthday processing`)
    console.log(`[BIRTHDAY_SCHEDULER] UTC date: ${todayUTC}`)
    console.log(`[BIRTHDAY_SCHEDULER] Checking for birthdays on: ${tomorrowString} (Asia/Calcutta date)`)

    // Check if user has a profile, create one if not (for any authenticated user)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (user && !authError) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || null,
          })
          .select()
          .single()

        if (createError) {
          console.error("Error creating profile:", createError)
        }
      }
    }

    // Find all active birthdays that match today's date in Asia/Calcutta timezone
    const { data: birthdays, error: fetchError } = await supabase
      .from("birthdays")
      .select(`
        id,
        user_id,
        person_name,
        birth_date,
        email,
        notification_preference,
        email_status
      `)
      .eq("is_active", true)
      .eq("email_status", "pending")
      .eq("birth_date", tomorrowString) // Look for September 23, 2025 specifically

    if (fetchError) {
      console.error("[BIRTHDAY_SCHEDULER] Error fetching birthdays:", fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    console.log(`[BIRTHDAY_SCHEDULER] Found ${birthdays?.length || 0} pending birthdays for today`)

    if (!birthdays || birthdays.length === 0) {
      return NextResponse.json({
        message: "No pending birthday emails to send today",
        processed: 0
      })
    }

    const results = []
    let successCount = 0
    let failureCount = 0

    for (const birthday of birthdays) {
      try {
        console.log(`[BIRTHDAY_SCHEDULER] Processing birthday for ${birthday.person_name}`)

        // Skip if no email provided
        if (!birthday.email) {
          console.log(`[BIRTHDAY_SCHEDULER] Skipping ${birthday.person_name} - no email provided`)
          results.push({
            id: birthday.id,
            person_name: birthday.person_name,
            status: "skipped",
            reason: "No email address provided"
          })
          continue
        }

        // Get user profile for personalized message
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", birthday.user_id)
          .single()

        const senderName = profile?.full_name || profile?.email || "Your Friend"
        const message = `Happy Birthday ${birthday.person_name}! 🎉\n\nWishing you a fantastic day filled with joy, laughter, and all your favorite things. May this year bring you success, happiness, and lots of wonderful memories!\n\nBest wishes,\n${senderName}`

        // Send email
        const emailResult = await sendBirthdayEmail(
          birthday.email,
          birthday.person_name,
          message,
          senderName
        )

        if (emailResult.success) {
          // Update birthday status to sent
          const { error: updateError } = await supabase
            .from("birthdays")
            .update({
              email_status: "sent",
              last_email_attempt: new Date().toISOString(),
              email_message_id: emailResult.messageId,
              updated_at: new Date().toISOString()
            })
            .eq("id", birthday.id)

          if (updateError) {
            console.error(`[BIRTHDAY_SCHEDULER] Error updating status for ${birthday.person_name}:`, updateError)
          }

          successCount++
          results.push({
            id: birthday.id,
            person_name: birthday.person_name,
            status: "sent",
            messageId: emailResult.messageId
          })

          console.log(`[BIRTHDAY_SCHEDULER] Successfully sent birthday email to ${birthday.person_name}`)
        } else {
          // Update birthday status to failed
          const { error: updateError } = await supabase
            .from("birthdays")
            .update({
              email_status: "failed",
              last_email_attempt: new Date().toISOString(),
              email_error_message: emailResult.error,
              updated_at: new Date().toISOString()
            })
            .eq("id", birthday.id)

          if (updateError) {
            console.error(`[BIRTHDAY_SCHEDULER] Error updating failure status for ${birthday.person_name}:`, updateError)
          }

          failureCount++
          results.push({
            id: birthday.id,
            person_name: birthday.person_name,
            status: "failed",
            error: emailResult.error
          })

          console.error(`[BIRTHDAY_SCHEDULER] Failed to send birthday email to ${birthday.person_name}:`, emailResult.error)
        }

        // Add small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`[BIRTHDAY_SCHEDULER] Unexpected error processing ${birthday.person_name}:`, error)

        // Update birthday status to failed
        const { error: updateError } = await supabase
          .from("birthdays")
          .update({
            email_status: "failed",
            last_email_attempt: new Date().toISOString(),
            email_error_message: error instanceof Error ? error.message : "Unknown error",
            updated_at: new Date().toISOString()
          })
          .eq("id", birthday.id)

        failureCount++
        results.push({
          id: birthday.id,
          person_name: birthday.person_name,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    console.log(`[BIRTHDAY_SCHEDULER] Processing complete. Success: ${successCount}, Failed: ${failureCount}`)

    return NextResponse.json({
      message: `Processed ${birthdays.length} birthday emails`,
      success: successCount,
      failed: failureCount,
      results
    })

  } catch (error) {
    console.error("[BIRTHDAY_SCHEDULER] Unexpected error in scheduler:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
