#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ngrok for Google Drive webhooks...');
console.log('='.repeat(50));

// Check if ngrok is installed
exec('ngrok --version', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ ngrok is not installed');
    console.log('📦 Please install ngrok first:');
    console.log('   npm install -g ngrok');
    console.log('   or visit: https://ngrok.com/download');
    console.log('');
    console.log('🔧 Alternative solutions:');
    console.log('1. Use a cloud deployment (Vercel, Netlify, etc.)');
    console.log('2. Use a service like localtunnel: npm install -g localtunnel');
    console.log('3. Deploy to production where HTTPS is available');
    return;
  }

  console.log('✅ ngrok is installed:', stdout.trim());

  // Start ngrok tunnel
  console.log('🌐 Starting ngrok tunnel on port 3000...');
  console.log('📝 This will create an HTTPS URL for your local development server');
  console.log('🔗 The webhook will use this HTTPS URL instead of localhost');
  console.log('');

  const ngrok = exec('ngrok http 3000', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Failed to start ngrok:', error);
      return;
    }

    console.log('📋 ngrok output:');
    console.log(stdout);

    if (stderr) {
      console.log('⚠️ ngrok warnings:');
      console.log(stderr);
    }
  });

  ngrok.stdout.on('data', (data) => {
    const output = data.toString();

    // Look for the HTTPS URL
    const httpsMatch = output.match(/https:\/\/[a-zA-Z0-9]+\.ngrok\.io/);
    if (httpsMatch) {
      const httpsUrl = httpsMatch[0];
      console.log('');
      console.log('🎉 SUCCESS! Your HTTPS URL is:', httpsUrl);
      console.log('');
      console.log('📝 Next steps:');
      console.log('1. Update your .env file:');
      console.log(`   NEXTAUTH_URL="${httpsUrl}"`);
      console.log('2. Restart your development server');
      console.log('3. Try selecting a folder again in the Image Caption Generator');
      console.log('');
      console.log('🔄 The webhook will now use HTTPS and should work properly!');
      console.log('');
      console.log('💡 Keep this terminal window open - ngrok needs to stay running');
      console.log('   Press Ctrl+C to stop ngrok when done');
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping ngrok...');
    ngrok.kill();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping ngrok...');
    ngrok.kill();
    process.exit(0);
  });
});
