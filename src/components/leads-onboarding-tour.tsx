'use client'
import { useOnboarding } from '@/hooks/useOnboarding'
import OnboardingTooltip from '@/components/onboarding-tooltip'

const TOUR = [
  {
    target: '[data-tour="leads-stats"]',
    title: 'Estatísticas em tempo real',
    description: 'Acompanhe o total de leads, valor potencial e score médio da sua carteira.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="leads-import"]',
    title: 'Importar beneficiários',
    description: 'Importe listas de beneficiários em massa a partir de planilhas. O sistema calcula o score automaticamente.',
    position: 'left' as const,
  },
  {
    target: '[data-tour="leads-kanban"]',
    title: 'Kanban de Leads',
    description: 'Visualize e organize todos os beneficiários por etapa. Arraste os cards entre colunas para atualizar o status.',
    position: 'bottom' as const,
  },
]

export default function LeadsOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('leads')

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
