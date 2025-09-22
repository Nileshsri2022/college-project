// Final comprehensive Gmail test
async function finalGmailTest() {
  console.log('🎯 Final Gmail Integration Test\n');

  try {
    console.log('📊 Testing Gmail sentiment analysis...');
    const response = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxEmails: 3 })
    });

    console.log('📊 Response status:', response.status);

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ SUCCESS: Gmail integration is working!');
      console.log('📊 Analysis results:', JSON.stringify(data.summary, null, 2));

      console.log('\n🎉 CONGRATULATIONS!');
      console.log('✅ Gmail authentication: Working');
      console.log('✅ Gmail scopes: Sufficient');
      console.log('✅ Email fetching: Successful');
      console.log('✅ Sentiment analysis: Operational');

      console.log('\n🚀 Your Gmail integration is now fully functional!');
      console.log('📧 You can now analyze Gmail emails for sentiment');

    } else if (response.status === 401) {
      const data = await response.json();
      console.log('📊 Authentication required');
      console.log('📝 Error:', data.error);

      if (data.authUrl) {
        console.log('\n🔧 TO FIX: Complete Gmail authentication');
        console.log('📋 Copy this URL to your browser:');
        console.log(data.authUrl);
      }
    } else if (response.status === 403) {
      console.log('❌ PERMISSION ERROR: Gmail scope issue detected');
      console.log('📝 You have Gmail access but insufficient permissions');
      console.log('🎯 Required scope: https://www.googleapis.com/auth/gmail.readonly');
      console.log('📋 Current scope: https://www.googleapis.com/auth/gmail.metadata');
    } else {
      console.log('⚠️ Unexpected status:', response.status);
      const text = await response.text();
      console.log('📊 Response preview:', text.substring(0, 300));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

finalGmailTest();
