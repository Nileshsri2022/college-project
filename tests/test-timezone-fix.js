// Test the timezone fix for birthday scheduler
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testTimezoneFix() {
  console.log('🕐 Testing Timezone Fix for Birthday Scheduler')
  console.log('=============================================')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get current UTC date
    const today = new Date()
    const todayUTC = today.toISOString().split('T')[0]

    // Get tomorrow's date (Asia/Calcutta date)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split('T')[0]

    console.log(`\n1. Current UTC date: ${todayUTC}`)
    console.log(`2. Tomorrow's date: ${tomorrowString}`)
    console.log(`3. Looking for birthdays on: ${tomorrowString}`)

    // Test the exact query the scheduler will use
    console.log('\n4. Testing scheduler query...')
    const { data: birthdays, error: fetchError } = await supabase
      .from("birthdays")
      .select(`
        id,
        user_id,
        person_name,
        birth_date,
        email,
        notification_preference,
        email_status
      `)
      .eq("is_active", true)
      .eq("email_status", "pending")
      .eq("birth_date", tomorrowString)

    if (fetchError) {
      console.log('❌ Scheduler query failed:', fetchError.message)
      return
    }

    console.log(`✅ Scheduler query found ${birthdays?.length || 0} birthdays`)

    if (birthdays && birthdays.length > 0) {
      console.log('\n🎉 SUCCESS! Found birthday:')
      const birthday = birthdays[0]
      console.log(`- Name: ${birthday.person_name}`)
      console.log(`- Date: ${birthday.birth_date}`)
      console.log(`- Email: ${birthday.email}`)
      console.log(`- Status: ${birthday.email_status}`)

      console.log('\n🚀 The scheduler should now process this birthday!')
    } else {
      console.log('\n❌ No birthdays found for the target date')
      console.log('This means either:')
      console.log('- The birthday date is different')
      console.log('- The birthday status is not "pending"')
      console.log('- The birthday is not active')
    }

  } catch (error) {
    console.log('❌ Test error:', error.message)
  }
}

testTimezoneFix()
