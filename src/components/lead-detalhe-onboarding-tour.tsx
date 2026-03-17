'use client'

import OnboardingTooltip from '@/components/onboarding-tooltip'
import { useOnboarding } from '@/hooks/useOnboarding'

const TOUR = [
  {
    target: '[data-tour="lead-dados"]',
    title: 'Perfil completo do lead',
    description: 'Aqui você vê todos os dados do beneficiário — CPF, NB, banco, valor do benefício e ganho potencial estimado.',
    position: 'bottom' as const,
  },
  {
    target: '[data-tour="lead-calculadora"]',
    title: 'Calculadora previdenciária',
    description: 'Calcule o tempo de contribuição, verifique elegibilidade pelas regras pós-reforma e estime a RMI do beneficiário diretamente nesta página.',
    position: 'top' as const,
  },
  {
    target: '[data-tour="lead-documentos-ia"]',
    title: 'Geração de documentos IA',
    description: 'Gere automaticamente petição inicial, procuração e requerimento INSS pré-preenchidos com os dados do lead e do seu perfil OAB.',
    position: 'top' as const,
  },
  {
    target: '[data-tour="lead-portal"]',
    title: 'Portal do cliente',
    description: 'Compartilhe um link único com o beneficiário para ele acompanhar o processo, ver documentos e enviar mensagens direto para o escritório.',
    position: 'top' as const,
  },
]

export default function LeadDetalheOnboardingTour() {
  const { active, step, next, finish } = useOnboarding('lead-detalhe')

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
