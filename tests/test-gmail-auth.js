const http = require('http');

// Test Gmail authentication flow
async function testGmailAuth() {
  try {
    console.log('🧪 Testing Gmail authentication flow...');

    // Test 1: Check if we get proper authentication error
    console.log('\n📧 Test 1: Checking authentication status...');

    const authResponse = await makeRequest('/api/sentiment/gmail', 'POST', {
      maxEmails: 1
    });

    console.log('📊 Response status:', authResponse.status);

    if (authResponse.status === 401) {
      const data = JSON.parse(authResponse.body);
      console.log('📊 Response data:', JSON.stringify(data, null, 2));

      if (data.error && data.error.includes('scopes')) {
        console.log('✅ Scope validation is working correctly!');
        console.log('🔐 Gmail authentication requires updated permissions');
        console.log('📝 Auth URL available:', !!data.authUrl);
        console.log('🎉 Gmail integration is properly detecting scope issues');
        return true;
      } else {
        console.log('⚠️ Different authentication error:', data.error);
      }
    } else if (authResponse.status === 200) {
      const data = JSON.parse(authResponse.body);
      console.log('✅ Gmail sentiment analysis is working!');
      console.log('📧 Analysis results:', data.summary);
      console.log('🎉 Gmail integration is fully functional');
      return true;
    } else {
      console.log('⚠️ Unexpected response status:', authResponse.status);
      console.log('📊 Response body:', authResponse.body);
    }

    return false;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

testGmailAuth();
