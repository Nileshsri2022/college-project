import { createClient } from "@/lib/supabase/server"
import { sendBirthdayEmail } from "@/lib/email-service"

export async function processNotificationTasks() {
  try {
    console.log("[v0] === NOTIFICATION PROCESSING START ===")
    const supabase = await createClient()

    // Get pending birthday reminder tasks
    console.log("[v0] Fetching pending birthday reminder tasks...")
    const { data: pendingTasks, error } = await supabase
      .from("agent_tasks")
      .select("*")
      .eq("task_type", "birthday_reminder")
      .eq("task_status", "pending")

    if (error) {
      console.error("[v0] Error fetching pending tasks:", error)
      throw new Error(error.message)
    }

    console.log(`[v0] Found ${pendingTasks?.length || 0} pending birthday tasks`)
    if (pendingTasks && pendingTasks.length > 0) {
      console.log(
        "[v0] Pending tasks details:",
        pendingTasks.map((t) => ({
          id: t.id,
          person_name: t.task_data?.person_name,
          notification_preference: t.task_data?.notification_preference,
          recipient_email: t.task_data?.recipient_email,
          user_email: t.task_data?.user_email,
        })),
      )
    }

    const results = []

    for (const task of pendingTasks || []) {
      try {
        console.log(`[v0] === PROCESSING TASK ${task.id} ===`)
        console.log(`[v0] Task data:`, task.task_data)

        // Update task status to running
        console.log(`[v0] Updating task ${task.id} status to running...`)
        await supabase
          .from("agent_tasks")
          .update({
            task_status: "running",
            started_at: new Date().toISOString(),
          })
          .eq("id", task.id)

        const taskData = task.task_data
        let notificationSent = false
        let errorMessage = null
        const sentMethods = []

        console.log(`[v0] Notification preference: ${taskData.notification_preference}`)

        if (taskData.notification_preference === "email" || taskData.notification_preference === "both") {
          try {
            console.log(`[v0] Attempting to send email notification...`)
            const recipientEmail = taskData.recipient_email || taskData.user_email
            console.log(`[v0] Email recipient: ${recipientEmail}`)

            const emailResult = await sendBirthdayEmail(
              recipientEmail,
              taskData.person_name,
              taskData.message,
              "AI Assistant",
            )

            console.log(`[v0] Email result:`, emailResult)

            if (emailResult.success) {
              console.log(`[v0] Email sent successfully: ${emailResult.messageId}`)
              notificationSent = true
              sentMethods.push("email")
            } else {
              throw new Error(emailResult.error || "Email sending failed")
            }
          } catch (emailError) {
            console.error(`[v0] Email sending failed for task ${task.id}:`, emailError)
            errorMessage = `Email failed: ${emailError}`
          }
        }

        // Send WhatsApp notification (still simulated for now)
        if (taskData.notification_preference === "whatsapp" || taskData.notification_preference === "both") {
          try {
            console.log(`[v0] Sending WhatsApp notification to ${taskData.recipient_phone}`)
            console.log(`[v0] WhatsApp message: ${taskData.message}`)

            notificationSent = true
            sentMethods.push("whatsapp")
          } catch (whatsappError) {
            console.error(`[v0] WhatsApp sending failed for task ${task.id}:`, whatsappError)
            errorMessage = errorMessage
              ? `${errorMessage}, WhatsApp failed: ${whatsappError}`
              : `WhatsApp failed: ${whatsappError}`
          }
        }

        // Update task status
        const finalStatus = notificationSent ? "completed" : "failed"
        console.log(`[v0] Updating task ${task.id} to final status: ${finalStatus}`)

        await supabase
          .from("agent_tasks")
          .update({
            task_status: finalStatus,
            completed_at: new Date().toISOString(),
            error_message: errorMessage,
            result_data: {
              notification_sent: notificationSent,
              methods_used: taskData.notification_preference,
              methods_sent: sentMethods,
              sent_at: new Date().toISOString(),
            },
          })
          .eq("id", task.id)

        console.log(`[v0] Task ${task.id} completed with status: ${finalStatus}`)

        results.push({
          task_id: task.id,
          person_name: taskData.person_name,
          status: finalStatus,
          notification_sent: notificationSent,
          methods_sent: sentMethods,
          error: errorMessage,
        })
      } catch (taskError) {
        console.error(`[v0] Error processing task ${task.id}:`, taskError)

        // Mark task as failed
        await supabase
          .from("agent_tasks")
          .update({
            task_status: "failed",
            completed_at: new Date().toISOString(),
            error_message: `Task processing failed: ${taskError}`,
          })
          .eq("id", task.id)

        results.push({
          task_id: task.id,
          status: "failed",
          error: `Task processing failed: ${taskError}`,
        })
      }
    }

    console.log(`[v0] === NOTIFICATION PROCESSING COMPLETE ===`)
    console.log(`[v0] Processed ${pendingTasks?.length || 0} birthday reminder tasks`)
    console.log(`[v0] Final results:`, results)

    return {
      success: true,
      message: `Processed ${pendingTasks?.length || 0} birthday reminder tasks`,
      results,
    }
  } catch (error) {
    console.error(`[v0] === NOTIFICATION PROCESSING ERROR ===`)
    console.error(`[v0] Error in process notifications:`, error)
    return {
      success: false,
      error: `Internal server error: ${error}`,
      results: [],
    }
  }
}
