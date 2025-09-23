import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    console.log("[BIRTHDAY_SCHEDULER] Manual trigger for birthday email processing")

    // Call the process-scheduled endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/birthdays/process-scheduled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[BIRTHDAY_SCHEDULER] Manual trigger failed:", data)
      return NextResponse.json({
        error: "Failed to process scheduled birthdays",
        details: data
      }, { status: response.status })
    }

    console.log("[BIRTHDAY_SCHEDULER] Manual trigger completed successfully:", data)

    return NextResponse.json({
      message: "Birthday email processing completed",
      ...data
    })

  } catch (error) {
    console.error("[BIRTHDAY_SCHEDULER] Manual trigger error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

// GET endpoint to check scheduler status
export async function GET() {
  try {
    const supabase = await createClient()

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    // Count pending birthdays for today
    const { count: pendingCount, error: pendingError } = await supabase
      .from("birthdays")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("email_status", "pending")
      .gte("birth_date", `${todayString}T00:00:00.000Z`)
      .lt("birth_date", `${todayString}T23:59:59.999Z`)

    if (pendingError) {
      console.error("[BIRTHDAY_SCHEDULER] Error checking pending birthdays:", pendingError)
    }

    // Count failed birthdays that could be retried
    const { count: failedCount, error: failedError } = await supabase
      .from("birthdays")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true)
      .eq("email_status", "failed")

    if (failedError) {
      console.error("[BIRTHDAY_SCHEDULER] Error checking failed birthdays:", failedError)
    }

    return NextResponse.json({
      status: "active",
      today: todayString,
      pending_birthdays: pendingCount || 0,
      failed_birthdays: failedCount || 0,
      next_run: "12:00 AM daily",
      message: "Birthday scheduler is running and monitoring for birthdays"
    })

  } catch (error) {
    console.error("[BIRTHDAY_SCHEDULER] Status check error:", error)
    return NextResponse.json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
