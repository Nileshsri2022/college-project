import nodemailer from "nodemailer"

// Email configuration
const EMAIL_CONFIG = {
  from: "Birthday Reminder AI <nilesh.srivastava.51273@gmail.com>",
  fromName: "Birthday Reminder AI",
}

// Create transporter with Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || "nilesh.srivastava.51273@gmail.com",
      pass: process.env.SMTP_PASSWORD || "kjsblnozsetdvayh",
    },
    tls: {
      ciphers: 'SSLv3'
    }
  })
}

export async function sendBirthdayEmail(to: string, personName: string, message: string, senderName?: string) {
  try {
    console.log(`[v0] === NODEMAILER EMAIL SENDING START ===`)
    console.log(`[v0] Recipient: ${to}`)
    console.log(`[v0] Person Name: ${personName}`)
    console.log(`[v0] Message: ${message}`)
    console.log(`[v0] Sender Name: ${senderName}`)

    // Create transporter
    const transporter = createTransporter()

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

    console.log(`[v0] === SENDING EMAIL VIA NODEMAILER SMTP ===`)
    console.log(`[v0] From: ${EMAIL_CONFIG.from}`)
    console.log(`[v0] To: ${to}`)
    console.log(`[v0] Subject: ${subject}`)
    console.log(`[v0] SMTP Host: ${process.env.SMTP_HOST}`)
    console.log(`[v0] SMTP Port: ${process.env.SMTP_PORT}`)

    // Send email
    const emailResult = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to: to,
      subject: subject,
      text: textContent,
      html: htmlContent,
    })

    console.log(`[v0] === EMAIL SENT SUCCESSFULLY VIA NODEMAILER ===`)
    console.log(`[v0] Message ID: ${emailResult.messageId}`)
    console.log(`[v0] Service: Nodemailer SMTP`)

    return {
      success: true,
      messageId: emailResult.messageId,
      message: `Birthday email sent successfully to ${to}`,
      service: "Nodemailer",
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
    console.log(`[v0] === TESTING NODEMAILER EMAIL SERVICE ===`)
    console.log(`[v0] Service: Nodemailer SMTP`)
    console.log(`[v0] From Email: ${EMAIL_CONFIG.from}`)
    console.log(`[v0] SMTP Host: ${process.env.SMTP_HOST}`)
    console.log(`[v0] SMTP Port: ${process.env.SMTP_PORT}`)
    console.log(`[v0] SMTP User: ${process.env.SMTP_USER}`)

    // Create transporter
    const transporter = createTransporter()

    // Verify connection configuration
    await transporter.verify()

    console.log(`[v0] === SMTP CONNECTION VERIFIED ===`)

    // Send test email
    const testResult = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to: process.env.SMTP_USER || "nilesh.srivastava.51273@gmail.com", // Send test to user's email
      subject: "🧪 Nodemailer Email Service Test",
      text: "This is a test email to verify the Nodemailer SMTP service is working correctly.",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #4CAF50;">✅ Nodemailer Email Service Test</h2>
          <p>This is a test email to verify the Nodemailer SMTP service is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Service:</strong> Nodemailer SMTP</p>
          <p><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</p>
          <p><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</p>
          <p><strong>From:</strong> ${EMAIL_CONFIG.from}</p>
        </div>
      `,
    })

    console.log("[v0] === NODEMAILER EMAIL SERVICE TEST SUCCESSFUL ===")
    console.log(`[v0] Test Message ID: ${testResult.messageId}`)

    return {
      success: true,
      message: "Nodemailer SMTP service connection verified successfully",
      messageId: testResult.messageId,
      service: "Nodemailer",
    }
  } catch (error) {
    console.error("[v0] === NODEMAILER EMAIL SERVICE TEST FAILED ===")
    console.error("[v0] Test failed:", error)

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Nodemailer SMTP service test failed",
    }
  }
}
