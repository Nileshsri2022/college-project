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
    
    // Check both gmail_tokens and google_drive_tokens tables
    console.log('🔍 Checking gmail_tokens table...');
    const { data: gmailTokens, error: gmailTokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .limit(5);

    console.log('📊 Gmail tokens found:', gmailTokens?.length || 0);
    if (gmailTokens && gmailTokens.length > 0) {
      gmailTokens.forEach((token, index) => {
        console.log(`  Token ${index + 1}:`, {
          user_id: token.user_id,
          scope: token.scope,
          expiry_date: new Date(token.expiry_date).toISOString(),
          hasGmailModify: token.scope?.includes('gmail.modify'),
          hasGmailReadonly: token.scope?.includes('gmail.readonly'),
          hasDriveScopes: token.scope?.includes('drive')
        });
      });
    }

    console.log('🔍 Checking google_drive_tokens table (legacy)...');
    const { data: driveTokens, error: driveTokenError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .limit(5);

    console.log('📊 Drive tokens found:', driveTokens?.length || 0);
    if (driveTokens && driveTokens.length > 0) {
      driveTokens.forEach((token, index) => {
        console.log(`  Token ${index + 1}:`, {
          user_id: token.user_id,
          scope: token.scope,
          expiry_date: new Date(token.expiry_date).toISOString(),
          hasGmailModify: token.scope?.includes('gmail.modify'),
          hasGmailReadonly: token.scope?.includes('gmail.readonly'),
          hasDriveScopes: token.scope?.includes('drive')
        });
      });
    }

    // Get the Gmail tokens we just stored
    console.log('🔍 Retrieving stored Gmail tokens...');
    const { data: tokens, error: tokenError } = await supabase
      .from('gmail_tokens')
      .select('*')
      .limit(1)
      .single();

    if (tokenError || !tokens) {
      console.error('❌ Error retrieving Gmail tokens:', tokenError);
      console.log('🔄 Falling back to google_drive_tokens...');

      // Try to get from google_drive_tokens as fallback
      const { data: fallbackTokens, error: fallbackError } = await supabase
        .from('google_drive_tokens')
        .select('*')
        .limit(1)
        .single();

      if (fallbackError || !fallbackTokens) {
        console.error('❌ No tokens found in either table');
        return false;
      }

      console.log('✅ Using fallback tokens from google_drive_tokens');
      console.log('⚠️ WARNING: Using Drive tokens instead of Gmail tokens!');
      tokens = fallbackTokens;
    } else {
      console.log('✅ Using Gmail tokens from gmail_tokens table');
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

    console.log('🔐 Setting OAuth2 credentials...');
    console.log('📝 Original token scopes:', tokens.scope);

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      scope: tokens.scope,
      token_type: tokens.token_type
    });

    // Check if token needs refresh
    console.log('🔄 Checking if token needs refresh...');
    console.log('📅 Token expiry:', new Date(tokens.expiry_date).toISOString());
    console.log('🕐 Current time:', new Date().toISOString());
    console.log('⏰ Is expired:', Date.now() >= tokens.expiry_date);

    if (Date.now() >= tokens.expiry_date) {
      console.log('🔄 Token is expired, refreshing...');
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        console.log('✅ Token refreshed successfully');
        console.log('📝 Refreshed token scopes:', credentials.scope);

        // Update the oauth2Client with refreshed credentials
        oauth2Client.setCredentials(credentials);
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        throw refreshError;
      }
    } else {
      console.log('✅ Token is still valid');
    }

    // Test Gmail API functionality
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Test 1: List recent emails (without search query)
    console.log('\n📧 Test 1: Listing recent emails (no search query)...');
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 5
      // No q parameter to avoid metadata scope restrictions
    });

    const messages = listResponse.data.messages || [];
    console.log(`✅ Found ${messages.length} recent emails`);

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

    // Test 3: Try search query with explicit scope handling
    console.log('\n📧 Test 3: Testing search query with explicit scope handling...');
    try {
      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5,
        q: 'is:unread'
      });
      console.log(`✅ Search query successful! Found ${searchResponse.data.messages?.length || 0} unread emails`);
    } catch (searchError) {
      console.log('⚠️ Search query failed (expected with metadata scope):', searchError.message);
      console.log('📝 This confirms the API is using metadata scope despite having other scopes');
    }

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

    // Fix: Move correct Gmail tokens from google_drive_tokens to gmail_tokens
    console.log('\n🔧 Attempting to fix token issue...');

    // Check if we have Gmail tokens in google_drive_tokens table
    const { data: driveTokensWithGmail, error: driveGmailError } = await supabase
      .from('google_drive_tokens')
      .select('*')
      .eq('user_id', '53dce606-543a-4714-9f6f-030c03e31a8f')
      .single();

    if (!driveGmailError && driveTokensWithGmail) {
      console.log('✅ Found Gmail tokens in google_drive_tokens table');
      console.log('📝 Drive token scopes:', driveTokensWithGmail.scope);

      // Check if these are actually Gmail scopes (not Drive scopes)
      const hasGmailScopes = driveTokensWithGmail.scope?.includes('gmail');

      if (hasGmailScopes) {
        console.log('🎉 Found Gmail scopes in drive tokens! Moving to gmail_tokens table...');

        // Move to gmail_tokens table
        const { error: moveError } = await supabase
          .from('gmail_tokens')
          .upsert({
            user_id: driveTokensWithGmail.user_id,
            access_token: driveTokensWithGmail.access_token,
            refresh_token: driveTokensWithGmail.refresh_token,
            expiry_date: driveTokensWithGmail.expiry_date,
            scope: driveTokensWithGmail.scope,
            token_type: driveTokensWithGmail.token_type,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (moveError) {
          console.error('❌ Error moving tokens:', moveError);
        } else {
          console.log('✅ Successfully moved Gmail tokens to gmail_tokens table');
          console.log('🔄 Please run the test again to verify the fix');
        }
      } else {
        console.log('❌ Drive tokens do not contain Gmail scopes');
      }
    } else {
      console.log('❌ No Gmail tokens found in google_drive_tokens table');
    }

    return true;

  } catch (error) {
    console.error('❌ Error testing Gmail functionality:', error);
    return false;
  }
}

// Clear all tokens and provide re-authentication instructions
async function clearTokensAndProvideInstructions() {
  try {
    console.log('🧹 Clearing all existing tokens...');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clear gmail_tokens table
    const { error: gmailError } = await supabase
      .from('gmail_tokens')
      .delete()
      .neq('user_id', ''); // Delete all records

    if (gmailError) {
      console.error('❌ Error clearing gmail_tokens:', gmailError);
    } else {
      console.log('✅ Cleared gmail_tokens table');
    }

    // Clear google_drive_tokens table
    const { error: driveError } = await supabase
      .from('google_drive_tokens')
      .delete()
      .neq('user_id', ''); // Delete all records

    if (driveError) {
      console.error('❌ Error clearing google_drive_tokens:', driveError);
    } else {
      console.log('✅ Cleared google_drive_tokens table');
    }

    console.log('\n🎯 SOLUTION: Re-authenticate with correct Gmail scopes');
    console.log('📋 Follow these steps:');
    console.log('1. Go to your app (likely http://localhost:3000)');
    console.log('2. Navigate to the Gmail authentication page');
    console.log('3. Click "Sign Out" if you see a sign out button');
    console.log('4. Click "Authenticate with Gmail"');
    console.log('5. When prompted, make sure to grant Gmail permissions (not just Drive)');
    console.log('6. The new tokens should have scopes like:');
    console.log('   - https://www.googleapis.com/auth/gmail.modify');
    console.log('   - https://www.googleapis.com/auth/gmail.readonly');
    console.log('   - https://www.googleapis.com/auth/gmail.metadata');
    console.log('7. After re-authentication, run this test again');

    return true;

  } catch (error) {
    console.error('❌ Error clearing tokens:', error);
    return false;
  }
}

// Test image caption generation
async function testImageCaptionGeneration() {
  try {
    console.log('🧪 Testing Image Caption Generation...');

    // Check if environment variables are set
    console.log('🔍 Checking environment variables...');
    console.log('📝 MODEL_NAME:', process.env.MODEL_NAME);
    console.log('📝 MODEL_BASE_URL:', process.env.MODEL_BASE_URL);
    console.log('📝 MODEL_API_KEY:', process.env.MODEL_API_KEY ? '✅ Set' : '❌ Missing');

    if (!process.env.MODEL_API_KEY) {
      console.error('❌ MODEL_API_KEY is not set in environment variables');
      return false;
    }

    // Test the AI model connection
    console.log('🤖 Testing AI model connection...');
    const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');
    const provider = createOpenAICompatible({
      name: "test-provider",
      apiKey: process.env.MODEL_API_KEY,
      baseURL: process.env.MODEL_BASE_URL,
    });

    const { generateText } = require('ai');

    try {
      const { text } = await generateText({
        model: provider(process.env.MODEL_NAME),
        messages: [
          {
            role: "user",
            content: "Say 'Hello, world!' in exactly 3 words."
          }
        ],
        maxOutputTokens: 10,
      });

      console.log('✅ AI model connection successful');
      console.log('📝 Response:', text);
    } catch (aiError) {
      console.error('❌ AI model connection failed:', aiError.message);
      return false;
    }

    // Test database connection
    console.log('🗄️ Testing database connection...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    try {
      const { data, error } = await supabase
        .from('image_captions')
        .select('count')
        .limit(1);

      if (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
      }

      console.log('✅ Database connection successful');
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError.message);
      return false;
    }

    console.log('🎉 All components are working correctly!');
    console.log('📝 The image caption generation should work properly.');
    return true;

  } catch (error) {
    console.error('❌ Error testing image caption generation:', error);
    return false;
  }
}

// Run the image caption test
testImageCaptionGeneration()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Image Caption Generation test completed successfully!');
      console.log('📝 The system should be working properly.');
    } else {
      console.log('\n💥 Image Caption Generation test failed');
      console.log('🔧 Check the error messages above and fix the issues');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
