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

    const { data: tasks, error } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get task statistics
    const stats =
      tasks?.reduce(
        (acc, task) => {
          acc[task.task_status] = (acc[task.task_status] || 0) + 1
          return acc
        },
        {} as Record<string, number>,
      ) || {}

    return NextResponse.json({
      tasks,
      stats,
      total: tasks?.length || 0,
    })
  } catch (error) {
    console.error("Error fetching agent tasks:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
