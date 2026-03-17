'use client'

import OnboardingTooltip from '@/components/onboarding-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR = [
  {
    target: '[data-tour="relatorios-abas"]',
    title: 'Relatórios do escritório',
    description: 'Acompanhe o desempenho completo do escritório — leads, campanhas, funil de conversão e métricas do agente IA em um único painel.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="relatorios-kpis"]',
    title: 'Visão geral',
    description: 'A aba Visão Geral mostra os KPIs principais: total de leads, taxa de conversão, potencial financeiro e evolução mensal.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="relatorios-funil"]',
    title: 'Análise do funil',
    description: 'A aba Funil mostra quantos leads passaram por cada etapa e onde estão as maiores perdas. Use para identificar gargalos no processo.',
    position: 'top' as const,
  },
]

export default function RelatoriosOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('relatorios')

  if (!active || step >= TOUR.length) return null

  return (
    <OnboardingTooltip
      key={step}
      targetSelector={TOUR[step].target}
      title={TOUR[step].title}
      description={TOUR[step].description}
      position={TOUR[step].position}
      step={step}
      totalSteps={TOUR.length}
      onNext={next}
      onSkip={finish}
      isLast={step === TOUR.length - 1}
    />
  )
}
