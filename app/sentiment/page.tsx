"use client"

import { SentimentAnalyzer } from "@/components/sentiment-analyzer"
import { SentimentDashboard } from "@/components/sentiment-dashboard"
import { GmailSentimentAnalyzer } from "@/components/gmail-sentiment-analyzer"
import { BackButton } from "@/components/back-button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, BarChart3, Mail } from "lucide-react"

export default function SentimentPage() {
  return (
    <>
      <BackButton to="/" label="Back to Dashboard" />
      <div className="container mx-auto p-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Email Sentiment Analysis</h1>
          <p className="text-muted-foreground">Analyze and categorize emails based on their emotional tone using AI</p>
        </div>

      <Tabs defaultValue="analyzer" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="analyzer" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Manual Analyzer
          </TabsTrigger>
          <TabsTrigger value="gmail" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Gmail Integration
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyzer">
          <SentimentAnalyzer />
        </TabsContent>

        <TabsContent value="gmail">
          <GmailSentimentAnalyzer />
        </TabsContent>

        <TabsContent value="dashboard">
          <SentimentDashboard />
        </TabsContent>
      </Tabs>
      </div>
    </>
  )
}
