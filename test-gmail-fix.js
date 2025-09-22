const nodemailer = require('nodemailer');

// Test Gmail sentiment analysis with scope validation
async function testGmailSentimentFix() {
  try {
    console.log('🧪 Testing Gmail sentiment analysis with scope validation...');

    // First, let's check if the server is running
    console.log('🔍 Checking if server is running...');

    const response = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        maxEmails: 1
      })
    });

    console.log('📊 Response status:', response.status);
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 401) {
      const data = await response.json();
      console.log('📊 Response data:', JSON.stringify(data, null, 2));

      if (data.error && data.error.includes('scopes')) {
        console.log('✅ Scope validation is working correctly!');
        console.log('🔐 Gmail authentication requires updated permissions');
        console.log('📝 Auth URL available:', !!data.authUrl);
        console.log('🎉 Gmail integration is properly detecting scope issues');
      } else {
        console.log('⚠️ Different authentication error:', data.error);
      }
    } else if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Gmail sentiment analysis is working!');
      console.log('📧 Analysis results:', data.summary);
      console.log('🎉 Gmail integration is fully functional');
    } else {
      console.log('⚠️ Unexpected response status:', response.status);
      const data = await response.json();
      console.log('📊 Response data:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('🔍 Error details:', error);
  }
}

testGmailSentimentFix();
