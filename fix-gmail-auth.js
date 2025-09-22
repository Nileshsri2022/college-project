// Fix Gmail authentication and test with proper scopes
async function fixGmailAuth() {
  console.log('🔧 Fixing Gmail authentication...\n');

  try {
    // Step 1: Clear existing tokens
    console.log('1️⃣ Clearing existing Gmail tokens...');
    const clearResponse = await fetch('http://localhost:3000/api/auth/gmail', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📊 Clear tokens status:', clearResponse.status);
    if (clearResponse.status === 200) {
      console.log('✅ Tokens cleared successfully');
    } else {
      console.log('⚠️ Token clearing response:', await clearResponse.text());
    }

    // Step 2: Get new auth URL
    console.log('\n2️⃣ Getting new Gmail auth URL...');
    const authResponse = await fetch('http://localhost:3000/api/auth/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('📊 Auth URL status:', authResponse.status);
    if (authResponse.status === 200) {
      const authData = await authResponse.json();
      console.log('✅ Auth URL generated successfully');
      console.log('📝 Auth URL:', authData.authUrl);

      console.log('\n🎯 NEXT STEPS:');
      console.log('1. Copy the auth URL above');
      console.log('2. Open it in your browser');
      console.log('3. Sign in with Google');
      console.log('4. Grant Gmail permissions');
      console.log('5. Return to test the fix');

    } else {
      console.log('❌ Failed to get auth URL:', await authResponse.text());
    }

    // Step 3: Test current status
    console.log('\n3️⃣ Testing current Gmail status...');
    const testResponse = await fetch('http://localhost:3000/api/sentiment/gmail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxEmails: 1 })
    });

    console.log('📊 Test status:', testResponse.status);

    if (testResponse.status === 200) {
      console.log('✅ Gmail is working! No more scope issues.');
    } else if (testResponse.status === 401) {
      const errorData = await testResponse.json();
      console.log('📊 Error details:', JSON.stringify(errorData, null, 2));
      console.log('\n🎯 ISSUE: Still need to complete re-authentication');
      console.log('📋 Follow the steps above to get the auth URL and complete OAuth');
    } else {
      console.log('⚠️ Unexpected status:', testResponse.status);
      console.log('📊 Response:', await testResponse.text());
    }

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
  }
}

fixGmailAuth();
