// test-add-birthday.js
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testAddBirthday() {
  console.log('🧪 Testing Birthday Creation')
  console.log('===========================')

  try {
    // Use service role key to bypass RLS for testing
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create a test user profile first
    console.log('\n1. Creating test user profile...')
    const testUserId = '550e8400-e29b-41d4-a716-446655440000' // Valid UUID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: testUserId,
        email: 'test@example.com',
        full_name: 'Test User'
      })
      .select()
      .single()

    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message)
      return
    }

    console.log('✅ Profile created/updated')

    // Add a test birthday for today
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]

    console.log(`\n2. Adding birthday for today (${todayString})...`)
    const { data: birthday, error: birthdayError } = await supabase
      .from('birthdays')
      .insert({
        user_id: testUserId,
        person_name: 'Test Person',
        birth_date: todayString,
        email: 'recipient@example.com',
        notification_preference: 'email',
        is_active: true,
        email_status: 'pending'
      })
      .select()
      .single()

    if (birthdayError) {
      console.log('❌ Birthday creation failed:', birthdayError.message)
      return
    }

    console.log('✅ Birthday created successfully!')
    console.log('ID:', birthday.id)
    console.log('Person:', birthday.person_name)
    console.log('Date:', birthday.birth_date)
    console.log('Status:', birthday.email_status)

    // Now test the scheduler
    console.log('\n3. Testing scheduler query...')
    const { data: pendingBirthdays, error: schedulerError } = await supabase
      .from('birthdays')
      .select('*')
      .eq('is_active', true)
      .eq('email_status', 'pending')
      .gte('birth_date', `${todayString}T00:00:00.000Z`)
      .lt('birth_date', `${todayString}T23:59:59.999Z`)

    if (schedulerError) {
      console.log('❌ Scheduler query failed:', schedulerError.message)
    } else {
      console.log(`✅ Scheduler found ${pendingBirthdays?.length || 0} pending birthdays`)

      if (pendingBirthdays && pendingBirthdays.length > 0) {
        console.log('📋 Found birthday:', pendingBirthdays[0].person_name)
      }
    }

  } catch (error) {
    console.log('❌ Test error:', error.message)
  }
}

testAddBirthday()
