// Simple Gmail authentication test
async function simpleGmailTest() {
  console.log('🧪 Simple Gmail Authentication Test\n');

  try {
    console.log('📊 Testing Gmail sentiment analysis...');
    const response = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxEmails: 1 })
    });

    console.log('📊 Response status:', response.status);

    if (response.status === 200) {
      console.log('✅ SUCCESS: Gmail is working correctly!');
      console.log('🎉 Your Gmail integration is fixed!');
    } else if (response.status === 401) {
      const data = await response.json();
      console.log('📊 Authentication required');
      console.log('📝 Error:', data.error);

      if (data.authUrl) {
        console.log('✅ Auth URL available');
        console.log('📋 Copy this URL to your browser:');
        console.log(data.authUrl);
      } else {
        console.log('❌ No auth URL in response');
        console.log('📊 Full response:', JSON.stringify(data, null, 2));
      }
    } else if (response.status === 403) {
      console.log('❌ PERMISSION ERROR: Gmail scope issue');
      console.log('📝 You have Gmail access but insufficient permissions');
      console.log('🎯 SOLUTION: Re-authenticate with Gmail readonly scope');
    } else {
      console.log('⚠️ Unexpected status:', response.status);
      const text = await response.text();
      console.log('📊 Response preview:', text.substring(0, 200));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleGmailTest();
