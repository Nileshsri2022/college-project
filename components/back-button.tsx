"use client"

import * as React from "react"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface BackButtonProps {
  to?: string
  onClick?: () => void
  className?: string
  label?: string
}

export function BackButton({
  to,
  onClick,
  className = "",
  label = "Go back"
}: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else if (to) {
      router.push(to)
    } else {
      router.back() // Go back in history
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className={`fixed top-6 left-6 z-50 h-10 w-10 p-0 hover:bg-primary/10 transition-all duration-200 hover:scale-110 group ${className}`}
      aria-label={label}
    >
      <ArrowLeft className="h-5 w-5 transition-transform duration-200 group-hover:-translate-x-1" />
      <span className="sr-only">{label}</span>
    </Button>
  )
}
