// Debug the current birthday in the database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugCurrentBirthday() {
  console.log('🔍 Debugging Current Birthday Data')
  console.log('=================================')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('\n1. Fetching all birthdays with full details...')
    const { data: allBirthdays, error: allError } = await supabase
      .from('birthdays')
      .select('*')

    if (allError) {
      console.log('❌ Error fetching birthdays:', allError.message)
      return
    }

    console.log(`✅ Found ${allBirthdays?.length || 0} birthdays`)

    if (allBirthdays && allBirthdays.length > 0) {
      console.log('\n2. Detailed Birthday Analysis:')
      allBirthdays.forEach((birthday, index) => {
        console.log(`\n--- Birthday ${index + 1} ---`)
        console.log(`ID: ${birthday.id}`)
        console.log(`Person: ${birthday.person_name}`)
        console.log(`Birth Date: ${birthday.birth_date}`)
        console.log(`Email: ${birthday.email || 'None'}`)
        console.log(`Phone: ${birthday.phone || 'None'}`)
        console.log(`Status: ${birthday.email_status || 'NULL'}`)
        console.log(`Is Active: ${birthday.is_active}`)
        console.log(`User ID: ${birthday.user_id}`)
        console.log(`Created: ${birthday.created_at}`)
        console.log(`Updated: ${birthday.updated_at}`)
      })

      const firstBirthday = allBirthdays[0]

      // Check today's date
      const today = new Date()
      const todayString = today.toISOString().split('T')[0]
      console.log(`\n3. Today's Date: ${todayString}`)
      console.log(`Birthday Date: ${firstBirthday.birth_date}`)

      // Check if dates match
      const birthdayDate = new Date(firstBirthday.birth_date)
      const todayFormatted = today.toISOString().split('T')[0]
      const birthdayFormatted = birthdayDate.toISOString().split('T')[0]

      console.log(`\n4. Date Comparison:`)
      console.log(`Today (formatted): ${todayFormatted}`)
      console.log(`Birthday (formatted): ${birthdayFormatted}`)
      console.log(`Dates match: ${todayFormatted === birthdayFormatted}`)

      // Check scheduler query
      console.log('\n5. Testing scheduler query...')
      const { data: schedulerResults, error: schedulerError } = await supabase
        .from('birthdays')
        .select('*')
        .eq('is_active', true)
        .eq('email_status', 'pending')
        .gte('birth_date', `${todayString}T00:00:00.000Z`)
        .lt('birth_date', `${todayString}T23:59:59.999Z`)

      if (schedulerError) {
        console.log('❌ Scheduler query failed:', schedulerError.message)
      } else {
        console.log(`✅ Scheduler query found ${schedulerResults?.length || 0} birthdays`)
        console.log('Query conditions that must match:')
        console.log(`- is_active: ${firstBirthday.is_active} (should be: true)`)
        console.log(`- email_status: ${firstBirthday.email_status} (should be: pending)`)
        console.log(`- birth_date >= today 00:00:00: ${firstBirthday.birth_date >= `${todayString}T00:00:00.000Z`}`)
        console.log(`- birth_date < today 23:59:59: ${firstBirthday.birth_date < `${todayString}T23:59:59.999Z`}`)
      }

      // Check if this birthday should be found
      const shouldBeFound =
        firstBirthday.is_active === true &&
        firstBirthday.email_status === 'pending' &&
        firstBirthday.birth_date >= `${todayString}T00:00:00.000Z` &&
        firstBirthday.birth_date < `${todayString}T23:59:59.999Z`

      console.log(`\n6. Should scheduler find this birthday? ${shouldBeFound ? 'YES' : 'NO'}`)

      if (!shouldBeFound) {
        console.log('\n🔧 Issues found:')
        if (firstBirthday.is_active !== true) console.log('- Birthday is not active')
        if (firstBirthday.email_status !== 'pending') console.log('- Birthday status is not pending')
        if (firstBirthday.birth_date < `${todayString}T00:00:00.000Z`) console.log('- Birthday date is in the past')
        if (firstBirthday.birth_date >= `${todayString}T23:59:59.999Z`) console.log('- Birthday date is in the future')
      }

    } else {
      console.log('\n❌ No birthdays found in database')
      console.log('This explains why scheduler finds 0 birthdays')
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message)
  }
}

debugCurrentBirthday()
