'use client'
import { useState, useEffect } from 'react'

export function useOnboarding(pageKey: string) {
  const storageKey = `prevlegal_onboarding_${pageKey}`
  const [active, setActive] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const done = localStorage.getItem(storageKey)
    if (!done) {
      const t = setTimeout(() => setActive(true), 800)
      return () => clearTimeout(t)
    }
  }, [storageKey])

  function next() {
    setStep(s => s + 1)
  }

  function finish() {
    localStorage.setItem(storageKey, 'done')
    setActive(false)
    setStep(0)
  }

  function reset() {
    localStorage.removeItem(storageKey)
    setStep(0)
    setActive(true)
  }

  return { active, step, next, finish, reset }
}
