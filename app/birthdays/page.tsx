"use client"

import { useState } from "react"
import { BirthdayForm } from "@/components/birthday-form"
import { BirthdayList } from "@/components/birthday-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Calendar, CheckCircle, Clock, Mail, TestTube } from "lucide-react"

export default function BirthdaysPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isCheckingToday, setIsCheckingToday] = useState(false)
  const [isSendingNotifications, setIsSendingNotifications] = useState(false)
  const [isTestingEmail, setIsTestingEmail] = useState(false)
  const { toast } = useToast()

  const handleBirthdayAdded = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const checkTodaysBirthdays = async () => {
    setIsCheckingToday(true)
    try {
      const response = await fetch("/api/birthdays/check-today", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to check birthdays")

      const data = await response.json()
      toast({
        title: "Birthday Check Complete",
        description: data.message,
      })

      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      toast({
        title: "Error",
        description: `Error fetching birthdays: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsCheckingToday(false)
    }
  }

  const sendNotifications = async () => {
    setIsSendingNotifications(true)
    try {
      const response = await fetch("/api/birthdays/send-notifications", {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to send notifications")

      const data = await response.json()
      toast({
        title: "Notifications Sent",
        description: data.message,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send notifications",
        variant: "destructive",
      })
    } finally {
      setIsSendingNotifications(false)
    }
  }

  const testEmailSystem = async () => {
    setIsTestingEmail(true)
    try {
      const response = await fetch("/api/birthdays/test-email", {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Email Test Successful! 📧",
          description: `Test email sent successfully. Message ID: ${data.messageId}`,
        })
      } else {
        throw new Error(data.error || "Email test failed")
      }
    } catch (error) {
      toast({
        title: "Email Test Failed",
        description: error instanceof Error ? error.message : "Failed to send test email",
        variant: "destructive",
      })
    } finally {
      setIsTestingEmail(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Birthday Reminder System</h1>
        <p className="text-muted-foreground">Automate birthday reminders with AI-generated personalized messages</p>
      </div>

      {/* Manual Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Manual Controls
          </CardTitle>
          <CardDescription>
            Test the birthday reminder system. "Check Today's Birthdays" will automatically send emails if birthdays are
            found.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button onClick={testEmailSystem} disabled={isTestingEmail} variant="secondary">
            {isTestingEmail ? (
              <>
                <TestTube className="h-4 w-4 mr-2 animate-spin" />
                Testing Email...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Test Email System
              </>
            )}
          </Button>

          <Button onClick={checkTodaysBirthdays} disabled={isCheckingToday} variant="outline">
            {isCheckingToday ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Checking & Sending...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Check Today's Birthdays
              </>
            )}
          </Button>

          <Button onClick={sendNotifications} disabled={isSendingNotifications}>
            {isSendingNotifications ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Send Pending Notifications
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <BirthdayForm onSuccess={handleBirthdayAdded} />
        <BirthdayList refresh={refreshKey} />
      </div>
    </div>
  )
}
