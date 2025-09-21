import { Resend } from "resend"

// Initialize Resend with the provided API key
const resend = new Resend("re_AKJXgeuj_5J94kURGE6pbV4KU6ZifxQeg")

// Email configuration
const EMAIL_CONFIG = {
  from: "Birthday Reminder AI <onboarding@resend.dev>", // Using Resend's default domain
  fromName: "Birthday Reminder AI",
}

export async function sendBirthdayEmail(to: string, personName: string, message: string, senderName?: string) {
  try {
    console.log(`[v0] === RESEND EMAIL SENDING START ===`)
    console.log(`[v0] Recipient: ${to}`)
    console.log(`[v0] Person Name: ${personName}`)
    console.log(`[v0] Message: ${message}`)
    console.log(`[v0] Sender Name: ${senderName}`)

    // Create email content
    const subject = `🎉 Birthday Reminder - ${personName}`
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎂 Birthday Reminder!</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; border-left: 4px solid #667eea;">
          <p style="font-size: 18px; color: #333; line-height: 1.6; margin: 0;">
            ${message}
          </p>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; text-align: center;">
          <p style="margin: 0; color: #1976d2; font-size: 14px;">
            🎈 Don't forget to wish ${personName} a happy birthday! 🎈
          </p>
        </div>
        
        <div style="margin-top: 30px; text-align: center; color: #666; font-size: 12px;">
          <p>This is an automated birthday reminder from your AI Assistant</p>
          ${senderName ? `<p>Sent on behalf of ${senderName}</p>` : ""}
        </div>
      </div>
    `

    const textContent = `Birthday Reminder - ${personName}\n\n${message}\n\nDon't forget to wish ${personName} a happy birthday!`

    console.log(`[v0] === SENDING EMAIL VIA RESEND API ===`)
    console.log(`[v0] From: ${EMAIL_CONFIG.from}`)
    console.log(`[v0] To: ${to}`)
    console.log(`[v0] Subject: ${subject}`)

    const emailResult = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      subject: subject,
      text: textContent,
      html: htmlContent,
    })

    if (emailResult.data) {
      console.log(`[v0] === EMAIL SENT SUCCESSFULLY VIA RESEND ===`)
      console.log(`[v0] Message ID: ${emailResult.data.id}`)
      console.log(`[v0] Service: Resend`)

      return {
        success: true,
        messageId: emailResult.data.id,
        message: `Birthday email sent successfully to ${to}`,
        service: "Resend",
      }
    } else {
      throw new Error(emailResult.error?.message || "Resend API failed")
    }
  } catch (error) {
    console.error(`[v0] === EMAIL SENDING FAILED ===`)
    console.error(`[v0] Error details:`, error)
    console.error(`[v0] Error message:`, error instanceof Error ? error.message : "Unknown error")

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: `Failed to send birthday email to ${to}`,
    }
  }
}

export async function testEmailConnection() {
  try {
    console.log(`[v0] === TESTING RESEND EMAIL SERVICE ===`)
    console.log(`[v0] Service: Resend API`)
    console.log(`[v0] From Email: ${EMAIL_CONFIG.from}`)

    const testResult = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: ["nilesh.srivastava.51273@gmail.com"], // Send test to user's email
      subject: "🧪 Resend Email Service Test",
      text: "This is a test email to verify the Resend email service is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">✅ Resend Email Service Test</h2>
          <p>This is a test email to verify the Resend email service is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Service:</strong> Resend API</p>
          <p><strong>API Key:</strong> re_AKJXgeuj_5J94kURGE6pbV4KU6ZifxQeg (first 20 chars)</p>
        </div>
      `,
    })

    if (testResult.data) {
      console.log("[v0] === RESEND EMAIL SERVICE TEST SUCCESSFUL ===")
      console.log(`[v0] Test Message ID: ${testResult.data.id}`)

      return {
        success: true,
        message: "Resend email service connection verified successfully",
        messageId: testResult.data.id,
        service: "Resend",
      }
    } else {
      throw new Error(testResult.error?.message || "Resend test failed")
    }
  } catch (error) {
    console.error("[v0] === RESEND EMAIL SERVICE TEST FAILED ===")
    console.error("[v0] Test failed:", error)

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Resend email service test failed",
    }
  }
}
