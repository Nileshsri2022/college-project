"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import animationJson from './landing-animation.json';
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
  Sparkles,
  Activity,
} from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Lottie from 'lottie-react'
import { ProfileModal } from "@/components/profile-modal"

interface DashboardStats {
  birthdays: { total: number; upcoming: number }
  sentiments: { total: number; recent: number }
  images: { total: number; processed: number }
  tasks: { total: number; completed: number; pending: number; failed: number }
}

export function DashboardOverview() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [stats, setStats] = useState<DashboardStats>({
    birthdays: { total: 0, upcoming: 0 },
    sentiments: { total: 0, recent: 0 },
    images: { total: 0, processed: 0 },
    tasks: { total: 0, completed: 0, pending: 0, failed: 0 },
  })
  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)
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

    // Fetch detailed profile information
    if (user) {
      try {
        const profileResponse = await fetch('/api/auth/profile')
        if (profileResponse.ok) {
          const profileData = await profileResponse.json()
          setUserProfile(profileData.data)
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
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

  const handleProfileUpdate = (updatedProfile: any) => {
    setUserProfile(updatedProfile)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        {/* Header */}
        <header className="border-b bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Brain className="h-10 w-10 text-primary animate-pulse" />
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-bounce" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                    Agentic AI
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Welcome back, {user?.user_metadata?.full_name || user?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ThemeToggle />
                <div className="h-6 w-px bg-border" />
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 transition-colors">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button variant="ghost" size="sm" className="hover:bg-primary/10 transition-colors">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-destructive/10 transition-colors">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Loading Content - Centered */}
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-100px)]">
          <div className="text-center animate-in fade-in-0 duration-1000">
            <div className="mb-8 relative">
              <Lottie
                animationData={animationJson}
                loop={true}
                autoplay={true}
                style={{ width: 200, height: 160 }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse" />
            </div>
            <div className="space-y-4">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent animate-pulse">
                Loading AI Dashboard
              </h2>
              <p className="text-lg font-medium text-muted-foreground animate-pulse">Initializing your AI agents...</p>
              <div className="flex justify-center space-x-2 mt-6">
                <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
  
        {/* Profile Modal */}
        <ProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          user={user}
          userProfile={userProfile}
          onProfileUpdate={handleProfileUpdate}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 transition-colors duration-500">
      {/* Header */}
      <header className="border-b bg-gradient-to-r from-card via-card to-card/95 backdrop-blur-sm shadow-sm transition-colors duration-500">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Brain className="h-10 w-10 text-primary animate-pulse" />
                <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-500 animate-bounce" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  Agentic AI
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {user?.user_metadata?.full_name || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="h-6 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-primary/10 transition-colors"
                onClick={() => setShowProfileModal(true)}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
              <Button variant="ghost" size="sm" className="hover:bg-primary/10 transition-colors">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="hover:bg-destructive/10 transition-colors">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-6 space-y-8">
        {/* Welcome Section */}
        <div className="text-center py-8 animate-in fade-in-0 slide-in-from-top-4 duration-700" style={{ animationDelay: '50ms' }}>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 animate-in slide-in-from-bottom-4 duration-500 delay-100">
            AI Dashboard Overview
          </h2>
          <p className="text-lg text-muted-foreground animate-in slide-in-from-bottom-4 duration-500 delay-200">
            Monitor your automated agents and track performance metrics
          </p>
          <div className="flex justify-center mt-4 space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '200ms' }} />
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '400ms' }} />
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="group hover:shadow-lg transition-all duration-500 border-0 bg-gradient-to-br from-blue-50/80 to-blue-100/60 dark:from-blue-950/40 dark:to-blue-900/30 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-blue-200/50 dark:border-blue-800/50"
                style={{ animationDelay: '0ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="animate-in slide-in-from-left-4 duration-500 delay-200">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 transition-colors">Birthday Reminders</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 transition-all duration-300 group-hover:scale-110">{stats.birthdays.total}</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 transition-colors">{stats.birthdays.upcoming} upcoming</p>
                </div>
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-full group-hover:bg-blue-500/20 dark:group-hover:bg-blue-500/30 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 border border-blue-200/30 dark:border-blue-700/30">
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 transition-transform duration-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-500 border-0 bg-gradient-to-br from-green-50/80 to-green-100/60 dark:from-green-950/40 dark:to-green-900/30 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-green-200/50 dark:border-green-800/50"
                style={{ animationDelay: '100ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="animate-in slide-in-from-left-4 duration-500 delay-300">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 transition-colors">Email Analysis</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100 transition-all duration-300 group-hover:scale-110">{stats.sentiments.total}</p>
                  <p className="text-sm text-green-600 dark:text-green-400 transition-colors">{stats.sentiments.recent} this week</p>
                </div>
                <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-full group-hover:bg-green-500/20 dark:group-hover:bg-green-500/30 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 border border-green-200/30 dark:border-green-700/30">
                  <Mail className="h-8 w-8 text-green-600 dark:text-green-400 transition-transform duration-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-500 border-0 bg-gradient-to-br from-purple-50/80 to-purple-100/60 dark:from-purple-950/40 dark:to-purple-900/30 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-purple-200/50 dark:border-purple-800/50"
                style={{ animationDelay: '200ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="animate-in slide-in-from-left-4 duration-500 delay-400">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 transition-colors">Image Processing</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 transition-all duration-300 group-hover:scale-110">{stats.images.total}</p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 transition-colors">{stats.images.processed} processed</p>
                </div>
                <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 rounded-full group-hover:bg-purple-500/20 dark:group-hover:bg-purple-500/30 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 border border-purple-200/30 dark:border-purple-700/30">
                  <ImageIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 transition-transform duration-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-500 border-0 bg-gradient-to-br from-orange-50/80 to-orange-100/60 dark:from-orange-950/40 dark:to-orange-900/30 hover:scale-105 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-orange-200/50 dark:border-orange-800/50"
                style={{ animationDelay: '300ms' }}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="animate-in slide-in-from-left-4 duration-500 delay-500">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-300 transition-colors">Agent Tasks</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 transition-all duration-300 group-hover:scale-110">{stats.tasks.total}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={getTaskCompletionRate()} className="flex-1 h-2 transition-all duration-1000" />
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-medium transition-all duration-300 group-hover:scale-110">{getTaskCompletionRate()}%</span>
                  </div>
                </div>
                <div className="p-3 bg-orange-500/10 dark:bg-orange-500/20 rounded-full group-hover:bg-orange-500/20 dark:group-hover:bg-orange-500/30 transition-all duration-300 group-hover:rotate-12 group-hover:scale-110 border border-orange-200/30 dark:border-orange-700/30">
                  <Brain className="h-8 w-8 text-orange-600 dark:text-orange-400 transition-transform duration-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 shadow-lg animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-border/50 transition-colors duration-500" style={{ animationDelay: '400ms' }}>
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl flex items-center gap-3 animate-in slide-in-from-left-4 duration-500 delay-500">
              <Activity className="h-6 w-6 text-primary animate-pulse" />
              Quick Actions
            </CardTitle>
            <CardDescription className="text-base animate-in slide-in-from-left-4 duration-500 delay-600 transition-colors">
              Access your AI agents and automation tools with one click
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Button asChild variant="outline" className="h-24 flex-col gap-3 bg-gradient-to-br from-blue-50/60 to-blue-100/40 dark:from-blue-950/30 dark:to-blue-900/20 hover:from-blue-100/80 hover:to-blue-200/60 dark:hover:from-blue-900/50 dark:hover:to-blue-800/40 border-blue-200/60 dark:border-blue-800/60 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 group"
                      style={{ animationDelay: '500ms' }}>
                <Link href="/birthdays">
                  <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="font-semibold transition-all duration-300 group-hover:scale-105">Birthday Reminders</span>
                  <span className="text-xs text-muted-foreground transition-all duration-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Automated celebrations</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-3 bg-gradient-to-br from-green-50/60 to-green-100/40 dark:from-green-950/30 dark:to-green-900/20 hover:from-green-100/80 hover:to-green-200/60 dark:hover:from-green-900/50 dark:hover:to-green-800/40 border-green-200/60 dark:border-green-800/60 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 group"
                      style={{ animationDelay: '600ms' }}>
                <Link href="/sentiment">
                  <Mail className="h-8 w-8 text-green-600 dark:text-green-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="font-semibold transition-all duration-300 group-hover:scale-105">Email Sentiment</span>
                  <span className="text-xs text-muted-foreground transition-all duration-300 group-hover:text-green-600 dark:group-hover:text-green-400">AI-powered analysis</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-24 flex-col gap-3 bg-gradient-to-br from-purple-50/60 to-purple-100/40 dark:from-purple-950/30 dark:to-purple-900/20 hover:from-purple-100/80 hover:to-purple-200/60 dark:hover:from-purple-900/50 dark:hover:to-purple-800/40 border-purple-200/60 dark:border-purple-800/60 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:-translate-y-1 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 group"
                      style={{ animationDelay: '700ms' }}>
                <Link href="/images">
                  <ImageIcon className="h-8 w-8 text-purple-600 dark:text-purple-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12" />
                  <span className="font-semibold transition-all duration-300 group-hover:scale-105">Image Captions</span>
                  <span className="text-xs text-muted-foreground transition-all duration-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">Smart image processing</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task Status Overview */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="border-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-border/50" style={{ animationDelay: '800ms' }}>
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl animate-in slide-in-from-left-4 duration-500 delay-900">
                <TrendingUp className="h-6 w-6 text-primary animate-bounce" />
                Task Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50/70 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/60 dark:border-green-800/60 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-left-4 duration-500 group"
                   style={{ animationDelay: '1000ms' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 dark:bg-green-500/20 rounded-full transition-all duration-300 group-hover:bg-green-500/20 dark:group-hover:bg-green-500/30 group-hover:scale-110 border border-green-200/30 dark:border-green-700/30">
                    <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 transition-all duration-300 group-hover:rotate-12" />
                  </div>
                  <span className="font-medium transition-all duration-300 group-hover:text-green-700 dark:group-hover:text-green-300">Completed</span>
                </div>
                <Badge variant="secondary" className="bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-100 transition-all duration-300 group-hover:scale-110 border border-green-200/50 dark:border-green-700/50">
                  {stats.tasks.completed}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-yellow-50/70 to-yellow-100/50 dark:from-yellow-950/30 dark:to-yellow-900/20 border border-yellow-200/60 dark:border-yellow-800/60 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-left-4 duration-500 group"
                   style={{ animationDelay: '1100ms' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-500/10 dark:bg-yellow-500/20 rounded-full transition-all duration-300 group-hover:bg-yellow-500/20 dark:group-hover:bg-yellow-500/30 group-hover:scale-110 border border-yellow-200/30 dark:border-yellow-700/30">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 transition-all duration-300 group-hover:rotate-12" />
                  </div>
                  <span className="font-medium transition-all duration-300 group-hover:text-yellow-700 dark:group-hover:text-yellow-300">Pending</span>
                </div>
                <Badge variant="secondary" className="bg-yellow-100/80 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-100 transition-all duration-300 group-hover:scale-110 border border-yellow-200/50 dark:border-yellow-700/50">
                  {stats.tasks.pending}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-red-50/70 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border border-red-200/60 dark:border-red-800/60 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-left-4 duration-500 group"
                   style={{ animationDelay: '1200ms' }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 dark:bg-red-500/20 rounded-full transition-all duration-300 group-hover:bg-red-500/20 dark:group-hover:bg-red-500/30 group-hover:scale-110 border border-red-200/30 dark:border-red-700/30">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 transition-all duration-300 group-hover:rotate-12" />
                  </div>
                  <span className="font-medium transition-all duration-300 group-hover:text-red-700 dark:group-hover:text-red-300">Failed</span>
                </div>
                <Badge variant="secondary" className="bg-red-100/80 text-red-800 dark:bg-red-900/80 dark:text-red-100 transition-all duration-300 group-hover:scale-110 border border-red-200/50 dark:border-red-700/50">
                  {stats.tasks.failed}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-br from-card/80 via-card/60 to-card/40 shadow-lg hover:shadow-xl transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 border-border/50" style={{ animationDelay: '900ms' }}>
            <CardHeader className="pb-6">
              <CardTitle className="text-xl animate-in slide-in-from-left-4 duration-500 delay-1000">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50/70 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/60 dark:border-green-800/60 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-right-4 duration-500 group"
                   style={{ animationDelay: '1300ms' }}>
                <span className="font-medium transition-all duration-300 group-hover:text-green-700 dark:group-hover:text-green-300">Birthday Agent</span>
                <Badge variant="secondary" className="bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-100 animate-pulse transition-all duration-300 group-hover:scale-110 border border-green-200/50 dark:border-green-700/50">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50/70 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/60 dark:border-green-800/60 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-right-4 duration-500 group"
                   style={{ animationDelay: '1400ms' }}>
                <span className="font-medium transition-all duration-300 group-hover:text-green-700 dark:group-hover:text-green-300">Sentiment Analyzer</span>
                <Badge variant="secondary" className="bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-100 animate-pulse transition-all duration-300 group-hover:scale-110 border border-green-200/50 dark:border-green-700/50">
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-50/70 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border border-green-200/60 dark:border-green-800/60 transition-all duration-300 hover:scale-105 hover:shadow-md animate-in slide-in-from-right-4 duration-500 group"
                   style={{ animationDelay: '1500ms' }}>
                <span className="font-medium transition-all duration-300 group-hover:text-green-700 dark:group-hover:text-green-300">Image Processor</span>
                <Badge variant="secondary" className="bg-green-100/80 text-green-800 dark:bg-green-900/80 dark:text-green-100 animate-pulse transition-all duration-300 group-hover:scale-110 border border-green-200/50 dark:border-green-700/50">
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
