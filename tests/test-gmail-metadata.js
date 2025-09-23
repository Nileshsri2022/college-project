// Test Gmail service with metadata-only scope
async function testGmailMetadataScope() {
  console.log('🧪 Testing Gmail service with metadata-only scope...\n');

  try {
    // Test the sentiment analysis endpoint
    console.log('📧 Testing Gmail sentiment analysis with metadata scope...');
    const response = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxEmails: 1 })
    });

    console.log('📊 Response status:', response.status);

    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Gmail sentiment analysis working!');
      console.log('📊 Results:', JSON.stringify(data.summary, null, 2));
      console.log('🎉 Gmail integration is now working with metadata scope!');
    } else if (response.status === 401) {
      const data = await response.json();
      console.log('❌ Authentication failed');
      console.log('📊 Error details:', JSON.stringify(data, null, 2));

      if (data.error && data.error.includes('scopes')) {
        console.log('\n🎯 ISSUE: Still insufficient Gmail scopes');
        console.log('📝 Current scopes:', data.currentScopes || 'Not available');
        console.log('📝 Missing scopes:', data.missingScopes || 'Not available');
        console.log('\n🔧 SOLUTION: Re-authenticate with Gmail');
        console.log('📋 Steps:');
        console.log('   1. Clear tokens: DELETE /api/auth/gmail');
        console.log('   2. Get auth URL: POST /api/auth/gmail');
        console.log('   3. Complete OAuth flow in browser');
        console.log('   4. Grant Gmail API access when prompted');
      }
    } else if (response.status === 403) {
      console.log('❌ Forbidden error - likely metadata scope limitation');
      console.log('📝 This suggests you have Gmail metadata scope but not readonly scope');
      console.log('📝 The service should handle this automatically now');
    } else {
      console.log('⚠️ Unexpected response status:', response.status);
      const text = await response.text();
      console.log('📊 Response text:', text.substring(0, 500));
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGmailMetadataScope();
