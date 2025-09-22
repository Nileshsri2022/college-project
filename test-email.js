const nodemailer = require('nodemailer');

// Test Nodemailer configuration
async function testEmail() {
  try {
    console.log('🧪 Testing Nodemailer SMTP configuration...');

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'nilesh.srivastava.51273@gmail.com',
        pass: 'kjsblnozsetdvayh',
      },
      tls: {
        ciphers: 'SSLv3'
      }
    });

    // Verify connection
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    // Send test email
    console.log('📧 Sending test email...');
    const result = await transporter.sendMail({
      from: 'Birthday Reminder AI <nilesh.srivastava.51273@gmail.com>',
      to: 'nilesh.srivastava.51273@gmail.com',
      subject: '🧪 Nodemailer Test - Migration Complete',
      text: 'This is a test email to verify that Nodemailer is working correctly after migrating from Resend.',
      html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #4CAF50;">✅ Nodemailer Migration Test</h2>
        <p>This email confirms that the migration from Resend to Nodemailer with Gmail SMTP is working correctly!</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Service:</strong> Nodemailer SMTP</p>
        <p><strong>SMTP Host:</strong> smtp.gmail.com</p>
        <p><strong>SMTP Port:</strong> 587</p>
      </div>`,
    });

    console.log('✅ Test email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('🎉 Nodemailer integration is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testEmail();
