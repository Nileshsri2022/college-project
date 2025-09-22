require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

async function testGmailFunctionality() {
  try {
    console.log('🧪 Testing Gmail service functionality...');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the Gmail tokens we just stored
    console.log('🔍 Retrieving stored Gmail tokens...');
    const { data: tokens, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      console.error('❌ Error retrieving Gmail tokens:', tokenError);
      return false;
    }

    console.log('✅ Retrieved Gmail tokens for user:', tokens.user_id);
    console.log('📝 Token details:', {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: new Date(tokens.expiry_date).toISOString(),
      scope: tokens.scope,
      tokenType: tokens.token_type
    });

    // Set up OAuth2 client with the stored tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type
    });

    // Test Gmail API functionality
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Test 1: List unread emails
    console.log('\n📧 Test 1: Listing unread emails...');
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5,
      q: 'is:unread'
    });

    const messages = listResponse.data.messages || [];
    console.log(`✅ Found ${messages.length} unread emails`);

    if (messages.length > 0) {
      // Test 2: Get details of first email
      console.log('\n📧 Test 2: Getting email details...');
      const firstMessage = messages[0];
      const messageDetail = await gmail.users.messages.get({
        userId: 'me',
        id: firstMessage.id,
        format: 'full'
      });

      const headers = messageDetail.data.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || 'Unknown';

      console.log('✅ Email details:');
      console.log('  📧 Subject:', subject);
      console.log('  👤 From:', from);
      console.log('  📅 Date:', date);
      console.log('  🆔 Message ID:', messageDetail.data.id);
      console.log('  🧵 Thread ID:', messageDetail.data.threadId);
    }

    // Test 3: Test Gmail profile
    console.log('\n📧 Test 3: Getting Gmail profile...');
    const profileResponse = await gmail.users.getProfile({
      userId: 'me'
    });

    console.log('✅ Gmail profile:');
    console.log('  📧 Email address:', profileResponse.data.emailAddress);
    console.log('  📊 Total messages:', profileResponse.data.messagesTotal);
    console.log('  📊 History ID:', profileResponse.data.historyId);

    // Test 4: Test available scopes
    console.log('\n📧 Test 4: Checking available scopes...');
    const currentScopes = tokens.scope ? tokens.scope.split(' ') : [];
    console.log('✅ Current scopes:', currentScopes);

    const hasGmailReadOnly = currentScopes.includes('https://www.googleapis.com/auth/gmail.readonly');
    const hasGmailMetadata = currentScopes.includes('https://www.googleapis.com/auth/gmail.metadata');
    const hasGmailModify = currentScopes.includes('https://www.googleapis.com/auth/gmail.modify');

    console.log('📊 Scope analysis:');
    console.log('  📖 Gmail readonly:', hasGmailReadOnly ? '✅' : '❌');
    console.log('  📋 Gmail metadata:', hasGmailMetadata ? '✅' : '❌');
    console.log('  ✏️ Gmail modify:', hasGmailModify ? '✅' : '❌');

    if (hasGmailModify) {
      console.log('🎉 Gmail modify scope is available - enhanced functionality enabled!');
      console.log('📝 This includes: read, modify, and label management capabilities');
    } else if (hasGmailReadOnly) {
      console.log('📖 Gmail readonly scope is available - standard functionality enabled');
    } else if (hasGmailMetadata) {
      console.log('⚠️ Only Gmail metadata scope available - limited functionality');
    } else {
      console.log('❌ No Gmail scopes available');
    }

    return true;

  } catch (error) {
    console.error('❌ Error testing Gmail functionality:', error);
    return false;
  }
}

// Run the test
testGmailFunctionality()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Gmail functionality test completed successfully!');
      console.log('📝 All Gmail features should work properly in your application');
    } else {
      console.log('\n💥 Gmail functionality test failed');
      console.log('🔧 Check the error messages above and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
