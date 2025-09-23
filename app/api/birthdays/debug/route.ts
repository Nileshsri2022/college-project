import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    console.log("[DEBUG] Testing Supabase connection...")

    const supabase = await createClient()

    // Test basic connection
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log("[DEBUG] Auth check result:", { user: !!user, authError: authError?.message })

    if (authError || !user) {
      return NextResponse.json({
        error: "Authentication failed",
        details: authError?.message,
        user: null
      }, { status: 401 })
    }

    // Test database connection by checking if birthdays table exists
    console.log("[DEBUG] Testing database connection...")
    const { data: birthdays, error: dbError } = await supabase
      .from("birthdays")
      .select("count", { count: "exact", head: true })

    console.log("[DEBUG] Database test result:", { count: birthdays, error: dbError?.message })

    if (dbError) {
      return NextResponse.json({
        error: "Database connection failed",
        details: dbError.message,
        user: user.id
      }, { status: 500 })
    }

    // Test table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from("birthdays")
      .select("*")
      .limit(1)

    console.log("[DEBUG] Table structure test:", { tableInfo, tableError: tableError?.message })

    return NextResponse.json({
      message: "Debug check completed",
      user: user.id,
      authStatus: "authenticated",
      databaseStatus: "connected",
      tableExists: !dbError,
      tableStructure: tableInfo ? Object.keys(tableInfo[0] || {}) : [],
      birthdayCount: birthdays
    })

  } catch (error) {
    console.error("[DEBUG] Unexpected error:", error)
    return NextResponse.json({
      error: "Unexpected error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
