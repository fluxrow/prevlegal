'use client'

import OnboardingTooltip from '@/components/onboarding-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR = [
  {
    target: '[data-tour="agendamentos-lista"]',
    title: 'Seus agendamentos',
    description: 'Aqui ficam todas as consultas e reuniões agendadas com os leads. Cada agendamento é sincronizado automaticamente com o Google Calendar.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="agendamentos-google"]',
    title: 'Google Calendar integrado',
    description: 'Quando um lead agenda uma consulta pelo WhatsApp, o evento é criado automaticamente no seu Google Calendar com link do Google Meet.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="agendamentos-status"]',
    title: 'Status do agendamento',
    description: 'Acompanhe se o agendamento está confirmado, pendente ou cancelado. Você pode atualizar o status diretamente aqui.',
    position: 'left' as const,
  },
]

export default function AgendamentosOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('agendamentos')

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
