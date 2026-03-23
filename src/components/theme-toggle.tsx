'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'prevlegal-theme'

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  window.localStorage.setItem(STORAGE_KEY, theme)
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('dark')

  useEffect(() => {
    const current = document.documentElement.dataset.theme
    if (current === 'light' || current === 'dark') {
      setTheme(current)
      return
    }

    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved)
      applyTheme(saved)
      return
    }

    const preferred = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    setTheme(preferred)
    applyTheme(preferred)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
  }

  const isLight = theme === 'light'

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? 'Ativar modo escuro' : 'Ativar modo claro'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        height: '34px',
        padding: '0 12px',
        borderRadius: '999px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: '600',
        transition: 'all 0.15s ease',
      }}
    >
      {isLight ? <Moon size={14} /> : <Sun size={14} />}
      {isLight ? 'Escuro' : 'Claro'}
    </button>
  )
}
