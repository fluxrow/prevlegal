'use client'

import { useEffect, useState } from 'react'
import { Download, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function PortalInstallPrompt({ accentColor }: { accentColor: string }) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    setIsStandalone(standalone)

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => undefined)
      })
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }

    const handleAppInstalled = () => {
      setIsStandalone(true)
      setInstallPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function instalar() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (isStandalone) {
    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '999px',
          background: `${accentColor}18`,
          border: `1px solid ${accentColor}30`,
          color: accentColor,
          fontSize: '12px',
          fontWeight: '700',
        }}
      >
        <Smartphone size={13} />
        App instalado
      </div>
    )
  }

  if (installPrompt) {
    return (
      <button
        onClick={instalar}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderRadius: '999px',
          background: accentColor,
          border: 'none',
          color: '#fff',
          fontSize: '12px',
          fontWeight: '700',
          cursor: 'pointer',
        }}
      >
        <Download size={13} />
        Instalar app
      </button>
    )
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '999px',
        background: '#111318',
        border: '1px solid #ffffff12',
        color: '#8b92a0',
        fontSize: '11px',
        fontWeight: '600',
      }}
    >
      <Smartphone size={13} />
      No iPhone, use Compartilhar {'->'} Adicionar à Tela de Início
    </div>
  )
}
