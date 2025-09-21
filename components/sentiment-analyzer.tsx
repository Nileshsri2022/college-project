"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Brain, Mail, TrendingUp } from "lucide-react"

interface SentimentAnalysis {
  sentiment_category: string
  confidence_score: number
  reasoning: string
  key_emotions: string[]
  tone_indicators: string[]
}

export function SentimentAnalyzer() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    email_subject: "",
    sender_email: "",
    email_content: "",
  })
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null)
  const { toast } = useToast()

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email_content.trim()) {
      toast({
        title: "Error",
        description: "Email content is required",
        variant: "destructive",
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysis(null)

    try {
      const response = await fetch("/api/sentiment/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze sentiment")
      }

      const data = await response.json()
      setAnalysis(data.analysis)

      toast({
        title: "Analysis Complete",
        description: `Email sentiment analyzed as ${data.analysis.sentiment_category}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze email sentiment",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    const colors = {
      positive: "bg-green-100 text-green-800 border-green-200",
      happy: "bg-yellow-100 text-yellow-800 border-yellow-200",
      neutral: "bg-gray-100 text-gray-800 border-gray-200",
      professional: "bg-blue-100 text-blue-800 border-blue-200",
      emotional: "bg-purple-100 text-purple-800 border-purple-200",
      negative: "bg-red-100 text-red-800 border-red-200",
      sad: "bg-indigo-100 text-indigo-800 border-indigo-200",
      angry: "bg-orange-100 text-orange-800 border-orange-200",
    }
    return colors[sentiment as keyof typeof colors] || colors.neutral
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Email Sentiment Analyzer
          </CardTitle>
          <CardDescription>Analyze the emotional tone and sentiment of emails using AI</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="email_subject">Email Subject (Optional)</Label>
              <Input
                id="email_subject"
                value={formData.email_subject}
                onChange={(e) => setFormData((prev) => ({ ...prev, email_subject: e.target.value }))}
                placeholder="Enter email subject"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sender_email">Sender Email (Optional)</Label>
              <Input
                id="sender_email"
                type="email"
                value={formData.sender_email}
                onChange={(e) => setFormData((prev) => ({ ...prev, sender_email: e.target.value }))}
                placeholder="sender@example.com"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email_content">Email Content</Label>
              <Textarea
                id="email_content"
                value={formData.email_content}
                onChange={(e) => setFormData((prev) => ({ ...prev, email_content: e.target.value }))}
                placeholder="Paste the email content here..."
                rows={6}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Brain className="h-4 w-4 mr-2 animate-pulse" />
                  Analyzing Sentiment...
                </>
              ) : (
                <>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Analyze Email Sentiment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Analysis Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div>
                <Label className="text-sm font-medium">Sentiment Category</Label>
                <Badge className={`mt-1 ${getSentimentColor(analysis.sentiment_category)}`}>
                  {analysis.sentiment_category.toUpperCase()}
                </Badge>
              </div>
              <div>
                <Label className="text-sm font-medium">Confidence Score</Label>
                <div className="mt-1">
                  <Badge variant="outline">{Math.round(analysis.confidence_score * 100)}%</Badge>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">AI Reasoning</Label>
              <p className="mt-1 text-sm text-muted-foreground bg-muted p-3 rounded-md">{analysis.reasoning}</p>
            </div>

            {analysis.key_emotions && analysis.key_emotions.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Key Emotions Detected</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.key_emotions.map((emotion, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {emotion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {analysis.tone_indicators && analysis.tone_indicators.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Tone Indicators</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {analysis.tone_indicators.map((indicator, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
