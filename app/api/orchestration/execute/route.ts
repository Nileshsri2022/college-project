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
    const { workflow_id, input_data } = body

    // Get the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("agent_workflows")
      .select("*")
      .eq("id", workflow_id)
      .eq("user_id", user.id)
      .single()

    if (workflowError || !workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }

    if (!workflow.is_active) {
      return NextResponse.json({ error: "Workflow is not active" }, { status: 400 })
    }

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from("workflow_executions")
      .insert({
        user_id: user.id,
        workflow_id: workflow.id,
        status: "running",
        input_data,
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (executionError) {
      return NextResponse.json({ error: executionError.message }, { status: 500 })
    }

    // Execute workflow steps
    const results = []
    let currentData = input_data

    try {
      for (const step of workflow.workflow_steps) {
        const stepResult = await executeWorkflowStep(step, currentData, user.id, supabase)
        results.push(stepResult)

        if (stepResult.status === "failed") {
          throw new Error(`Step ${step.name} failed: ${stepResult.error}`)
        }

        // Pass output to next step
        currentData = { ...currentData, ...stepResult.output }
      }

      // Update execution as completed
      await supabase
        .from("workflow_executions")
        .update({
          status: "completed",
          output_data: currentData,
          step_results: results,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)

      return NextResponse.json({
        execution_id: execution.id,
        status: "completed",
        results,
        output_data: currentData,
      })
    } catch (error) {
      // Update execution as failed
      await supabase
        .from("workflow_executions")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          step_results: results,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)

      return NextResponse.json(
        {
          execution_id: execution.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
          results,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error executing workflow:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function executeWorkflowStep(step: any, inputData: any, userId: string, supabase: any) {
  const stepResult = {
    step_name: step.name,
    step_type: step.type,
    status: "running" as "running" | "completed" | "failed",
    started_at: new Date().toISOString(),
    output: {},
    error: null as string | null,
  }

  try {
    switch (step.type) {
      case "birthday_check":
        const birthdayResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/birthdays/check-today`, {
          method: "POST",
        })
        const birthdayData = await birthdayResponse.json()
        stepResult.output = birthdayData
        break

      case "sentiment_analysis":
        if (!inputData.email_content) {
          throw new Error("Email content required for sentiment analysis")
        }
        const sentimentResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sentiment/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email_content: inputData.email_content,
            email_subject: inputData.email_subject,
            sender_email: inputData.sender_email,
          }),
        })
        const sentimentData = await sentimentResponse.json()
        stepResult.output = sentimentData
        break

      case "send_notifications":
        const notificationResponse = await fetch(
          `${process.env.NEXT_PUBLIC_SITE_URL}/api/birthdays/send-notifications`,
          {
            method: "POST",
          },
        )
        const notificationData = await notificationResponse.json()
        stepResult.output = notificationData
        break

      case "delay":
        const delayMs = step.config?.delay_seconds ? step.config.delay_seconds * 1000 : 5000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        stepResult.output = { delayed_for: delayMs }
        break

      case "conditional":
        const condition = step.config?.condition
        const conditionResult = evaluateCondition(condition, inputData)
        stepResult.output = { condition_met: conditionResult }

        if (!conditionResult && step.config?.skip_on_false) {
          stepResult.status = "skipped"
          return stepResult
        }
        break

      default:
        throw new Error(`Unknown step type: ${step.type}`)
    }

    stepResult.status = "completed"
    stepResult.completed_at = new Date().toISOString()
  } catch (error) {
    stepResult.status = "failed"
    stepResult.error = error instanceof Error ? error.message : "Unknown error"
    stepResult.completed_at = new Date().toISOString()
  }

  return stepResult
}

function evaluateCondition(condition: string, data: any): boolean {
  try {
    // Simple condition evaluation - in production, use a proper expression evaluator
    // For now, support basic conditions like "data.count > 0"
    const func = new Function("data", `return ${condition}`)
    return func(data)
  } catch {
    return false
  }
}
