"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Mail, Phone, Trash2, CheckCircle, Clock, AlertCircle, RotateCcw } from "lucide-react"
import type { Birthday } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function BirthdayList({ refresh, onRefresh }: { refresh?: number; onRefresh?: () => void }) {
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchBirthdays = async () => {
    console.log("[DEBUG] BirthdayList: Starting to fetch birthdays")
    try {
      const response = await fetch("/api/birthdays")
      console.log("[DEBUG] BirthdayList: API response status:", response.status)
      if (!response.ok) throw new Error("Failed to fetch birthdays")

      const data = await response.json()
      console.log("[DEBUG] BirthdayList: Fetched birthdays:", data.birthdays?.length || 0)
      setBirthdays(data.birthdays || [])
    } catch (error) {
      console.error("[DEBUG] BirthdayList: Error fetching birthdays:", error)
      toast({
        title: "Error",
        description: "Failed to load birthdays",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBirthdays()
  }, [refresh])

  const handleDelete = async (birthdayId: string) => {
    console.log("[DEBUG] BirthdayList: Delete button clicked for birthday ID:", birthdayId)
    console.log("[DEBUG] BirthdayList: Attempting to delete birthday...")

    try {
      console.log("[DEBUG] BirthdayList: Making DELETE request to /api/birthdays")
      const response = await fetch("/api/birthdays", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: birthdayId }),
      })

      console.log("[DEBUG] BirthdayList: DELETE response status:", response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[DEBUG] BirthdayList: DELETE failed with error:", errorData)
        throw new Error(errorData.error || "Failed to delete birthday")
      }

      const data = await response.json()
      console.log("[DEBUG] BirthdayList: DELETE successful:", data)

      toast({
        title: "Success",
        description: "Birthday reminder deleted successfully",
      })

      // Refresh the list
      onRefresh?.()
    } catch (error) {
      console.error("[DEBUG] BirthdayList: Error deleting birthday:", error)
      toast({
        title: "Error",
        description: `Failed to delete birthday: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const handleRetryEmail = async (birthdayId: string) => {
    console.log("[DEBUG] BirthdayList: Retry email button clicked for birthday ID:", birthdayId)

    try {
      // Reset email status to pending
      const response = await fetch("/api/birthdays", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: birthdayId,
          email_status: "pending",
          email_error_message: null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to reset email status")
      }

      toast({
        title: "Success",
        description: "Email will be retried in the next scheduled run",
      })

      // Refresh the list
      onRefresh?.()
    } catch (error) {
      console.error("[DEBUG] BirthdayList: Error retrying email:", error)
      toast({
        title: "Error",
        description: `Failed to retry email: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    }
  }

  const getEmailStatusBadge = (birthday: Birthday) => {
    const status = birthday.email_status || "pending"

    switch (status) {
      case "sent":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Sent
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        )
      case "pending":
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const getUpcomingBirthday = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    const thisYear = today.getFullYear()

    // Set birthday to this year
    const thisYearBirthday = new Date(thisYear, birth.getMonth(), birth.getDate())

    // If birthday already passed this year, set to next year
    if (thisYearBirthday < today) {
      thisYearBirthday.setFullYear(thisYear + 1)
    }

    const diffTime = thisYearBirthday.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return "Today!"
    if (diffDays === 1) return "Tomorrow"
    return `In ${diffDays} days`
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading birthdays...</div>
        </CardContent>
      </Card>
    )
  }

  if (birthdays.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No birthdays added yet. Add your first birthday reminder above!
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Your Birthday Reminders</h3>
      {birthdays.map((birthday) => (
        <Card key={birthday.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{birthday.person_name}</span>
                  <Badge variant="outline">{getUpcomingBirthday(birthday.birth_date)}</Badge>
                </div>

                <div className="text-sm text-muted-foreground">Born: {formatDate(birthday.birth_date)}</div>

                <div className="flex items-center gap-4 text-sm">
                  {birthday.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <span>{birthday.email}</span>
                    </div>
                  )}
                  {birthday.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{birthday.phone}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {birthday.notification_preference === "both"
                      ? "Email & WhatsApp"
                      : birthday.notification_preference === "email"
                        ? "Email"
                        : "WhatsApp"}
                  </Badge>
                  {getEmailStatusBadge(birthday)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {birthday.email_status === "failed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => handleRetryEmail(birthday.id)}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(birthday.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
