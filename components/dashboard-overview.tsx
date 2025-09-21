"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Calendar,
  Mail,
  ImageIcon,
  Brain,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  LogOut,
  User,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface DashboardStats {
  birthdays: { total: number; upcoming: number }
  sentiments: { total: number; recent: number }
  images: { total: number; processed: number }
  tasks: { total: number; completed: number; pending: number; failed: number }
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats>({
    birthdays: { total: 0, upcoming: 0 },
    sentiments: { total: 0, recent: 0 },
    images: { total: 0, processed: 0 },
    tasks: { total: 0, completed: 0, pending: 0, failed: 0 },
  })
  const [user, setUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchDashboardData()
    fetchUser()
  }, [])

  const fetchUser = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
  }

  const fetchDashboardData = async () => {
    try {
      // Fetch all stats in parallel
      const [birthdaysRes, sentimentsRes, imagesRes, tasksRes] = await Promise.all([
        fetch("/api/birthdays"),
        fetch("/api/sentiment"),
        fetch("/api/images"),
        fetch("/api/agent-tasks"),
      ])

      const [birthdays, sentiments, images, tasks] = await Promise.all([
        birthdaysRes.ok ? birthdaysRes.json() : { birthdays: [], total: 0 },
        sentimentsRes.ok ? sentimentsRes.json() : { sentiments: [], total: 0 },
        imagesRes.ok ? imagesRes.json() : { images: [], total: 0, stats: {} },
        tasksRes.ok ? tasksRes.json() : { tasks: [], total: 0, stats: {} },
      ])

      // Calculate upcoming birthdays (next 30 days)
      const today = new Date()
      const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
      const upcomingBirthdays =
        birthdays.birthdays?.filter((birthday: any) => {
          const birthDate = new Date(birthday.birth_date)
          const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate())
          if (thisYearBirthday < today) {
            thisYearBirthday.setFullYear(today.getFullYear() + 1)
          }
          return thisYearBirthday <= thirtyDaysFromNow
        }).length || 0

      // Recent sentiments (last 7 days)
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recentSentiments =
        sentiments.sentiments?.filter((sentiment: any) => new Date(sentiment.analyzed_at) >= sevenDaysAgo).length || 0

      setStats({
        birthdays: {
          total: birthdays.total || 0,
          upcoming: upcomingBirthdays,
        },
        sentiments: {
          total: sentiments.total || 0,
          recent: recentSentiments,
        },
        images: {
          total: images.total || 0,
          processed: images.stats?.completed || 0,
        },
        tasks: {
          total: tasks.total || 0,
          completed: tasks.stats?.completed || 0,
          pending: tasks.stats?.pending || 0,
          failed: tasks.stats?.failed || 0,
        },
      })
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      router.refresh()
      router.push("/auth/login")
    } catch (error) {
      console.error("[v0] Sign out error:", error)
      // Force redirect even if sign out fails
      router.push("/auth/login")
    }
  }

  const getTaskCompletionRate = () => {
    if (stats.tasks.total === 0) return 0
    return Math.round((stats.tasks.completed / stats.tasks.total) * 100)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 mx-auto animate-pulse text-primary mb-4" />
          <p>Loading your AI dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Agentic AI</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.user_metadata?.full_name || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Birthday Reminders</p>
                  <p className="text-3xl font-bold">{stats.birthdays.total}</p>
                  <p className="text-sm text-muted-foreground">{stats.birthdays.upcoming} upcoming</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Email Analysis</p>
                  <p className="text-3xl font-bold">{stats.sentiments.total}</p>
                  <p className="text-sm text-muted-foreground">{stats.sentiments.recent} this week</p>
                </div>
                <Mail className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Image Processing</p>
                  <p className="text-3xl font-bold">{stats.images.total}</p>
                  <p className="text-sm text-muted-foreground">{stats.images.processed} processed</p>
                </div>
                <ImageIcon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Agent Tasks</p>
                  <p className="text-3xl font-bold">{stats.tasks.total}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={getTaskCompletionRate()} className="flex-1 h-2" />
                    <span className="text-xs text-muted-foreground">{getTaskCompletionRate()}%</span>
                  </div>
                </div>
                <Brain className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Access your AI agents and automation tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/birthdays">
                  <Calendar className="h-6 w-6" />
                  <span>Birthday Reminders</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/sentiment">
                  <Mail className="h-6 w-6" />
                  <span>Email Sentiment</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-20 flex-col gap-2 bg-transparent">
                <Link href="/images">
                  <ImageIcon className="h-6 w-6" />
                  <span>Image Captions</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task Status Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Task Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Completed</span>
                </div>
                <Badge variant="secondary">{stats.tasks.completed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pending</span>
                </div>
                <Badge variant="secondary">{stats.tasks.pending}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Failed</span>
                </div>
                <Badge variant="secondary">{stats.tasks.failed}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Birthday Agent</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Sentiment Analyzer</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Image Processor</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
