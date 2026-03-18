'use client'

import { useEffect, useRef, useTransition, useEffectEvent } from 'react'
import { useRouter } from 'next/navigation'

interface SessionActivityTrackerProps {
  mode: 'app' | 'admin'
  idleMinutes: number
  touchUrl: string
  loginUrl: string
  logoutUrl: string
}

const TOUCH_THROTTLE_MS = 60 * 1000

export default function SessionActivityTracker({
  idleMinutes,
  touchUrl,
  loginUrl,
  logoutUrl,
}: SessionActivityTrackerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const lastTouchRef = useRef(0)
  const idleTimerRef = useRef<number | null>(null)

  const touchServer = useEffectEvent(() => {
    const now = Date.now()
    if (now - lastTouchRef.current < TOUCH_THROTTLE_MS) return
    lastTouchRef.current = now

    void fetch(touchUrl, {
      method: 'POST',
      credentials: 'include',
      keepalive: true,
      cache: 'no-store',
    })
  })

  const logout = useEffectEvent(() => {
    if (isPending) return

    void fetch(logoutUrl, {
      method: 'DELETE',
      credentials: 'include',
      keepalive: true,
      cache: 'no-store',
    }).finally(() => {
      startTransition(() => {
        router.replace(loginUrl)
      })
    })
  })

  const resetIdleTimer = useEffectEvent(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    idleTimerRef.current = window.setTimeout(() => logout(), idleMinutes * 60 * 1000)
    touchServer()
  })

  useEffect(() => {
    const events: Array<keyof WindowEventMap> = ['click', 'keydown', 'mousemove', 'scroll', 'focus']
    const handleActivity = () => resetIdleTimer()
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') resetIdleTimer()
    }

    events.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }))
    document.addEventListener('visibilitychange', handleVisibility)
    resetIdleTimer()

    return () => {
      events.forEach((eventName) => window.removeEventListener(eventName, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  return null
}
