require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const { randomUUID } = require('crypto');

// Gmail tokens provided by user (with modify scope)
const gmailTokens = {
  "access_token": "ya29.a0AQQ_BDQCUWFJQOvWLeqiC8NpEJ0rPMBF3CyI87lvO55xbS-QGq6ZO-PvtYgyUqwT45ZRG-uyWf4zM52AqG8SOi7Y3wtklGOPV-oAG_1ONWDTEZuzfI5I7zVo1ou4WtuYT93BHoXgJjegaqAOXF00jDO_X9WGGROS8jTQ4Ddc_EIVLyUHyrFTYLk1yB0y6KhkuIC-uKsaCgYKAfASARISFQHGX2MiMaI_y5bigmMdsch44-_q4w0206",
  "refresh_token_expires_in": 604799,
  "expires_in": 3599,
  "token_type": "Bearer",
  "scope": "https://www.googleapis.com/auth/gmail.modify",
  "refresh_token": "1//049Gt3ICPAm11CgYIARAAGAQSNwF-L9Ir-HSe7Vc6VAviJZl43eyxzaZx-c3U8uVZzbHFTipOvodxarWVqc4dUpoi0FKMpyxWxO8"
};

// Calculate expiry date (current time + expires_in seconds)
const expiryDate = Date.now() + (gmailTokens.expires_in * 1000);

async function setupGmailTokens() {
  try {
    console.log('🔐 Setting up Gmail tokens...');

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return false;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // For testing purposes, we'll use a test user ID
    // In a real scenario, you would get this from the authenticated user
    const userId = randomUUID(); // Generate a proper UUID for testing
    console.log('👤 Using test user ID:', userId);
    console.log('⚠️ Note: This is a test user ID. Replace with actual user ID in production.');

    // Prepare tokens for storage
    const tokensToStore = {
      access_token: gmailTokens.access_token,
      refresh_token: gmailTokens.refresh_token,
      expiry_date: expiryDate,
      scope: gmailTokens.scope,
      token_type: gmailTokens.token_type
    };

    console.log('📝 Tokens to store:', {
      hasAccessToken: !!tokensToStore.access_token,
      hasRefreshToken: !!tokensToStore.refresh_token,
      expiryDate: new Date(tokensToStore.expiry_date).toISOString(),
      scope: tokensToStore.scope,
      tokenType: tokensToStore.token_type
    });

    // Store tokens in gmail_tokens table
    // First, try to find an existing user in the profiles table
    console.log('🔍 Looking for existing profiles...');
    const { data: existingProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.error('❌ Error querying profiles table:', profilesError);
      return false;
    }

    let finalUserId;
    if (existingProfiles && existingProfiles.length > 0) {
      finalUserId = existingProfiles[0].id;
      console.log('✅ Using existing profile ID:', finalUserId);
    } else {
      // If no profiles exist, we'll create a test profile first
      console.log('📝 No existing profiles found, creating a test profile...');

      // For testing, we'll use the same UUID for both auth.users and profiles
      // In a real scenario, this would be handled by Supabase auth triggers
      const testUserId = randomUUID();
      const testUserData = {
        id: testUserId,
        email: 'test@example.com',
        full_name: 'Test User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: createProfileError } = await supabase
        .from('profiles')
        .insert(testUserData)
        .select('id')
        .single();

      if (createProfileError) {
        console.error('❌ Error creating test profile:', createProfileError);
        return false;
      }

      finalUserId = newProfile.id;
      console.log('✅ Created test profile with ID:', finalUserId);
    }

    console.log('💾 Storing tokens in database...');
    const { error: insertError } = await supabase
      .from('gmail_tokens')
      .upsert({
        user_id: finalUserId,
        access_token: tokensToStore.access_token,
        refresh_token: tokensToStore.refresh_token,
        expiry_date: tokensToStore.expiry_date,
        scope: tokensToStore.scope,
        token_type: tokensToStore.token_type,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (insertError) {
      console.error('❌ Error storing Gmail tokens:', insertError);
      return false;
    }

    console.log('✅ Successfully stored Gmail tokens for user:', userId);

    // Test the authentication
    console.log('🧪 Testing Gmail authentication...');

    // Set up OAuth2 client for testing
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/gmail/callback`
    );

    oauth2Client.setCredentials(tokensToStore);

    // Test Gmail API access
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const response = await gmail.users.getProfile({
      userId: 'me'
    });

    console.log('✅ Gmail API test successful!');
    console.log('📧 Email address:', response.data.emailAddress);
    console.log('📊 Messages total:', response.data.messagesTotal);
    console.log('📊 History ID:', response.data.historyId);

    return true;

  } catch (error) {
    console.error('❌ Error setting up Gmail tokens:', error);
    return false;
  }
}

// Run the setup
setupGmailTokens()
  .then((success) => {
    if (success) {
      console.log('🎉 Gmail token setup completed successfully!');
      console.log('📝 You can now use Gmail features in your application');
    } else {
      console.log('💥 Gmail token setup failed');
      console.log('🔧 Check the error messages above and try again');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
