// Simple test to verify the birthday API works
const API_URL = 'http://localhost:3000/api/birthdays'

async function testBirthdayAPI() {
  console.log('🧪 Testing Birthday API Fix')
  console.log('==============================')

  try {
    // Test GET request first
    console.log('\n1. Testing GET /api/birthdays...')
    const getResponse = await fetch(API_URL)
    console.log('GET Status:', getResponse.status)

    if (getResponse.ok) {
      const getData = await getResponse.json()
      console.log('✅ GET Success! Found', getData.birthdays?.length || 0, 'birthdays')

      // Test POST request
      console.log('\n2. Testing POST /api/birthdays...')
      const testBirthday = {
        person_name: 'Test Person',
        birth_date: '1990-01-01',
        email: 'test@example.com',
        notification_preference: 'email'
      }

      const postResponse = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testBirthday)
      })

      console.log('POST Status:', postResponse.status)

      if (postResponse.ok) {
        const postData = await postResponse.json()
        console.log('✅ POST Success! Created birthday:', postData.birthday?.person_name)

        // Clean up - delete the test birthday
        if (postData.birthday?.id) {
          console.log('\n3. Cleaning up test data...')
          const deleteResponse = await fetch(API_URL, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: postData.birthday.id })
          })

          console.log('DELETE Status:', deleteResponse.status)
          if (deleteResponse.ok) {
            console.log('✅ Test cleanup successful')
          } else {
            console.log('⚠️  Test cleanup failed, but that\'s okay')
          }
        }
      } else {
        const errorData = await postResponse.json()
        console.log('❌ POST Failed:', errorData.error)
      }
    } else {
      const errorData = await getResponse.json()
      console.log('❌ GET Failed:', errorData.error)
    }

  } catch (error) {
    console.log('❌ Test Error:', error.message)
  }

  console.log('\n🎯 Test Complete!')
  console.log('If you see "GET Success" and "POST Success", the fix worked!')
}

testBirthdayAPI()
