import { config as loadEnv } from 'dotenv'
loadEnv()
loadEnv({ path: '.env.local', override: true })
import Anthropic from '@anthropic-ai/sdk'
import { getPlanningKnowledgeBlock } from '../src/lib/agent-knowledge'
import { getAgentSeedProfile } from '../src/lib/agent-seed-profiles'

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1200

const TEST_CASES = [
  {
    id: 'T1_magistrado_funpresp',
    titulo: 'Magistrado técnico exigente — decisão FUNPRESP',
    mensagem:
      'Oi. Sou juiz federal, ingressei em 2009. Ando pensando em planejamento. Minha dúvida principal: vale migrar para FUNPRESP-Jud ou fico no regime atual? Tenho 52 anos, subsídio próximo ao teto da magistratura.',
    criterios_sucesso: [
      'Menciona que a migração é voluntária e irrevogável',
      'Menciona benefício especial como compensação',
      'Aponta que análise é atuarial e individualizada',
      'Considera idade e horizonte como fatores decisivos',
      'Usa tratamento respeitoso (Vossa Excelência, Doutor) ou tom técnico compatível',
      'NÃO afirma categoricamente qual é a melhor escolha',
    ],
  },
  {
    id: 'T2_medico_pj_prolabore',
    titulo: 'Médico com PJ questionando pró-labore mínimo',
    mensagem:
      'Sou médico, tenho PJ desde 2018. Meu contador recomenda pró-labore de 1 salário mínimo para economizar tributo. Faz sentido?',
    criterios_sucesso: [
      'Valida o ponto do contador sem desautorizar',
      'Diferencia otimização tributária de otimização previdenciária',
      'Menciona impacto na aposentadoria do INSS (benefício mínimo vs teto)',
      'Aponta impacto em auxílio-doença, salário-maternidade, pensão',
      'Sugere que decisão integrada considera os dois ângulos',
      'NÃO recomenda valor específico de pró-labore',
    ],
  },
  {
    id: 'T3_executivo_pgbl_tabela',
    titulo: 'Executivo CLT com PGBL e dúvida sobre tabela',
    mensagem:
      'Sou executivo CLT, ganho 50 mil por mês, tenho PGBL há 10 anos em tabela progressiva. Devo mudar para regressiva agora?',
    criterios_sucesso: [
      'Esclarece que a escolha de tabela é irrevogável por aporte/plano',
      'Explica diferença entre progressiva e regressiva',
      'Menciona que aportes antigos permanecem na tabela original',
      'Aponta que horizonte longo favorece regressiva (10% após 10 anos)',
      'Considera o perfil tributário do lead (faixa de IR)',
      'NÃO afirma categoricamente qual é a melhor',
    ],
  },
  {
    id: 'T4_advogado_fora_repertorio',
    titulo: 'Advogado tributarista — perfil fora do repertório profundo',
    mensagem:
      'Sou advogado tributarista, 48 anos, sócio de escritório pequeno. Como pensar aposentadoria considerando que minha contribuição ao INSS é baixa e quero manter padrão de vida?',
    criterios_sucesso: [
      'Adota postura consultiva de descoberta (faz perguntas em vez de afirmar)',
      'Demonstra interesse em entender a realidade específica do advogado',
      'Menciona caixa de assistência da OAB ou previdência complementar em nível geral',
      'NÃO improvisa afirmações técnicas específicas sobre advocacia tributária',
      'Remete rapidamente ao advogado especialista do escritório',
      'NÃO alucina valores específicos de contribuição ou aposentadoria de advogado',
    ],
  },
  {
    id: 'T5_dentista_atividade_especial',
    titulo: 'Dentista perguntando sobre atividade especial',
    mensagem:
      'Sou cirurgiã-dentista autônoma há 20 anos, tenho consultório próprio. Me disseram que posso ter direito à aposentadoria especial. Isso é verdade?',
    criterios_sucesso: [
      'Reconhece que dentista pode ter direito à aposentadoria especial (biológicos/radiação)',
      'Explica que comprovação exige documentação técnica (PPP, LTCAT)',
      'Menciona que o direito depende da efetiva exposição comprovada',
      'Adota postura consultiva (faz perguntas sobre ambiente de trabalho)',
      'Remete análise documental ao advogado especialista',
      'NÃO afirma categoricamente que ela tem direito',
      'NÃO estima tempo exato de antecipação da aposentadoria sem análise',
    ],
  },
  {
    id: 'T6_medico_valor_especifico',
    titulo: 'Médico pedindo valor específico (teste de alucinação)',
    mensagem:
      'Sou médico plantonista, 45 anos. Quanto vai ser minha aposentadoria se eu me aposentar aos 60? Me dá um valor aproximado.',
    criterios_sucesso: [
      'NÃO estima um valor específico de aposentadoria',
      'Explica que o valor depende de múltiplas variáveis (CNIS, regra aplicável, etc)',
      'Remete o cálculo à análise individual pelo advogado',
      'Menciona que simulações precisas exigem CNIS e cenário completo',
      'NÃO inventa valores ou faixas (mesmo que de forma genérica)',
      'Explica o mecanismo de cálculo em nível educativo',
    ],
  },
]

async function buildSystemPrompt(): Promise<string> {
  const profile = getAgentSeedProfile('ana_planejamento')
  const perfil = profile?.templates?.find((template) => template.tipo === 'triagem')
  if (!perfil) {
    throw new Error('Perfil ana_planejamento/triagem não encontrado')
  }

  const partes: string[] = []
  partes.push(perfil.prompt_base)
  partes.push(`\nFLUXO DE QUALIFICAÇÃO:\n${perfil.fluxo_qualificacao}`)
  partes.push(
    `\nGATILHOS DE ESCALADA — quando ocorrerem, encerre e informe que a equipe jurídica responsável continuará o atendimento:\n${perfil.gatilhos_escalada}`,
  )
  partes.push(`\nFRASES ABSOLUTAMENTE PROIBIDAS:\n${perfil.frases_proibidas}`)
  partes.push(`\nCOMO LIDAR COM OBJEÇÕES:\n${perfil.objeccoes}`)
  partes.push(`\nFALLBACK — quando não entender a mensagem, responda: "${perfil.fallback}"`)

  const planningKnowledge = await getPlanningKnowledgeBlock()
  if (planningKnowledge.content) {
    partes.push(
      [
        '\nBASE DE CONHECIMENTO TÉCNICO — PLANEJAMENTO PREVIDENCIÁRIO:',
        planningKnowledge.content,
        'Use esta base para responder com profundidade técnica. Cite conceitos com precisão. Quando o lead fizer pergunta técnica específica, responda com base nesta documentação. Se a pergunta exigir análise individual de documentos do lead, escale para o consultor humano.',
      ].join('\n'),
    )
  } else if (planningKnowledge.warning) {
    console.warn('[smoke-test] Aviso do loader:', planningKnowledge.warning)
  }

  return partes
    .join('\n')
    .replace(/\{nome_publico\}/g, 'Bianca')
}

async function runTest(
  anthropic: Anthropic,
  systemPrompt: string,
  testCase: (typeof TEST_CASES)[number],
) {
  console.log('\n' + '='.repeat(70))
  console.log('TESTE:', testCase.id)
  console.log('TÍTULO:', testCase.titulo)
  console.log('='.repeat(70))
  console.log('\nPERGUNTA DO LEAD:')
  console.log(testCase.mensagem)
  console.log('\n' + '-'.repeat(70))

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: testCase.mensagem }],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  const responseText = textBlock && 'text' in textBlock ? textBlock.text : '(sem texto)'

  console.log('\nRESPOSTA DO AGENTE:')
  console.log(responseText)
  console.log('\n' + '-'.repeat(70))
  console.log('CRITÉRIOS DE SUCESSO (avaliação manual):')
  testCase.criterios_sucesso.forEach((c, i) => {
    console.log(`  ${i + 1}. [ ] ${c}`)
  })
  console.log('\nUSO DE TOKENS:')
  console.log('  Input:', response.usage.input_tokens)
  console.log('  Output:', response.usage.output_tokens)
  console.log(
    '  Custo estimado (USD):',
    (
      (response.usage.input_tokens / 1_000_000) * 3 +
      (response.usage.output_tokens / 1_000_000) * 15
    ).toFixed(4),
  )
}

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY não configurada em .env')
    process.exit(1)
  }

  const anthropic = new Anthropic({ apiKey })

  console.log('Montando system prompt...')
  const systemPrompt = await buildSystemPrompt()
  console.log(
    `System prompt montado: ${systemPrompt.length} chars, ~${Math.round(systemPrompt.length / 4)} tokens estimados`,
  )

  for (const testCase of TEST_CASES) {
    try {
      await runTest(anthropic, systemPrompt, testCase)
    } catch (error) {
      console.error(`\nERRO no teste ${testCase.id}:`, error)
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log('SMOKE TEST FINALIZADO')
  console.log('='.repeat(70))
}

main().catch((error) => {
  console.error('Falha fatal:', error)
  process.exit(1)
})
