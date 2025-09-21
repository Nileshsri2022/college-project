import { NextResponse } from "next/server"
import { testEmailConnection, sendBirthdayEmail } from "@/lib/email-service"

export const runtime = "nodejs"

export async function POST() {
  try {
    console.log("[v0] Testing email connection...")

    // First test the connection
    const connectionTest = await testEmailConnection()

    if (!connectionTest.success) {
      return NextResponse.json(
        {
          success: false,
          message: "SMTP connection failed",
          error: connectionTest.error,
        },
        { status: 500 },
      )
    }

    // Send a test birthday email
    const testResult = await sendBirthdayEmail(
      "nilesh.srivastava.51273@gmail.com", // Send to the same email for testing
      "Test Person",
      "This is a test birthday message to verify that the email system is working correctly! 🎉",
      "AI Assistant Test",
    )

    return NextResponse.json({
      success: testResult.success,
      message: testResult.message,
      messageId: testResult.success ? testResult.messageId : undefined,
      error: testResult.success ? undefined : testResult.error,
    })
  } catch (error) {
    console.error("[v0] Email test failed:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Email test failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
