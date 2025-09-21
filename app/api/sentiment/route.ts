import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: sentiments, error } = await supabase
      .from("email_sentiments")
      .select("*")
      .eq("user_id", user.id)
      .order("analyzed_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get sentiment statistics
    const stats =
      sentiments?.reduce(
        (acc, sentiment) => {
          acc[sentiment.sentiment_category] = (acc[sentiment.sentiment_category] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return NextResponse.json({
      sentiments,
      stats,
      total: sentiments?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching sentiments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
