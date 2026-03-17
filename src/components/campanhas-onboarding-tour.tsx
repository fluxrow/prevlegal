'use client'

import OnboardingTooltip from '@/components/onboarding-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR = [
  {
    target: '[data-tour="campanhas-lista"]',
    title: 'Campanhas de disparo',
    description: 'Crie campanhas para enviar mensagens em massa pelo WhatsApp para os leads das suas listas. Cada campanha tem controle de horário, limite diário e template de mensagem.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="campanhas-nova"]',
    title: 'Nova campanha',
    description: 'Clique em "Nova campanha" para criar um disparo. Vincule uma lista, defina o template da mensagem e configure os horários de envio.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="campanhas-metricas"]',
    title: 'Métricas de entrega',
    description: 'Acompanhe em tempo real quantas mensagens foram enviadas, entregues, lidas e respondidas. Use esses dados para otimizar seus templates.',
    position: 'top' as const,
  },
  {
    target: '[data-tour="campanhas-agente"]',
    title: 'Agente IA ativado',
    description: 'Quando o agente IA está ativo, ele responde automaticamente as respostas dos leads qualificados e escalona para você os casos com interesse real.',
    position: 'left' as const,
  },
]

export default function CampanhasOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('campanhas')

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
