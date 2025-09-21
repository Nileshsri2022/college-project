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

    const { data: images, error } = await supabase
      .from("image_captions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get processing statistics
    const stats =
      images?.reduce(
        (acc, image) => {
          acc[image.processing_status] = (acc[image.processing_status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return NextResponse.json({
      images,
      stats,
      total: images?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching images:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
