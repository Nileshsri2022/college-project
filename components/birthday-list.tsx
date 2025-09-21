"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Mail, Phone, Trash2 } from "lucide-react"
import type { Birthday } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export function BirthdayList({ refresh }: { refresh?: number }) {
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  const fetchBirthdays = async () => {
    try {
      const response = await fetch("/api/birthdays")
      if (!response.ok) throw new Error("Failed to fetch birthdays")

      const data = await response.json()
      setBirthdays(data.birthdays || [])
    } catch (error) {
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

                <Badge variant="secondary" className="text-xs">
                  {birthday.notification_preference === "both"
                    ? "Email & WhatsApp"
                    : birthday.notification_preference === "email"
                      ? "Email"
                      : "WhatsApp"}
                </Badge>
              </div>

              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
