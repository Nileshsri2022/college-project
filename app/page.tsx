import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardOverview } from "@/components/dashboard-overview"

export default async function HomePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    console.log("[v0] Auth check - User:", user?.id, "Error:", error.message)
  } else {
    console.log("[v0] Auth check - User:", user?.id, "Status: authenticated")
  }
  if (error || !user) {
    redirect("/auth/login")
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardOverview />
    </div>
  )
}
