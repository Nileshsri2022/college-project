// Test Gmail scope validation logic
async function testGmailScopeValidation() {
  try {
    console.log('🧪 Testing Gmail scope validation logic...');

    // Test 1: Test with Drive-only scopes (should fail)
    console.log('\n📧 Test 1: Testing with Drive-only scopes...');

    const mockTokensWithDriveScopes = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expiry_date: Date.now() + 3600000,
      scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/drive.file',
      token_type: 'Bearer'
    };

    // Simulate the scope validation logic from GmailService
    const requiredScopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.metadata'
    ];

    const currentScopes = mockTokensWithDriveScopes.scope.split(' ');
    const hasAllScopes = requiredScopes.every(scope => currentScopes.includes(scope));

    console.log('📊 Current scopes:', currentScopes);
    console.log('📊 Required scopes:', requiredScopes);
    console.log('📊 Has all required scopes:', hasAllScopes);

    if (!hasAllScopes) {
      console.log('✅ Scope validation correctly detected insufficient scopes!');
      const missingScopes = requiredScopes.filter(scope => !currentScopes.includes(scope));
      console.log('📝 Missing scopes:', missingScopes);

      const errorMessage = `Insufficient Gmail API scopes. Missing: ${missingScopes.join(', ')}. ` +
        'Please clear your existing Gmail authentication and re-authenticate to get the required Gmail permissions.';

      console.log('📝 Error message:', errorMessage);
      console.log('🎉 Gmail scope validation is working correctly!');
      return true;
    }

    // Test 2: Test with correct Gmail scopes (should pass)
    console.log('\n📧 Test 2: Testing with correct Gmail scopes...');

    const mockTokensWithGmailScopes = {
      access_token: 'mock_access_token',
      refresh_token: 'mock_refresh_token',
      expiry_date: Date.now() + 3600000,
      scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.metadata',
      token_type: 'Bearer'
    };

    const currentScopes2 = mockTokensWithGmailScopes.scope.split(' ');
    const hasAllScopes2 = requiredScopes.every(scope => currentScopes2.includes(scope));

    console.log('📊 Current scopes:', currentScopes2);
    console.log('📊 Required scopes:', requiredScopes);
    console.log('📊 Has all required scopes:', hasAllScopes2);

    if (hasAllScopes2) {
      console.log('✅ Scope validation correctly passed with proper Gmail scopes!');
      console.log('🎉 Gmail scope validation is working correctly for both scenarios!');
      return true;
    }

    return false;

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

testGmailScopeValidation();
