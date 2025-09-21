"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { EmailSentiment } from "@/lib/types"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  Line,
  ComposedChart,
} from "recharts"
import { TrendingUp, Mail, Brain, Sparkles, Calendar, Target, Activity, Zap } from "lucide-react"

interface SentimentStats {
  [key: string]: number
}

export function SentimentDashboard() {
  const [sentiments, setSentiments] = useState<EmailSentiment[]>([])
  const [stats, setStats] = useState<SentimentStats>({})
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchSentiments()
  }, [])

  const fetchSentiments = async () => {
    try {
      const response = await fetch("/api/sentiment")
      if (!response.ok) throw new Error("Failed to fetch sentiments")

      const data = await response.json()
      setSentiments(data.sentiments || [])
      setStats(data.stats || {})
      setTotal(data.total || 0)
    } catch (error) {
      console.error("Error fetching sentiments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    const colorMap: { [key: string]: string } = {
      // Positive emotions - green/blue spectrum
      positive: "#10b981", // emerald-500
      grateful: "#059669", // emerald-600
      appreciative: "#06b6d4", // cyan-500
      excited: "#f59e0b", // amber-500
      optimistic: "#3b82f6", // blue-500

      // Constructive/Professional - blue spectrum
      constructive: "#1d4ed8", // blue-700
      suggestive: "#2563eb", // blue-600

      // Negative emotions - red spectrum
      negative: "#ef4444", // red-500
      critical: "#dc2626", // red-600
      frustrated: "#b91c1c", // red-700
      disappointed: "#991b1b", // red-800

      // Urgent/Demanding - orange/red spectrum
      urgent: "#ea580c", // orange-600
      demanding: "#c2410c", // orange-700

      // Neutral/Mixed - gray spectrum
      neutral: "#64748b", // slate-500
      mixed: "#6b7280", // gray-500
      cautious: "#7c3aed", // violet-600
      concerned: "#a855f7", // purple-500
    }

    return colorMap[sentiment.toLowerCase()] || "#64748b"
  }

  const getTopCategories = () => {
    const sortedStats = Object.entries(stats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    return sortedStats.map(([category, count]) => ({
      category,
      count,
      displayName: category.charAt(0).toUpperCase() + category.slice(1).replace(/-/g, " "),
    }))
  }

  const chartData = Object.entries(stats)
    .sort(([, a], [, b]) => b - a)
    .map(([sentiment, count]) => ({
      sentiment: sentiment.charAt(0).toUpperCase() + sentiment.slice(1).replace(/-/g, " "),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      fill: getSentimentColor(sentiment),
    }))

  const getTimeSeriesData = () => {
    const timeData: { [key: string]: { [sentiment: string]: number } } = {}
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (6 - i))
      return date.toLocaleDateString()
    })

    // Initialize all days with 0 counts
    last7Days.forEach((date) => {
      timeData[date] = {}
    })

    sentiments.forEach((sentiment) => {
      const date = new Date(sentiment.analyzed_at).toLocaleDateString()
      if (timeData[date]) {
        const category = sentiment.sentiment_category
        timeData[date][category] = (timeData[date][category] || 0) + 1
      }
    })

    return last7Days.map((date) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      ...timeData[date],
      total: Object.values(timeData[date]).reduce((sum, count) => sum + count, 0),
    }))
  }

  const getSentimentVelocity = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const todayCount = sentiments.filter((s) => new Date(s.analyzed_at).toDateString() === today.toDateString()).length

    const yesterdayCount = sentiments.filter(
      (s) => new Date(s.analyzed_at).toDateString() === yesterday.toDateString(),
    ).length

    const change = todayCount - yesterdayCount
    const percentChange = yesterdayCount > 0 ? Math.round((change / yesterdayCount) * 100) : 0

    return { todayCount, yesterdayCount, change, percentChange }
  }

  const timeSeriesData = getTimeSeriesData()
  const velocity = getSentimentVelocity()
  const topCategories = getTopCategories()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <Brain className="h-8 w-8 animate-pulse mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Analyzing sentiment patterns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Total Analyzed</p>
                <p className="text-xl sm:text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">Today</p>
                <div className="flex items-center gap-1">
                  <p className="text-xl sm:text-2xl font-bold">{velocity.todayCount}</p>
                  {velocity.change !== 0 && (
                    <Badge variant={velocity.change > 0 ? "default" : "secondary"} className="text-xs">
                      {velocity.change > 0 ? "+" : ""}
                      {velocity.change}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {topCategories.slice(0, 3).map((category, index) => {
          const icons = [TrendingUp, Brain, Sparkles]
          const Icon = icons[index] || Sparkles
          const color = getSentimentColor(category.category)

          return (
            <Card key={category.category} className="col-span-1">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                      {category.displayName}
                    </p>
                    <p className="text-xl sm:text-2xl font-bold" style={{ color }}>
                      {category.count}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {total > 0 && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                  <span className="truncate">Fixed Category Analysis</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  AI categorizes emails into predefined sentiment types
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={280} className="sm:h-[350px]">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="sentiment"
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      fontSize={10}
                      stroke="#64748b"
                      interval={0}
                    />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        fontSize: "12px",
                      }}
                    />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} fill={(entry) => entry.fill} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
                  Distribution
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Percentage breakdown</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <ResponsiveContainer width="100%" height={280} className="sm:h-[350px]">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ sentiment, percentage }) => (percentage > 8 ? `${percentage}%` : "")}
                      labelLine={false}
                      fontSize={10}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} emails`, "Count"]}
                      labelFormatter={(label) => `Sentiment: ${label}`}
                      contentStyle={{ fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                Weekly Sentiment Trends
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Track sentiment patterns over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={250} className="sm:h-[300px]">
                <ComposedChart data={timeSeriesData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                  <YAxis stroke="#64748b" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    fill="#3b82f6"
                    fillOpacity={0.1}
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#1e40af"
                    strokeWidth={2}
                    dot={{ fill: "#1e40af", strokeWidth: 2, r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
            Recent AI Analysis
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Latest email sentiment categorizations</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {sentiments.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <Brain className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-sm sm:text-lg mb-2">No analyses yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Start analyzing emails to see AI-powered insights
              </p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {sentiments.slice(0, 6).map((sentiment) => (
                <div key={sentiment.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between mb-2 sm:mb-3 gap-2">
                    <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          style={{
                            backgroundColor: getSentimentColor(sentiment.sentiment_category),
                            color: "white",
                            fontWeight: "500",
                          }}
                          className="text-xs"
                        >
                          {sentiment.sentiment_category.toUpperCase().replace(/-/g, " ")}
                        </Badge>
                        {sentiment.confidence_score && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(sentiment.confidence_score * 100)}%
                          </Badge>
                        )}
                      </div>
                      {sentiment.email_subject && (
                        <p className="font-medium text-xs sm:text-sm leading-relaxed line-clamp-1">
                          {sentiment.email_subject}
                        </p>
                      )}
                      {sentiment.sender_email && (
                        <p className="text-xs text-muted-foreground truncate">From: {sentiment.sender_email}</p>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                      {new Date(sentiment.analyzed_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {sentiment.email_content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
