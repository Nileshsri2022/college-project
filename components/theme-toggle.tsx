"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" className="h-9 w-16 px-0">
        <div className="h-[1.2rem] w-[1.2rem]" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const isDark = theme === 'dark'

  const handleToggle = () => {
    console.log('ThemeToggle: Toggling from', theme, 'to', isDark ? 'light' : 'dark')
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-9 w-16 px-0 relative overflow-hidden group hover:bg-primary/10 transition-all duration-300 hover:scale-105"
    >
      {/* Track */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full transition-colors duration-300" />

      {/* Sun icon on left side (visible in light mode) */}
      <Sun className={`absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-yellow-600 transition-all duration-300 z-10 ${
        isDark ? 'opacity-30 scale-75' : 'opacity-100 scale-100'
      }`} />

      {/* Moon icon on right side (visible in dark mode) */}
      <Moon className={`absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-blue-600 transition-all duration-300 z-10 ${
        isDark ? 'opacity-100 scale-100' : 'opacity-30 scale-75'
      }`} />

      {/* Thumb */}
      <div className={`absolute top-0.5 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-20 ${
        isDark ? 'left-8' : 'left-0.5'
      }`}>
        {isDark ? (
          <Moon className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-colors duration-300" />
        ) : (
          <Sun className="h-4 w-4 text-yellow-600 dark:text-yellow-400 transition-colors duration-300" />
        )}
      </div>

      <span className="sr-only">Toggle theme</span>

      {/* Hover effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 dark:from-blue-400/10 dark:to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
    </Button>
  )
}
