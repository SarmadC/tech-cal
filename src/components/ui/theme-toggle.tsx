'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon } from '@phosphor-icons/react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button className="w-9 h-9 p-0 rounded-md transition-colors hover:bg-accent-primary-light">
        <div className="h-4 w-4" />
        <span className="sr-only">Loading theme toggle</span>
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="w-9 h-9 p-0 rounded-md transition-all duration-200 hover:bg-accent-primary-light flex items-center justify-center"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4 text-foreground-primary" weight="regular" />
      ) : (
        <Moon className="h-4 w-4 text-foreground-primary" weight="regular" />
      )}
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}