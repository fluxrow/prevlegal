export interface DadosDocumento {
  // Lead
  leadNome: string
  leadCpf: string
  leadTelefone?: string
  leadNb?: string
  leadBanco?: string
  leadValorRma?: number
  leadGanhoPotencial?: number
  // Advogado / escritório
  advogadoNome: string
  advogadoOabNumero: string
  advogadoOabEstado: string
  escritorioNome?: string
  escritorioEndereco?: string
  escritorioCidade?: string
  escritorioEstado?: string
  assinaturaTexto?: string
  assinaturaRodape?: string
  // Calculadora
  tempoContribuicaoAnos?: number
  tempoContribuicaoMeses?: number
  idadeAnos?: number
  rmiEstimada?: number
  elegivelRegraAtual?: boolean
  melhorRegra?: string
  // Data
  dataAtual: string
  cidadeAtual?: string
}

export type TipoDocumento = 'peticao_inicial' | 'procuracao' | 'requerimento_inss'

export const TIPOS_DOCUMENTO: Record<TipoDocumento, { label: string; descricao: string; emoji: string }> = {
  peticao_inicial: {
    label: 'Petição Inicial',
    descricao: 'Petição para revisão/concessão de benefício previdenciário',
    emoji: '⚖️',
  },
  procuracao: {
    label: 'Procuração',
    descricao: 'Procuração pública para representação junto ao INSS e Justiça Federal',
    emoji: '📋',
  },
  requerimento_inss: {
    label: 'Requerimento INSS',
    descricao: 'Requerimento administrativo de benefício ou revisão junto ao INSS',
    emoji: '📄',
  },
}

export function buildPrompt(tipo: TipoDocumento, dados: DadosDocumento): string {
  const base = `
Você é um assistente jurídico especializado em direito previdenciário brasileiro.
Gere um documento jurídico profissional, completo e bem estruturado em português formal.
Use os dados fornecidos para preencher todas as informações.
Não invente dados — se uma informação não foi fornecida, use "[PREENCHER]" no lugar.
Retorne APENAS o texto do documento, sem comentários, introduções ou explicações.

DADOS DO BENEFICIÁRIO:
- Nome: ${dados.leadNome}
- CPF: ${dados.leadCpf || '[PREENCHER]'}
- Telefone: ${dados.leadTelefone || '[PREENCHER]'}
- Número do Benefício (NB): ${dados.leadNb || '[PREENCHER]'}
- Banco de recebimento: ${dados.leadBanco || '[PREENCHER]'}
- Valor atual do benefício (RMA): ${dados.leadValorRma ? `R$ ${dados.leadValorRma.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '[PREENCHER]'}
- Ganho potencial estimado: ${dados.leadGanhoPotencial ? `R$ ${dados.leadGanhoPotencial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '[PREENCHER]'}

DADOS DO ADVOGADO:
- Nome: ${dados.advogadoNome || '[PREENCHER]'}
- OAB: ${dados.advogadoOabNumero || '[PREENCHER]'}/${dados.advogadoOabEstado || 'XX'}
- Escritório: ${dados.escritorioNome || '[PREENCHER]'}
- Endereço: ${dados.escritorioEndereco || '[PREENCHER]'}, ${dados.escritorioCidade || '[PREENCHER]'}/${dados.escritorioEstado || 'XX'}

DADOS PREVIDENCIÁRIOS:
- Tempo de contribuição: ${dados.tempoContribuicaoAnos !== undefined ? `${dados.tempoContribuicaoAnos} anos e ${dados.tempoContribuicaoMeses} meses` : '[PREENCHER]'}
- Idade: ${dados.idadeAnos !== undefined ? `${dados.idadeAnos} anos` : '[PREENCHER]'}
- RMI estimada: ${dados.rmiEstimada ? `R$ ${dados.rmiEstimada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '[PREENCHER]'}
- Elegível pela regra atual: ${dados.elegivelRegraAtual !== undefined ? (dados.elegivelRegraAtual ? 'Sim' : 'Não — usar regra de transição') : '[PREENCHER]'}
- Melhor regra aplicável: ${dados.melhorRegra || '[PREENCHER]'}

DATA E LOCAL:
- ${dados.cidadeAtual || dados.escritorioCidade || '[Cidade]'}, ${dados.dataAtual}
`

  if (tipo === 'peticao_inicial') {
    return base + `
INSTRUÇÃO: Gere uma Petição Inicial completa para ação de revisão de benefício previdenciário (readequação do teto) junto à Justiça Federal.
Inclua: endereçamento ao Juízo Federal, qualificação das partes, fatos e fundamentos jurídicos (EC 20/1998, Lei 9.876/1999, EC 103/2019 se aplicável), pedidos (tutela de urgência se cabível, revisão do benefício, diferenças atrasadas corrigidas pelo INPC, honorários), valor da causa e assinatura.
Fundamente com a jurisprudência do STJ e TRF sobre readequação de teto.
`
  }

  if (tipo === 'procuracao') {
    return base + `
INSTRUÇÃO: Gere uma Procuração com poderes amplos para representação do outorgante junto ao INSS, Justiça Federal e demais órgãos previdenciários.
Inclua: qualificação completa do outorgante (beneficiário) e outorgado (advogado com OAB), poderes específicos para causas previdenciárias (requerer, recorrer, transigir, receber valores, dar quitação), cláusula de substabelecimento com ou sem reserva de iguais poderes, local e data para assinatura com 2 testemunhas.
`
  }

  if (tipo === 'requerimento_inss') {
    return base + `
INSTRUÇÃO: Gere um Requerimento Administrativo dirigido ao INSS para revisão de benefício (readequação do teto previdenciário).
Inclua: identificação do requerente, número do benefício, fundamento legal do pedido (EC 20/98 e Lei 9.876/99 — fator previdenciário), histórico contributivo resumido, valor atual vs. valor correto, pedido expresso de revisão com pagamento de diferenças, prazo para resposta (30 dias — Lei 9.784/99), data e assinatura do advogado.
`
  }

  return base
}
