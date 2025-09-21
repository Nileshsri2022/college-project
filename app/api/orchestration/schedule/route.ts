import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

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
    const { workflow_id, schedule_type, schedule_config } = body

    // Validate workflow exists and belongs to user
    const { data: workflow, error: workflowError } = await supabase
      .from("agent_workflows")
      .select("*")
      .eq("id", workflow_id)
      .eq("user_id", user.id)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    // Create scheduled task
    const { data: scheduledTask, error } = await supabase
      .from("agent_tasks")
      .insert({
        user_id: user.id,
        task_type: "scheduled_workflow",
        task_status: "pending",
        task_data: {
          workflow_id,
          schedule_type,
          schedule_config,
        },
        scheduled_for: calculateNextRun(schedule_type, schedule_config),
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      message: "Workflow scheduled successfully",
      scheduled_task: scheduledTask,
    })
  } catch (error) {
    console.error("Error scheduling workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function calculateNextRun(scheduleType: string, config: any): string {
  const now = new Date()

  switch (scheduleType) {
    case "daily":
      const dailyTime = config.time || "09:00"
      const [hours, minutes] = dailyTime.split(":").map(Number)
      const nextDaily = new Date(now)
      nextDaily.setHours(hours, minutes, 0, 0)

      if (nextDaily <= now) {
        nextDaily.setDate(nextDaily.getDate() + 1)
      }
      return nextDaily.toISOString()

    case "weekly":
      const weeklyDay = config.day_of_week || 1 // Monday = 1
      const weeklyTime = config.time || "09:00"
      const [wHours, wMinutes] = weeklyTime.split(":").map(Number)

      const nextWeekly = new Date(now)
      const daysUntilTarget = (weeklyDay - now.getDay() + 7) % 7
      nextWeekly.setDate(now.getDate() + (daysUntilTarget || 7))
      nextWeekly.setHours(wHours, wMinutes, 0, 0)

      return nextWeekly.toISOString()

    case "monthly":
      const monthlyDay = config.day_of_month || 1
      const monthlyTime = config.time || "09:00"
      const [mHours, mMinutes] = monthlyTime.split(":").map(Number)

      const nextMonthly = new Date(now)
      nextMonthly.setDate(monthlyDay)
      nextMonthly.setHours(mHours, mMinutes, 0, 0)

      if (nextMonthly <= now) {
        nextMonthly.setMonth(nextMonthly.getMonth() + 1)
      }
      return nextMonthly.toISOString()

    case "interval":
      const intervalMinutes = config.interval_minutes || 60
      const nextInterval = new Date(now.getTime() + intervalMinutes * 60 * 1000)
      return nextInterval.toISOString()

    default:
      // Default to 1 hour from now
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
  }
}
