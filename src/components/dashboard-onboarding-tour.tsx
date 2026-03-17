'use client'

import OnboardingTooltip from '@/components/onboarding-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR = [
  {
    target: '[data-tour="dashboard-kpis"]',
    title: 'Visão geral do escritório',
    description: 'O Dashboard mostra os principais indicadores do seu escritório em tempo real — total de leads, potencial financeiro, agendamentos e score médio.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="dashboard-pipeline"]',
    title: 'Pipeline de leads',
    description: 'Acompanhe em quantos leads estão em cada etapa do funil — Novos, Contatados, Agendados, Convertidos e Perdidos.',
    position: 'top' as const,
  },
  {
    target: '[data-tour="dashboard-recentes"]',
    title: 'Leads recentes',
    description: 'Veja os leads adicionados mais recentemente e acesse rapidamente o perfil de cada um clicando no nome.',
    position: 'top' as const,
  },
]

export default function DashboardOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('dashboard')

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
