// Test the get_todays_birthdays RPC function
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function testRPCFunction() {
  console.log('🔍 Testing get_todays_birthdays RPC Function')
  console.log('===========================================')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('\n1. Calling get_todays_birthdays RPC function...')
    const { data: todaysBirthdays, error } = await supabase.rpc("get_todays_birthdays")

    if (error) {
      console.log('❌ RPC function failed:', error.message)
      return
    }

    console.log(`✅ RPC function successful! Found ${todaysBirthdays?.length || 0} birthdays`)

    if (todaysBirthdays && todaysBirthdays.length > 0) {
      console.log('\n🎉 Found birthdays:')
      todaysBirthdays.forEach((birthday, index) => {
        console.log(`${index + 1}. ${birthday.person_name} - ${birthday.birth_date}`)
        console.log(`   Email: ${birthday.email || 'None'}`)
        console.log(`   Phone: ${birthday.phone || 'None'}`)
        console.log(`   Profile: ${birthday.profile_email || 'No profile'}`)
      })

      console.log('\n🚀 The "Check Today\'s Birthdays" should now work!')
    } else {
      console.log('\n❌ No birthdays found by RPC function')
      console.log('This means the function is working but no birthdays match today/tomorrow')
    }

    // Also test the direct query approach
    console.log('\n2. Testing direct query approach...')
    const today = new Date()
    const todayUTC = today.toISOString().split('T')[0]
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split('T')[0]

    console.log(`UTC date: ${todayUTC}`)
    console.log(`Tomorrow date: ${tomorrowString}`)

    const { data: directQuery, error: directError } = await supabase
      .from('birthdays')
      .select('*')
      .eq('is_active', true)
      .in('birth_date', [todayUTC, tomorrowString])

    if (directError) {
      console.log('❌ Direct query failed:', directError.message)
    } else {
      console.log(`✅ Direct query found ${directQuery?.length || 0} birthdays`)
    }

  } catch (error) {
    console.log('❌ Test error:', error.message)
  }
}

testRPCFunction()
