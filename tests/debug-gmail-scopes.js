// Debug Gmail scopes issue
async function debugGmailScopes() {
  console.log('🔍 Debugging Gmail scopes issue...\n');

  try {
    // Test 1: Check current authentication status
    console.log('1️⃣ Testing current Gmail authentication status...');
    const response = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxEmails: 1 })
    });

    console.log('📊 Response status:', response.status);

    if (response.status === 401) {
      const data = await response.json();
      console.log('📊 Response data:', JSON.stringify(data, null, 2));

      if (data.error && data.error.includes('scopes')) {
        console.log('✅ Scope validation is working correctly!');
        console.log('🔐 Current scopes detected:', data.currentScopes || 'Not available in response');
        console.log('📝 Auth URL available:', !!data.authUrl);
        console.log('\n🎯 SOLUTION: You need to re-authenticate with Gmail');
        console.log('📋 Steps to fix:');
        console.log('   1. Clear existing tokens');
        console.log('   2. Re-authenticate with Gmail permissions');
        console.log('   3. Grant Gmail API access when prompted');
      }
    } else if (response.status === 200) {
      console.log('✅ Gmail is already working correctly!');
    }

    // Test 2: Check Gmail auth endpoint
    console.log('\n2️⃣ Testing Gmail auth endpoint...');
    const authResponse = await fetch('http://localhost:3000/api/auth/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📊 Auth endpoint status:', authResponse.status);

    if (authResponse.status === 200) {
      const authData = await authResponse.json();
      console.log('✅ Auth endpoint working');
      console.log('📝 Auth URL available:', !!authData.authUrl);
    }

    // Test 3: Check token clearing endpoint
    console.log('\n3️⃣ Testing token clearing endpoint...');
    const clearResponse = await fetch('http://localhost:3000/api/auth/gmail', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📊 Clear endpoint status:', clearResponse.status);

    if (clearResponse.status === 200) {
      console.log('✅ Token clearing endpoint working');
    } else if (clearResponse.status === 401) {
      console.log('⚠️ Token clearing requires authentication');
      console.log('   You need to be logged into the app first');
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  }
}

debugGmailScopes();
