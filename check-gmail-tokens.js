// Check actual Gmail token scopes
async function checkGmailTokens() {
  console.log('🔍 Checking actual Gmail token scopes...\n');

  try {
    // Test the sentiment analysis endpoint
    console.log('📧 Testing Gmail sentiment analysis...');
    const response = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxEmails: 1 })
    });

    console.log('📊 Response status:', response.status);

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Gmail sentiment analysis is working!');
      console.log('📊 Results:', JSON.stringify(data.summary, null, 2));

      // Try to get more details about the authentication
      console.log('\n🔍 Checking Gmail service authentication...');

      // Test Gmail auth endpoint
      const authResponse = await fetch('http://localhost:3000/api/auth/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (authResponse.status === 200) {
        const authData = await authResponse.json();
        console.log('✅ Gmail auth endpoint working');
        console.log('📝 Auth URL available:', !!authData.authUrl);
      }

    } else if (response.status === 401) {
      const data = await response.json();
      console.log('❌ Authentication failed');
      console.log('📊 Error details:', JSON.stringify(data, null, 2));

      if (data.error && data.error.includes('scopes')) {
        console.log('\n🎯 ISSUE IDENTIFIED: Insufficient Gmail scopes');
        console.log('📝 Current scopes:', data.currentScopes || 'Not available');
        console.log('📝 Missing scopes:', data.missingScopes || 'Not available');
        console.log('\n🔧 SOLUTION: Re-authenticate with Gmail');
        console.log('📋 Steps:');
        console.log('   1. Clear tokens: DELETE /api/auth/gmail');
        console.log('   2. Get auth URL: POST /api/auth/gmail');
        console.log('   3. Complete OAuth flow in browser');
      }
    } else {
      console.log('⚠️ Unexpected response status:', response.status);
      const text = await response.text();
      console.log('📊 Response text:', text.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

checkGmailTokens();
