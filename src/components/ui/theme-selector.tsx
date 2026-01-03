'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from '@phosphor-icons/react'

interface ThemeCardProps {
  theme: 'light' | 'dark' | 'system'
  label: string
  icon: React.ReactNode
  isActive: boolean
  onClick: () => void
  preview: React.ReactNode
}

function ThemeCard({ theme, label, icon, isActive, onClick, preview }: ThemeCardProps) {
  return (
    <button
      onClick={onClick}
      className="relative border rounded-lg p-4 cursor-pointer transition-all flex flex-col items-center gap-3"
      aria-label={`Select ${label} theme`}
      style={{
        backgroundColor: isActive ? 'var(--background-secondary)' : 'transparent',
        borderColor: isActive ? 'transparent' : 'var(--border-default)',
        boxShadow: isActive ? '0 0 0 2px var(--foreground-primary)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--background-secondary)'
          e.currentTarget.style.borderColor = 'var(--border-strong)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.borderColor = 'var(--border-default)'
        }
      }}
    >
      {/* Preview */}
      <div className="w-full aspect-[4/3] rounded overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
        {preview}
      </div>
      
      {/* Label and Icon */}
      <div className="flex items-center gap-2">
        <div style={{ color: isActive ? 'var(--foreground-primary)' : 'var(--foreground-secondary)' }}>
          {icon}
        </div>
        <span 
          className="text-sm font-medium"
          style={{ 
            color: isActive ? 'var(--foreground-primary)' : 'var(--foreground-secondary)' 
          }}
        >
          {label}
        </span>
      </div>
    </button>
  )
}

export function ThemeSelector() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="border rounded-lg p-4 aspect-[4/3] animate-pulse"
            style={{
              borderColor: 'var(--border-default)',
              backgroundColor: 'var(--background-secondary)'
            }}
          />
        ))}
      </div>
    )
  }

  const currentTheme = theme || 'system'

  // Light theme preview
  const LightPreview = () => (
    <div className="w-full h-full bg-white flex flex-col">
      <div className="h-3 bg-zinc-200 border-b border-zinc-300" />
      <div className="flex-1 flex gap-1 p-1">
        <div className="w-1/4 bg-zinc-100 rounded" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-2 bg-zinc-200 rounded" />
          <div className="h-2 bg-zinc-100 rounded w-3/4" />
          <div className="h-2 bg-zinc-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  )

  // Dark theme preview
  const DarkPreview = () => (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: '#121212' }}>
      <div className="h-3 border-b" style={{ backgroundColor: '#1e1e1e', borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <div className="flex-1 flex gap-1 p-1">
        <div className="w-1/4 rounded" style={{ backgroundColor: '#1e1e1e' }} />
        <div className="flex-1 flex flex-col gap-1">
          <div className="h-2 rounded" style={{ backgroundColor: '#2a2a2a' }} />
          <div className="h-2 rounded w-3/4" style={{ backgroundColor: '#1e1e1e' }} />
          <div className="h-2 rounded w-1/2" style={{ backgroundColor: '#2a2a2a' }} />
        </div>
      </div>
    </div>
  )

  // System theme preview (split diagonal)
  const SystemPreview = () => (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-white via-white to-zinc-900">
      <div className="absolute inset-0 bg-zinc-900" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="rounded-full p-2"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.1)' }}
        >
          <Monitor className="w-6 h-6" style={{ color: 'var(--foreground-secondary)' }} weight="bold" />
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ThemeCard
        theme="light"
        label="Light"
        icon={<Sun className="w-4 h-4" weight={currentTheme === 'light' ? 'fill' : 'regular'} />}
        isActive={currentTheme === 'light'}
        onClick={() => setTheme('light')}
        preview={<LightPreview />}
      />
      <ThemeCard
        theme="dark"
        label="Dark"
        icon={<Moon className="w-4 h-4" weight={currentTheme === 'dark' ? 'fill' : 'regular'} />}
        isActive={currentTheme === 'dark'}
        onClick={() => setTheme('dark')}
        preview={<DarkPreview />}
      />
      <ThemeCard
        theme="system"
        label="System"
        icon={<Monitor className="w-4 h-4" weight={currentTheme === 'system' ? 'fill' : 'regular'} />}
        isActive={currentTheme === 'system'}
        onClick={() => setTheme('system')}
        preview={<SystemPreview />}
      />
    </div>
  )
}

