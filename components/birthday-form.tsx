"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

export function BirthdayForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    person_name: "",
    birth_date: "",
    email: "",
    phone: "",
    notification_preference: "email" as "email" | "whatsapp" | "both",
  })
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const response = await fetch("/api/birthdays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to add birthday")
      }

      toast({
        title: "Birthday Added",
        description: `${formData.person_name}'s birthday has been added successfully!`,
      })

      // Reset form
      setFormData({
        person_name: "",
        birth_date: "",
        email: "",
        phone: "",
        notification_preference: "email",
      })

      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add birthday. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Birthday Reminder</CardTitle>
        <CardDescription>Add a new birthday to get automated reminders with AI-generated messages</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="person_name">Person's Name</Label>
            <Input
              id="person_name"
              value={formData.person_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, person_name: e.target.value }))}
              placeholder="Enter person's name"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="birth_date">Birth Date</Label>
            <Input
              id="birth_date"
              type="date"
              value={formData.birth_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, birth_date: e.target.value }))}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="person@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+1234567890"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notification_preference">Notification Method</Label>
            <Select
              value={formData.notification_preference}
              onValueChange={(value: "email" | "whatsapp" | "both") =>
                setFormData((prev) => ({ ...prev, notification_preference: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email Only</SelectItem>
                <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                <SelectItem value="both">Both Email & WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Adding Birthday..." : "Add Birthday Reminder"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
