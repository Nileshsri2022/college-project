// Debug script to check what birthdays exist in the database
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugBirthdays() {
  console.log('🔍 Debugging Birthday Data')
  console.log('==========================')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    console.log('\n1. Fetching all birthdays...')
    const { data: allBirthdays, error: allError } = await supabase
      .from('birthdays')
      .select('*')

    if (allError) {
      console.log('❌ Error fetching birthdays:', allError.message)
      return
    }

    console.log(`✅ Found ${allBirthdays?.length || 0} total birthdays`)

    if (allBirthdays && allBirthdays.length > 0) {
      console.log('\n2. Birthday Details:')
      allBirthdays.forEach((birthday, index) => {
        console.log(`\n--- Birthday ${index + 1} ---`)
        console.log(`ID: ${birthday.id}`)
        console.log(`Person: ${birthday.person_name}`)
        console.log(`Birth Date: ${birthday.birth_date}`)
        console.log(`Email: ${birthday.email || 'None'}`)
        console.log(`Status: ${birthday.email_status || 'NULL'}`)
        console.log(`Is Active: ${birthday.is_active}`)
        console.log(`Created: ${birthday.created_at}`)
      })
    }

    // Check today's date
    const today = new Date()
    const todayString = today.toISOString().split('T')[0]
    console.log(`\n3. Today's Date: ${todayString}`)

    // Check birthdays for today
    console.log('\n4. Checking birthdays for today...')
    const { data: todayBirthdays, error: todayError } = await supabase
      .from('birthdays')
      .select('*')
      .gte('birth_date', `${todayString}T00:00:00.000Z`)
      .lt('birth_date', `${todayString}T23:59:59.999Z`)

    if (todayError) {
      console.log('❌ Error checking today\'s birthdays:', todayError.message)
    } else {
      console.log(`✅ Found ${todayBirthdays?.length || 0} birthdays for today`)
    }

    // Check pending birthdays for today
    console.log('\n5. Checking PENDING birthdays for today...')
    const { data: pendingTodayBirthdays, error: pendingError } = await supabase
      .from('birthdays')
      .select('*')
      .eq('is_active', true)
      .eq('email_status', 'pending')
      .gte('birth_date', `${todayString}T00:00:00.000Z`)
      .lt('birth_date', `${todayString}T23:59:59.999Z`)

    if (pendingError) {
      console.log('❌ Error checking pending birthdays:', pendingError.message)
    } else {
      console.log(`✅ Found ${pendingTodayBirthdays?.length || 0} PENDING birthdays for today`)

      if (pendingTodayBirthdays && pendingTodayBirthdays.length > 0) {
        console.log('\n📋 Pending Birthday Details:')
        pendingTodayBirthdays.forEach((birthday, index) => {
          console.log(`${index + 1}. ${birthday.person_name} - ${birthday.birth_date} - ${birthday.email_status}`)
        })
      }
    }

    // Check all pending birthdays (not just today)
    console.log('\n6. Checking ALL pending birthdays...')
    const { data: allPending, error: allPendingError } = await supabase
      .from('birthdays')
      .select('*')
      .eq('is_active', true)
      .eq('email_status', 'pending')

    if (allPendingError) {
      console.log('❌ Error checking all pending:', allPendingError.message)
    } else {
      console.log(`✅ Found ${allPending?.length || 0} total PENDING birthdays`)

      if (allPending && allPending.length > 0) {
        console.log('\n📋 All Pending Birthdays:')
        allPending.forEach((birthday, index) => {
          const daysUntil = Math.ceil((new Date(birthday.birth_date) - today) / (1000 * 60 * 60 * 24))
          console.log(`${index + 1}. ${birthday.person_name} - ${birthday.birth_date} (${daysUntil} days)`)
        })
      }
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message)
  }
}

debugBirthdays()
