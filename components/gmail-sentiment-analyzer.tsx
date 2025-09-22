"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Mail, RefreshCw, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react"

interface GmailEmail {
  id: string
  subject: string
  from: string
  snippet: string
  date: string
  isSelected: boolean
}

interface SentimentAnalysis {
  sentiment_category: string
  confidence_score: number
  reasoning: string
  key_emotions: string[]
  tone_indicators: string[]
  category_description: string
}

interface AnalysisResult {
  email_id: string
  subject: string
  from: string
  date: string
  status: 'completed' | 'failed'
  sentiment_analysis?: SentimentAnalysis
  error?: string
}

export function GmailSentimentAnalyzer() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [emails, setEmails] = useState<GmailEmail[]>([])
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set())
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [maxEmails, setMaxEmails] = useState(10)
  const [markAsRead, setMarkAsRead] = useState(true)
  const { toast } = useToast()

  // Check Gmail authentication status
  useEffect(() => {
    checkGmailAuth()

    // Check for authentication success/error in URL
    const urlParams = new URLSearchParams(window.location.search)
    const gmailAuth = urlParams.get('gmail_auth')
    const error = urlParams.get('error')

    if (gmailAuth === 'success') {
      toast({
        title: "Gmail Connected Successfully!",
        description: "You can now analyze your Gmail emails for sentiment",
      })
      // Clean URL
      window.history.replaceState({}, '', '/sentiment')
    } else if (error) {
      toast({
        title: "Gmail Connection Failed",
        description: `Error: ${error.replace(/_/g, ' ')}`,
        variant: "destructive",
      })
      // Clean URL
      window.history.replaceState({}, '', '/sentiment')
    }
  }, [])

  const checkGmailAuth = async () => {
    try {
      const response = await fetch('/api/sentiment/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxEmails: 1 })
      })

      if (response.status === 401) {
        const data = await response.json()
        if (data.error && data.error.includes('scopes')) {
          setNeedsReconnect(true)
          toast({
            title: "Gmail Permissions Required",
            description: "Your Gmail connection needs updated permissions. Please reconnect your Gmail account.",
            variant: "destructive",
          })
        }
        setIsAuthenticated(false)
      } else if (response.status === 200) {
        setIsAuthenticated(true)
        setNeedsReconnect(false)
      }
    } catch (error) {
      setIsAuthenticated(false)
    }
  }

  const handleGmailAuth = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/sentiment/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxEmails: 1 })
      })

      if (response.status === 401) {
        const data = await response.json()
        if (data.authUrl) {
          window.location.href = data.authUrl
        } else {
          toast({
            title: "Authentication Required",
            description: "Please authenticate with Gmail to analyze your emails",
            variant: "destructive",
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Gmail authentication",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }


  const loadEmails = async () => {
    setIsLoading(true)
    try {
      // Fetch real emails from Gmail API
      const response = await fetch('/api/sentiment/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxEmails: maxEmails,
          markAsRead: false // Don't mark as read when just loading
        })
      })

      if (response.status === 401) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Gmail first",
          variant: "destructive",
        })
        return
      }

      if (!response.ok) {
        throw new Error('Failed to fetch emails')
      }

      const data = await response.json()

      if (data.results && data.results.length > 0) {
        // Convert API response to component format
        const fetchedEmails: GmailEmail[] = data.results.map((result: any) => ({
          id: result.email_id,
          subject: result.subject,
          from: result.from,
          snippet: result.sentiment_analysis?.reasoning?.substring(0, 150) + '...' || 'No preview available',
          date: result.date,
          isSelected: false
        }))

        setEmails(fetchedEmails)
        toast({
          title: "Emails Loaded",
          description: `Loaded ${fetchedEmails.length} emails from Gmail`,
        })
      } else {
        // No emails found
        setEmails([])
        toast({
          title: "No Emails Found",
          description: "No unread emails found in your Gmail account",
        })
      }
    } catch (error) {
      console.error('Error loading emails:', error)
      toast({
        title: "Error",
        description: "Failed to load emails from Gmail",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailSelect = (emailId: string, checked: boolean) => {
    const newSelected = new Set(selectedEmails)
    if (checked) {
      newSelected.add(emailId)
    } else {
      newSelected.delete(emailId)
    }
    setSelectedEmails(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEmails(new Set(emails.map(email => email.id)))
    } else {
      setSelectedEmails(new Set())
    }
  }

  const analyzeSelectedEmails = async () => {
    if (selectedEmails.size === 0) {
      toast({
        title: "No Emails Selected",
        description: "Please select at least one email to analyze",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/sentiment/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxEmails: selectedEmails.size,
          markAsRead
        })
      })

      if (response.status === 401) {
        toast({
          title: "Authentication Required",
          description: "Please authenticate with Gmail first",
          variant: "destructive",
        })
        return
      }

      if (!response.ok) {
        throw new Error('Failed to analyze emails')
      }

      const data = await response.json()
      setAnalysisResults(data.results || [])

      toast({
        title: "Analysis Complete",
        description: `Analyzed ${data.summary?.analyzed_emails || 0} emails successfully`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to analyze selected emails",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getSentimentColor = (sentiment: string) => {
    const colors = {
      positive: "bg-green-100 text-green-800 border-green-200",
      grateful: "bg-emerald-100 text-emerald-800 border-emerald-200",
      excited: "bg-yellow-100 text-yellow-800 border-yellow-200",
      optimistic: "bg-blue-100 text-blue-800 border-blue-200",
      neutral: "bg-gray-100 text-gray-800 border-gray-200",
      disappointed: "bg-orange-100 text-orange-800 border-orange-200",
      frustrated: "bg-red-100 text-red-800 border-red-200",
      negative: "bg-red-100 text-red-800 border-red-200",
      critical: "bg-purple-100 text-purple-800 border-purple-200",
      urgent: "bg-amber-100 text-amber-800 border-amber-200",
      demanding: "bg-rose-100 text-rose-800 border-rose-200",
    }
    return colors[sentiment as keyof typeof colors] || colors.neutral
  }

  return (
    <div className="space-y-6">
      {/* Gmail Authentication Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Integration
          </CardTitle>
          <CardDescription>
            Connect your Gmail account to analyze email sentiment directly from your inbox
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isAuthenticated ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Connected to Gmail</span>
                </>
              ) : needsReconnect ? (
                <>
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-600">Reconnection Required</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600">Not connected to Gmail</span>
                </>
              )}
            </div>
            <Button
              onClick={needsReconnect ? handleGmailAuth : (isAuthenticated ? loadEmails : handleGmailAuth)}
              disabled={isLoading}
              variant={needsReconnect ? "destructive" : (isAuthenticated ? "outline" : "default")}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {needsReconnect ? 'Reconnecting...' : (isAuthenticated ? 'Checking...' : 'Connecting...')}
                </>
              ) : needsReconnect ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reconnect Gmail
                </>
              ) : isAuthenticated ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Emails
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Connect Gmail
                </>
              )}
            </Button>
          </div>

          {needsReconnect && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-800">
                <strong>Action Required:</strong> Your Gmail connection needs updated permissions to analyze email sentiment.
                Please click "Reconnect Gmail" to grant the necessary permissions.
              </p>
            </div>
          )}

          {isAuthenticated && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxEmails">Number of emails to analyze</Label>
                <Input
                  id="maxEmails"
                  type="number"
                  min="1"
                  max="50"
                  value={maxEmails}
                  onChange={(e) => setMaxEmails(parseInt(e.target.value) || 10)}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="markAsRead"
                  checked={markAsRead}
                  onCheckedChange={(checked) => setMarkAsRead(checked === true)}
                />
                <Label htmlFor="markAsRead">Mark emails as read after analysis</Label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email List Section */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle>Gmail Emails</CardTitle>
            <CardDescription>
              Select emails to analyze their sentiment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedEmails.size === emails.length && emails.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <Label>Select All ({selectedEmails.size}/{emails.length})</Label>
              </div>
              <Button
                onClick={analyzeSelectedEmails}
                disabled={selectedEmails.size === 0 || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Analyze Selected ({selectedEmails.size})
                  </>
                )}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={selectedEmails.has(email.id)}
                    onCheckedChange={(checked) => handleEmailSelect(email.id, checked as boolean)}
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{email.subject}</h4>
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{email.from}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {email.snippet}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis Results Section */}
      {analysisResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
            <CardDescription>
              Sentiment analysis results for selected emails
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysisResults.map((result) => (
                <div key={result.email_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{result.subject}</h4>
                    <Badge
                      className={getSentimentColor(
                        result.sentiment_analysis?.sentiment_category || 'neutral'
                      )}
                    >
                      {result.sentiment_analysis?.sentiment_category?.toUpperCase() || 'UNKNOWN'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs font-medium">From</Label>
                      <p className="text-muted-foreground">{result.from}</p>
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Confidence</Label>
                      <p className="text-muted-foreground">
                        {result.sentiment_analysis
                          ? Math.round(result.sentiment_analysis.confidence_score * 100) + '%'
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  {result.sentiment_analysis?.reasoning && (
                    <div className="mt-3">
                      <Label className="text-xs font-medium">AI Analysis</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.sentiment_analysis.reasoning}
                      </p>
                    </div>
                  )}

                  {result.sentiment_analysis?.key_emotions && result.sentiment_analysis.key_emotions.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs font-medium">Key Emotions</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {result.sentiment_analysis.key_emotions.map((emotion, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {emotion}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
