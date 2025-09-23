// Debug the RPC function in detail
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugRPCDetailed() {
  console.log('🔍 Detailed RPC Function Debug')
  console.log('==============================')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get current date info
    const today = new Date()
    const todayUTC = today.toISOString().split('T')[0]
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowString = tomorrow.toISOString().split('T')[0]

    console.log(`\n1. Current UTC date: ${todayUTC}`)
    console.log(`2. Tomorrow's date: ${tomorrowString}`)

    // Check all birthdays first
    console.log('\n3. All birthdays in database:')
    const { data: allBirthdays, error: allError } = await supabase
      .from('birthdays')
      .select('*')

    if (allError) {
      console.log('❌ Error fetching all birthdays:', allError.message)
      return
    }

    console.log(`✅ Found ${allBirthdays?.length || 0} total birthdays`)

    if (allBirthdays && allBirthdays.length > 0) {
      allBirthdays.forEach((birthday, index) => {
        console.log(`\n--- Birthday ${index + 1} ---`)
        console.log(`ID: ${birthday.id}`)
        console.log(`Person: ${birthday.person_name}`)
        console.log(`Birth Date: ${birthday.birth_date}`)
        console.log(`Is Active: ${birthday.is_active}`)
        console.log(`Status: ${birthday.email_status}`)

        // Check if this should match today or tomorrow
        const shouldMatchToday = birthday.birth_date === todayUTC
        const shouldMatchTomorrow = birthday.birth_date === tomorrowString
        console.log(`Should match today (${todayUTC}): ${shouldMatchToday}`)
        console.log(`Should match tomorrow (${tomorrowString}): ${shouldMatchTomorrow}`)
      })
    }

    // Test the RPC function
    console.log('\n4. Testing RPC function...')
    const { data: rpcBirthdays, error: rpcError } = await supabase.rpc("get_todays_birthdays")

    if (rpcError) {
      console.log('❌ RPC function error:', rpcError.message)
      console.log('This suggests the SQL function needs to be updated')
    } else {
      console.log(`✅ RPC function returned ${rpcBirthdays?.length || 0} birthdays`)
    }

    // Test manual query with same logic as RPC function
    console.log('\n5. Testing manual query with same logic...')
    const { data: manualQuery, error: manualError } = await supabase
      .from('birthdays')
      .select('*')
      .eq('is_active', true)
      .or(`birth_date.eq.${todayUTC},birth_date.eq.${tomorrowString}`)

    if (manualError) {
      console.log('❌ Manual query error:', manualError.message)
    } else {
      console.log(`✅ Manual query found ${manualQuery?.length || 0} birthdays`)
    }

    // Show the difference
    if (rpcBirthdays?.length !== manualQuery?.length) {
      console.log('\n⚠️  MISMATCH DETECTED!')
      console.log('RPC function and manual query return different results')
      console.log('This confirms the RPC function needs to be updated')
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message)
  }
}

debugRPCDetailed()
