import { NextResponse } from "next/server"
import { processNotificationTasks } from "@/lib/notification-service"

export const runtime = "nodejs"

export async function POST() {
  const result = await processNotificationTasks()

  if (result.success) {
    return NextResponse.json(result)
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
}
