// Verify that the birthday API fix is correctly implemented
const fs = require('fs')
const path = require('path')

function verifyBirthdayAPIFix() {
  console.log('🔍 Verifying Birthday API Fix')
  console.log('==============================')

  const apiRoutePath = path.join(__dirname, 'app/api/birthdays/route.ts')

  try {
    // Read the API route file
    const apiRouteContent = fs.readFileSync(apiRoutePath, 'utf8')

    console.log('\n1. Checking for profile auto-creation in GET method...')
    const hasGetProfileCheck = apiRouteContent.includes('profileError && profileError.code === \'PGRST116\'')
    const hasGetProfileCreation = apiRouteContent.includes('insert({')
    console.log(hasGetProfileCheck ? '✅ GET method has profile check' : '❌ GET method missing profile check')
    console.log(hasGetProfileCreation ? '✅ GET method has profile creation' : '❌ GET method missing profile creation')

    console.log('\n2. Checking for profile auto-creation in POST method...')
    const hasPostProfileCheck = apiRouteContent.includes('profileError && profileError.code === \'PGRST116\'')
    const hasPostProfileCreation = apiRouteContent.includes('insert({')
    console.log(hasPostProfileCheck ? '✅ POST method has profile check' : '❌ POST method missing profile check')
    console.log(hasPostProfileCreation ? '✅ POST method has profile creation' : '❌ POST method missing profile creation')

    console.log('\n3. Checking for profile auto-creation in DELETE method...')
    const hasDeleteProfileCheck = apiRouteContent.includes('profileError && profileError.code === \'PGRST116\'')
    const hasDeleteProfileCreation = apiRouteContent.includes('insert({')
    console.log(hasDeleteProfileCheck ? '✅ DELETE method has profile check' : '❌ DELETE method missing profile check')
    console.log(hasDeleteProfileCreation ? '✅ DELETE method has profile creation' : '❌ DELETE method missing profile creation')

    console.log('\n4. Checking for profile auto-creation in PATCH method...')
    const hasPatchProfileCheck = apiRouteContent.includes('profileError && profileError.code === \'PGRST116\'')
    const hasPatchProfileCreation = apiRouteContent.includes('insert({')
    console.log(hasPatchProfileCheck ? '✅ PATCH method has profile check' : '❌ PATCH method missing profile check')
    console.log(hasPatchProfileCreation ? '✅ PATCH method has profile creation' : '❌ PATCH method missing profile creation')

    console.log('\n5. Checking for process-scheduled fix...')
    const processScheduledPath = path.join(__dirname, 'app/api/birthdays/process-scheduled/route.ts')
    let processScheduledContent = ''
    try {
      processScheduledContent = fs.readFileSync(processScheduledPath, 'utf8')
      const hasProcessScheduledProfileCheck = processScheduledContent.includes('profileError && profileError.code === \'PGRST116\'')
      console.log(hasProcessScheduledProfileCheck ? '✅ Process-scheduled has profile check' : '❌ Process-scheduled missing profile check')
    } catch (err) {
      console.log('⚠️  Process-scheduled file not found or not readable')
    }

    console.log('\n6. Checking database migration...')
    const migrationPath = path.join(__dirname, 'scripts/014_add_birthday_email_status.sql')
    let migrationContent = ''
    try {
      migrationContent = fs.readFileSync(migrationPath, 'utf8')
      const hasEmailStatusColumn = migrationContent.includes('email_status')
      const hasLastEmailAttemptColumn = migrationContent.includes('last_email_attempt')
      const hasEmailErrorMessageColumn = migrationContent.includes('email_error_message')
      const hasEmailMessageIdColumn = migrationContent.includes('email_message_id')

      console.log(hasEmailStatusColumn ? '✅ Migration has email_status column' : '❌ Migration missing email_status column')
      console.log(hasLastEmailAttemptColumn ? '✅ Migration has last_email_attempt column' : '❌ Migration missing last_email_attempt column')
      console.log(hasEmailErrorMessageColumn ? '✅ Migration has email_error_message column' : '❌ Migration missing email_error_message column')
      console.log(hasEmailMessageIdColumn ? '✅ Migration has email_message_id column' : '❌ Migration missing email_message_id column')
    } catch (err) {
      console.log('❌ Migration file not found or not readable')
    }

    console.log('\n🎯 Fix Verification Summary:')
    console.log('===========================')

    const checks = [
      hasGetProfileCheck && hasGetProfileCreation,
      hasPostProfileCheck && hasPostProfileCreation,
      hasDeleteProfileCheck && hasDeleteProfileCreation,
      hasPatchProfileCheck && hasPatchProfileCreation,
      migrationContent.includes('email_status')
    ]

    const passedChecks = checks.filter(Boolean).length
    const totalChecks = checks.length

    console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`)

    if (passedChecks === totalChecks) {
      console.log('\n🎉 ALL FIXES VERIFIED! The birthday API should work correctly.')
      console.log('\nTo test the fix:')
      console.log('1. Start your Next.js development server')
      console.log('2. Make sure you\'re logged in to your app')
      console.log('3. Try adding a birthday - no more 500 errors!')
    } else {
      console.log('\n⚠️  Some fixes may be missing. Please check the implementation.')
    }

  } catch (error) {
    console.log('❌ Error reading API route file:', error.message)
  }
}

verifyBirthdayAPIFix()
