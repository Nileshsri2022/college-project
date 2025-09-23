// Debug timezone and date issues
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugTimezone() {
  console.log('🌍 Debugging Timezone and Date Issues')
  console.log('====================================')

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get current server time
    const { data: serverTime, error: serverError } = await supabase
      .rpc('now')

    if (serverError) {
      console.log('❌ Error getting server time:', serverError.message)
    } else {
      console.log('✅ Server time:', serverTime)
    }

    // Get current UTC time
    const now = new Date()
    console.log('✅ Current UTC time:', now.toISOString())
    console.log('✅ Current UTC date:', now.toISOString().split('T')[0])

    // Check user's timezone (Asia/Calcutta = UTC+5:30)
    const userTimezone = 'Asia/Calcutta'
    const userTime = now.toLocaleString('en-US', { timeZone: userTimezone })
    const userDate = now.toLocaleDateString('en-US', { timeZone: userTimezone })
    console.log('✅ User time (Asia/Calcutta):', userTime)
    console.log('✅ User date (Asia/Calcutta):', userDate)

    // Check if user is in a different day
    const isUserInNextDay = userDate !== now.toISOString().split('T')[0]
    console.log('✅ User in different day than UTC:', isUserInNextDay)

    if (isUserInNextDay) {
      console.log('\n🌍 TIMEZONE ISSUE DETECTED!')
      console.log('================================')
      console.log('You are in Asia/Calcutta timezone (UTC+5:30)')
      console.log('While the server is using UTC time')
      console.log('This means your local date is one day ahead!')
    }

    // Get the birthday data again
    console.log('\n📅 Checking birthday data...')
    const { data: birthdays, error: birthdayError } = await supabase
      .from('birthdays')
      .select('*')

    if (birthdayError) {
      console.log('❌ Error fetching birthdays:', birthdayError.message)
      return
    }

    if (birthdays && birthdays.length > 0) {
      const birthday = birthdays[0]
      console.log('Birthday date (stored):', birthday.birth_date)

      // Convert birthday date to user's timezone
      const birthdayInUserTZ = new Date(birthday.birth_date).toLocaleDateString('en-US', { timeZone: userTimezone })
      console.log('Birthday date (user timezone):', birthdayInUserTZ)

      // Check if birthday matches user's today
      const matchesUserToday = birthdayInUserTZ === userDate
      console.log('Birthday matches user today:', matchesUserToday)

      if (matchesUserToday) {
        console.log('\n🎉 SOLUTION: The birthday SHOULD be processed!')
        console.log('Try clicking "Send Pending Notifications" again')
      } else {
        console.log('\n📅 Birthday is for a different date in user timezone')
      }
    }

  } catch (error) {
    console.log('❌ Debug error:', error.message)
  }
}

debugTimezone()
