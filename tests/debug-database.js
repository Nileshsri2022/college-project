const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

async function debugDatabase() {
  console.log('🔧 Database Debug Tool')
  console.log('======================')

  try {
    // Test environment variables
    console.log('\n1. Environment Variables:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.log('\n❌ Missing required environment variables!')
      return
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Test connection
    console.log('\n2. Testing Supabase Connection...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })

    if (connectionError) {
      console.log('❌ Connection failed:', connectionError.message)
      return
    }

    console.log('✅ Connection successful')

    // Check if tables exist
    console.log('\n3. Checking Tables:')

    const tables = ['profiles', 'birthdays', 'email_sentiments', 'image_captions', 'agent_tasks']

    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: Exists (count: ${data})`)
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`)
      }
    }

    // Check birthdays table structure
    console.log('\n4. Birthdays Table Structure:')
    try {
      const { data: sampleData, error } = await supabase
        .from('birthdays')
        .select('*')
        .limit(1)

      if (error) {
        console.log('❌ Cannot query birthdays table:', error.message)
      } else if (sampleData && sampleData.length > 0) {
        console.log('✅ Table exists with columns:', Object.keys(sampleData[0]))
      } else {
        console.log('✅ Table exists but empty')
      }
    } catch (err) {
      console.log('❌ Error checking birthdays table:', err.message)
    }

    // Check if email_status column exists
    console.log('\n5. Checking for email_status column:')
    try {
      const { data: testData, error } = await supabase
        .from('birthdays')
        .select('email_status')
        .limit(1)

      if (error) {
        if (error.message.includes('email_status')) {
          console.log('❌ email_status column missing - need to run migration!')
        } else {
          console.log('❌ Query failed:', error.message)
        }
      } else {
        console.log('✅ email_status column exists')
      }
    } catch (err) {
      console.log('❌ Error checking email_status column:', err.message)
    }

  } catch (error) {
    console.log('❌ Unexpected error:', error.message)
  }
}

debugDatabase()
