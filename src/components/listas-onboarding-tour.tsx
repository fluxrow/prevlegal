'use client'

import OnboardingTooltip from '@/components/onboarding-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR = [
  {
    target: '[data-tour="listas-lista"]',
    title: 'Listas de beneficiários',
    description: 'Importe planilhas com dados de segurados elegíveis para a readequação do teto. Cada lista pode ser vinculada a uma campanha de disparo.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="listas-importar"]',
    title: 'Importar nova lista',
    description: 'Clique em "Importar lista" para fazer upload de uma planilha CSV ou Excel. O sistema processa automaticamente os dados e verifica quais números têm WhatsApp.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="listas-status"]',
    title: 'Status de verificação',
    description: 'Após importar, o sistema verifica automaticamente quais telefones têm WhatsApp ativo. Leads sem WhatsApp são marcados e não recebem disparos.',
    position: 'left' as const,
  },
]

export default function ListasOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('listas')

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
