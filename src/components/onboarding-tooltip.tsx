'use client'
import { useEffect, useState } from 'react'
import { X, ChevronRight, Sparkles } from 'lucide-react'

interface Props {
  targetSelector: string
  title: string
  description: string
  step: number
  totalSteps: number
  position?: 'top' | 'bottom' | 'left' | 'right'
  onNext: () => void
  onSkip: () => void
  isLast?: boolean
}

export default function OnboardingTooltip({
  targetSelector, title, description, step, totalSteps,
  position = 'bottom', onNext, onSkip, isLast,
}: Props) {
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null)

  useEffect(() => {
    function calcPosition() {
      const el = document.querySelector(targetSelector)
      if (!el) return
      const rect = el.getBoundingClientRect()
      setCoords({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }
    calcPosition()
    window.addEventListener('resize', calcPosition)
    window.addEventListener('scroll', calcPosition, true)
    return () => {
      window.removeEventListener('resize', calcPosition)
      window.removeEventListener('scroll', calcPosition, true)
    }
  }, [targetSelector])

  if (!coords) return null

  const TOOLTIP_W = 300
  const TOOLTIP_H = 160
  const GAP = 14
  const HIGHLIGHT_PAD = 6

  let tooltipTop = 0
  let tooltipLeft = 0
  let arrowStyle: React.CSSProperties = {}

  switch (position) {
    case 'bottom':
      tooltipTop = coords.top + coords.height + GAP
      tooltipLeft = coords.left + coords.width / 2 - TOOLTIP_W / 2
      arrowStyle = { top: -7, left: TOOLTIP_W / 2 - 7, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderBottom: '7px solid #1e2538' }
      break
    case 'top':
      tooltipTop = coords.top - TOOLTIP_H - GAP
      tooltipLeft = coords.left + coords.width / 2 - TOOLTIP_W / 2
      arrowStyle = { bottom: -7, left: TOOLTIP_W / 2 - 7, borderLeft: '7px solid transparent', borderRight: '7px solid transparent', borderTop: '7px solid #1e2538' }
      break
    case 'right':
      tooltipTop = coords.top + coords.height / 2 - TOOLTIP_H / 2
      tooltipLeft = coords.left + coords.width + GAP
      arrowStyle = { top: TOOLTIP_H / 2 - 7, left: -7, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderRight: '7px solid #1e2538' }
      break
    case 'left':
      tooltipTop = coords.top + coords.height / 2 - TOOLTIP_H / 2
      tooltipLeft = coords.left - TOOLTIP_W - GAP
      arrowStyle = { top: TOOLTIP_H / 2 - 7, right: -7, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '7px solid #1e2538' }
      break
  }

  const vw = window.innerWidth
  const vh = window.innerHeight
  tooltipLeft = Math.max(12, Math.min(tooltipLeft, vw - TOOLTIP_W - 12))
  tooltipTop = Math.max(12, Math.min(tooltipTop, vh - TOOLTIP_H - 12))

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
        <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
          <defs>
            <mask id="onboarding-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={coords.left - HIGHLIGHT_PAD}
                y={coords.top - HIGHLIGHT_PAD}
                width={coords.width + HIGHLIGHT_PAD * 2}
                height={coords.height + HIGHLIGHT_PAD * 2}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="rgba(0,0,0,0.65)" mask="url(#onboarding-mask)" />
        </svg>
        {/* Highlight border */}
        <div style={{
          position: 'absolute',
          top: coords.top - HIGHLIGHT_PAD,
          left: coords.left - HIGHLIGHT_PAD,
          width: coords.width + HIGHLIGHT_PAD * 2,
          height: coords.height + HIGHLIGHT_PAD * 2,
          borderRadius: '10px',
          border: '2px solid #4f7aff',
          boxShadow: '0 0 0 4px rgba(79,122,255,0.2)',
          animation: 'onboarding-pulse 2s infinite',
        }} />
      </div>

      {/* Click outside to skip */}
      <div onClick={onSkip} style={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'default' }} />

      {/* Tooltip */}
      <div
        style={{
          position: 'fixed',
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_W,
          zIndex: 10000,
          background: '#1e2538',
          border: '1px solid rgba(79,122,255,0.4)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          pointerEvents: 'all',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'absolute', width: 0, height: 0, ...arrowStyle }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color="#4f7aff" />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#4f7aff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Dica {step + 1} de {totalSteps}
            </span>
          </div>
          <button onClick={onSkip} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>

        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#fff', margin: '0 0 6px', fontFamily: 'Syne, sans-serif' }}>{title}</h4>
        <p style={{ fontSize: '13px', color: '#a0aec0', margin: '0 0 14px', lineHeight: '1.5' }}>{description}</p>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} style={{
                width: i === step ? '16px' : '6px',
                height: '6px',
                borderRadius: '3px',
                background: i === step ? '#4f7aff' : '#2d3555',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button onClick={onSkip} style={{ fontSize: '12px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Pular tour
            </button>
            <button
              onClick={isLast ? onSkip : onNext}
              style={{ fontSize: '12px', fontWeight: '600', color: '#fff', background: '#4f7aff', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isLast ? 'Concluir ✓' : <><span>Próximo</span><ChevronRight size={12} /></>}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes onboarding-pulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(79,122,255,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(79,122,255,0.05); }
        }
      `}</style>
    </>
  )
}
