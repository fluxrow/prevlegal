// Calculadora Previdenciária — Regras EC 103/2019 + Transições

export interface PeriodoContribuicao {
  inicio: string // YYYY-MM-DD
  fim: string    // YYYY-MM-DD (ou vazio = até hoje)
  tipo: 'normal' | 'especial_15' | 'especial_20' | 'especial_25'
}

export interface DadosCalculo {
  data_nascimento: string // YYYY-MM-DD
  sexo: 'M' | 'F'
  periodos: PeriodoContribuicao[]
  salarios_contribuicao?: number[]
}

export interface ResultadoCalculo {
  // Tempo de contribuição
  tempo_contribuicao_meses: number
  tempo_contribuicao_anos: number
  idade_atual_anos: number
  data_calculo: string

  // Elegibilidade
  elegivel_regra_permanente: boolean
  elegivel_regra_pontos: boolean
  elegivel_regra_idade_progressiva: boolean
  elegivel_regra_pedagio_50: boolean
  elegivel_regra_pedagio_100: boolean
  elegivel_aposentadoria_especial: boolean

  // Detalhes
  regra_aplicavel: string | null
  pontos_atuais: number
  pontos_necessarios: number
  falta_contribuicao_meses: number
  falta_idade_meses: number
  previsao_aposentadoria: string | null

  // RMI
  media_salarios: number
  fator_previdenciario: number
  coeficiente_aposentadoria: number
  rmi_estimada: number

  // Detalhamento por regra
  detalhes: DetalhesRegra[]
}

export interface DetalhesRegra {
  nome: string
  elegivel: boolean
  descricao: string
  falta?: string
  previsao?: string
}

// ─── Helpers de data ─────────────────────────────────────────────────────────

function parseDateBR(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function diffMeses(inicio: Date, fim: Date): number {
  const anos = fim.getFullYear() - inicio.getFullYear()
  const meses = fim.getMonth() - inicio.getMonth()
  const dias = fim.getDate() - inicio.getDate()
  let total = anos * 12 + meses
  if (dias < 0) total -= 1
  return Math.max(0, total)
}

function addMeses(data: Date, meses: number): Date {
  const d = new Date(data)
  d.setMonth(d.getMonth() + meses)
  return d
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

// ─── Fator previdenciário (simplificado) ─────────────────────────────────────

function calcularFatorPrevidenciario(
  idadeAnos: number,
  tempoContribAnos: number,
  sexo: 'M' | 'F'
): number {
  const expectativa = sexo === 'F' ? 76.6 : 73.4 // IBGE 2023 (aprox)
  const aliquota = 0.31
  const tc = tempoContribAnos
  const id = idadeAnos
  const es = expectativa - id

  if (es <= 0) return 1
  const f = (tc * aliquota) / es * (1 + (id * aliquota * tc) / 100)
  return Math.min(Math.max(parseFloat(f.toFixed(4)), 0.3), 1.4)
}

// ─── Regras de aposentadoria EC 103/2019 ─────────────────────────────────────

// Regra permanente (pós-reforma): 65H/62M + 20 anos contrib (H) / 15 anos (M)
function regraIdadePermanente(
  idadeMeses: number,
  tcMeses: number,
  sexo: 'M' | 'F'
): { elegivel: boolean; faltaIdadeMeses: number; faltaTcMeses: number } {
  const idadeMinima = sexo === 'M' ? 65 * 12 : 62 * 12
  const tcMinimo = sexo === 'M' ? 20 * 12 : 15 * 12
  const faltaIdade = Math.max(0, idadeMinima - idadeMeses)
  const faltaTc = Math.max(0, tcMinimo - tcMeses)
  return { elegivel: faltaIdade === 0 && faltaTc === 0, faltaIdadeMeses: faltaIdade, faltaTcMeses: faltaTc }
}

// Regra de pontos 2026: 105/100 pontos (homem/mulher) + tc mínimo
// Pontos = idade + tempo de contribuição
function regraTransicaoPontos(
  idadeMeses: number,
  tcMeses: number,
  sexo: 'M' | 'F',
  anoAtual: number
): { elegivel: boolean; pontosAtuais: number; pontosNecessarios: number; faltaMeses: number } {
  // Progressão anual de pontos (EC 103/2019)
  // Homens: 96 (2019) → +1/ano até 105 em 2028
  // Mulheres: 86 (2019) → +1/ano até 100 em 2033
  const pontosMH: Record<number, number> = { 2019: 96, 2020: 97, 2021: 98, 2022: 99, 2023: 100, 2024: 101, 2025: 102, 2026: 103 }
  const pontosMF: Record<number, number> = { 2019: 86, 2020: 87, 2021: 88, 2022: 89, 2023: 90, 2024: 91, 2025: 92, 2026: 93 }

  const pontosH = pontosMH[anoAtual] ?? (anoAtual >= 2028 ? 105 : 96 + (anoAtual - 2019))
  const pontosF = pontosMF[anoAtual] ?? (anoAtual >= 2033 ? 100 : 86 + (anoAtual - 2019))

  const necessarios = sexo === 'M' ? pontosH : pontosF
  const tcMinimo = sexo === 'M' ? 35 * 12 : 30 * 12

  const idadeAnos = idadeMeses / 12
  const tcAnos = tcMeses / 12
  const pontos = idadeAnos + tcAnos

  const elegivel = pontos >= necessarios && tcMeses >= tcMinimo
  const faltaPontos = Math.max(0, necessarios - pontos)

  return {
    elegivel,
    pontosAtuais: parseFloat(pontos.toFixed(2)),
    pontosNecessarios: necessarios,
    faltaMeses: Math.ceil(faltaPontos * 6), // aproximação: cada mês = 0.167 ponto (1/12 de ponto/ano)
  }
}

// Regra de idade progressiva: 56M/61H (2022) → 57M/62H (2023) → ... → 62M/65H
function regraTransicaoIdadeProgressiva(
  idadeMeses: number,
  tcMeses: number,
  sexo: 'M' | 'F',
  anoAtual: number
): { elegivel: boolean; faltaIdadeMeses: number; faltaTcMeses: number } {
  const tcMinimo = sexo === 'M' ? 30 * 12 : 35 * 12

  // Progressão de idade (a cada 2 anos +1 ano)
  const baseH = 61; const baseF = 56
  const anoBase = 2022
  const incrementos = Math.floor((anoAtual - anoBase) / 2)
  const idadeMinH = Math.min(65, baseH + incrementos) * 12
  const idadeMinF = Math.min(62, baseF + incrementos) * 12

  const idadeMin = sexo === 'M' ? idadeMinH : idadeMinF
  const faltaIdade = Math.max(0, idadeMin - idadeMeses)
  const faltaTc = Math.max(0, tcMinimo - tcMeses)

  return { elegivel: faltaIdade === 0 && faltaTc === 0, faltaIdadeMeses: faltaIdade, faltaTcMeses: faltaTc }
}

// Pedágio 50%: tinha até 2 anos para se aposentar em 13/11/2019
// Elegível se tinha ≥ (tcMinimo - 24 meses) em nov/2019
function regraTransicaoPedagio50(
  tcMesesNov2019: number,
  tcMesesAtual: number,
  sexo: 'M' | 'F'
): { elegivel: boolean; faltaMeses: number } {
  const tcMinimo = sexo === 'M' ? 35 * 12 : 30 * 12
  const faltavaEmNov2019 = tcMinimo - tcMesesNov2019

  if (faltavaEmNov2019 <= 0 || faltavaEmNov2019 > 24) {
    return { elegivel: false, faltaMeses: 0 }
  }

  // Deve cumprir o tc mínimo + 50% do que faltava
  const tcNecessario = tcMinimo + Math.ceil(faltavaEmNov2019 * 0.5)
  const falta = Math.max(0, tcNecessario - tcMesesAtual)
  return { elegivel: falta === 0, faltaMeses: falta }
}

// Pedágio 100%: qualquer pessoa (sem requisito de proximidade)
// Deve ter tc mínimo + 100% do que faltava em nov/2019 + idade mínima
function regraTransicaoPedagio100(
  tcMesesNov2019: number,
  tcMesesAtual: number,
  idadeMeses: number,
  sexo: 'M' | 'F'
): { elegivel: boolean; faltaMeses: number; faltaIdadeMeses: number } {
  const tcMinimo = sexo === 'M' ? 35 * 12 : 30 * 12
  const idadeMin = sexo === 'M' ? 60 * 12 : 57 * 12
  const faltavaEmNov2019 = Math.max(0, tcMinimo - tcMesesNov2019)
  const tcNecessario = tcMinimo + faltavaEmNov2019

  const faltaTc = Math.max(0, tcNecessario - tcMesesAtual)
  const faltaIdade = Math.max(0, idadeMin - idadeMeses)
  return { elegivel: faltaTc === 0 && faltaIdade === 0, faltaMeses: faltaTc, faltaIdadeMeses: faltaIdade }
}

// Aposentadoria especial: tc em atividade especial (15/20/25 anos)
function regraEspecial(
  tcEspecial15: number,
  tcEspecial20: number,
  tcEspecial25: number
): { elegivel: boolean; tipoEspecial: string | null } {
  if (tcEspecial15 >= 15 * 12) return { elegivel: true, tipoEspecial: '15 anos' }
  if (tcEspecial20 >= 20 * 12) return { elegivel: true, tipoEspecial: '20 anos' }
  if (tcEspecial25 >= 25 * 12) return { elegivel: true, tipoEspecial: '25 anos' }
  return { elegivel: false, tipoEspecial: null }
}

// ─── Coeficiente de aposentadoria por pontos ─────────────────────────────────

function calcularCoeficiente(tcAnos: number, sexo: 'M' | 'F'): number {
  const tcRef = sexo === 'M' ? 35 : 30
  const base = 0.60
  const extra = Math.max(0, tcAnos - tcRef) * 0.02
  return Math.min(1.0, parseFloat((base + extra).toFixed(4)))
}

// ─── Cálculo principal ───────────────────────────────────────────────────────

export function calcularPrev(dados: DadosCalculo): ResultadoCalculo {
  const hoje = new Date()
  const nascimento = parseDateBR(dados.data_nascimento)
  const nov2019 = new Date(2019, 10, 13) // 13/11/2019

  // Idade atual em meses
  const idadeMeses = diffMeses(nascimento, hoje)
  const idadeAnos = parseFloat((idadeMeses / 12).toFixed(2))

  // Calcular TC por período
  let tcTotalMeses = 0
  let tcEspecial15 = 0
  let tcEspecial20 = 0
  let tcEspecial25 = 0
  let tcMesesNov2019 = 0

  for (const p of dados.periodos) {
    const inicio = parseDateBR(p.inicio)
    const fim = p.fim ? parseDateBR(p.fim) : hoje

    const mesesNov2019 = diffMeses(inicio, fim < nov2019 ? fim : nov2019 < inicio ? new Date(0) : nov2019)

    let meses = diffMeses(inicio, fim)

    // Conversão de tempo especial em normal
    if (p.tipo === 'especial_15') {
      const fator = 35 / 15
      tcEspecial15 += meses
      meses = Math.round(meses * fator)
    } else if (p.tipo === 'especial_20') {
      const fator = 35 / 20
      tcEspecial20 += meses
      meses = Math.round(meses * fator)
    } else if (p.tipo === 'especial_25') {
      const fator = 35 / 25
      tcEspecial25 += meses
      meses = Math.round(meses * fator)
    }

    tcTotalMeses += meses
    if (mesesNov2019 > 0) tcMesesNov2019 += mesesNov2019
  }

  const tcAnos = parseFloat((tcTotalMeses / 12).toFixed(2))
  const anoAtual = hoje.getFullYear()

  // ─── Regras ───────────────────────────────────────────────────────────────

  const permR = regraIdadePermanente(idadeMeses, tcTotalMeses, dados.sexo)
  const pontosR = regraTransicaoPontos(idadeMeses, tcTotalMeses, dados.sexo, anoAtual)
  const idadeProgR = regraTransicaoIdadeProgressiva(idadeMeses, tcTotalMeses, dados.sexo, anoAtual)
  const pedagio50R = regraTransicaoPedagio50(tcMesesNov2019, tcTotalMeses, dados.sexo)
  const pedagio100R = regraTransicaoPedagio100(tcMesesNov2019, tcTotalMeses, idadeMeses, dados.sexo)
  const especialR = regraEspecial(tcEspecial15, tcEspecial20, tcEspecial25)

  // ─── Regra mais favorável aplicável ────────────────────────────────────────

  let regraAplicavel: string | null = null
  let previsaoAposentadoria: string | null = null
  let faltaContribMeses = 0
  let faltaIdadeMeses = 0

  if (pedagio50R.elegivel) {
    regraAplicavel = 'Pedágio 50%'
  } else if (pontosR.elegivel) {
    regraAplicavel = 'Regra de Pontos'
  } else if (idadeProgR.elegivel) {
    regraAplicavel = 'Idade Progressiva'
  } else if (permR.elegivel) {
    regraAplicavel = 'Regra Permanente'
  } else if (pedagio100R.elegivel) {
    regraAplicavel = 'Pedágio 100%'
  } else if (especialR.elegivel) {
    regraAplicavel = `Aposentadoria Especial (${especialR.tipoEspecial})`
  }

  // Calcular quanto falta para a regra mais próxima
  const faltasReg = [
    { meses: pedagio50R.faltaMeses, regra: 'Pedágio 50%', idadeMeses: 0 },
    { meses: pontosR.faltaMeses, regra: 'Pontos', idadeMeses: 0 },
    { meses: idadeProgR.faltaTcMeses + idadeProgR.faltaIdadeMeses, regra: 'Idade Progressiva', idadeMeses: idadeProgR.faltaIdadeMeses },
    { meses: permR.faltaContribMeses + permR.faltaIdadeMeses, regra: 'Permanente', idadeMeses: permR.faltaIdadeMeses },
  ].filter(r => r.meses > 0).sort((a, b) => a.meses - b.meses)

  if (!regraAplicavel && faltasReg.length > 0) {
    const maisProxima = faltasReg[0]
    faltaContribMeses = maisProxima.meses - maisProxima.idadeMeses
    faltaIdadeMeses = maisProxima.idadeMeses
    previsaoAposentadoria = formatDate(addMeses(hoje, maisProxima.meses))
  }

  // ─── RMI ──────────────────────────────────────────────────────────────────

  const salarios = dados.salarios_contribuicao ?? []
  const media = salarios.length > 0
    ? parseFloat((salarios.reduce((s, v) => s + v, 0) / salarios.length).toFixed(2))
    : 0

  const fatorPrev = calcularFatorPrevidenciario(idadeAnos, tcAnos, dados.sexo)
  const coeficiente = calcularCoeficiente(tcAnos, dados.sexo)

  // RMI: média × coeficiente (regra pontos) ou média × fator (regra permanente)
  const rmiEstimada = media > 0
    ? parseFloat((media * (regraAplicavel?.includes('Pontos') || regraAplicavel?.includes('Progressiva') || regraAplicavel?.includes('Pedágio')
      ? coeficiente
      : fatorPrev)).toFixed(2))
    : 0

  // ─── Detalhes por regra ────────────────────────────────────────────────────

  const detalhes: DetalhesRegra[] = [
    {
      nome: 'Pedágio 50% (Transição)',
      elegivel: pedagio50R.elegivel,
      descricao: 'Para quem faltava até 2 anos em nov/2019. Deve cumprir TC + 50% do que faltava.',
      falta: pedagio50R.faltaMeses > 0 ? `Faltam ${pedagio50R.faltaMeses} meses de contribuição` : undefined,
    },
    {
      nome: `Regra de Pontos ${pontosR.pontosNecessarios} pts (Transição)`,
      elegivel: pontosR.elegivel,
      descricao: `Soma de idade + TC deve atingir ${pontosR.pontosNecessarios} pontos. Atual: ${pontosR.pontosAtuais.toFixed(1)} pts.`,
      falta: !pontosR.elegivel ? `Faltam ${(pontosR.pontosNecessarios - pontosR.pontosAtuais).toFixed(1)} pontos (≈ ${pontosR.faltaMeses} meses)` : undefined,
      previsao: !pontosR.elegivel && pontosR.faltaMeses > 0 ? formatDate(addMeses(hoje, pontosR.faltaMeses)) : undefined,
    },
    {
      nome: 'Idade Progressiva (Transição)',
      elegivel: idadeProgR.elegivel,
      descricao: `Idade mínima progressiva (${dados.sexo === 'M' ? 'homem' : 'mulher'}) + TC mínimo. Regra para quem já contribuía antes da reforma.`,
      falta: !idadeProgR.elegivel
        ? [idadeProgR.faltaTcMeses > 0 ? `${idadeProgR.faltaTcMeses} meses de contribuição` : '', idadeProgR.faltaIdadeMeses > 0 ? `${idadeProgR.faltaIdadeMeses} meses de idade` : ''].filter(Boolean).join(' + ')
        : undefined,
    },
    {
      nome: 'Regra Permanente (pós-reforma)',
      elegivel: permR.elegivel,
      descricao: `${dados.sexo === 'M' ? '65 anos + 20 anos TC' : '62 anos + 15 anos TC'}. Regra definitiva após transição.`,
      falta: !permR.elegivel
        ? [permR.faltaTcMeses > 0 ? `${permR.faltaTcMeses} meses de contribuição` : '', permR.faltaIdadeMeses > 0 ? `${permR.faltaIdadeMeses} meses de idade` : ''].filter(Boolean).join(' + ')
        : undefined,
    },
    {
      nome: 'Pedágio 100% (Transição)',
      elegivel: pedagio100R.elegivel,
      descricao: `TC mínimo + 100% do que faltava em nov/2019 + idade mínima (${dados.sexo === 'M' ? '60' : '57'} anos).`,
      falta: !pedagio100R.elegivel
        ? [pedagio100R.faltaMeses > 0 ? `${pedagio100R.faltaMeses} meses de contribuição` : '', pedagio100R.faltaIdadeMeses > 0 ? `${pedagio100R.faltaIdadeMeses} meses de idade` : ''].filter(Boolean).join(' + ')
        : undefined,
    },
    {
      nome: 'Aposentadoria Especial',
      elegivel: especialR.elegivel,
      descricao: `Para exposição a agentes nocivos. Prazo: 15, 20 ou 25 anos conforme o risco.`,
      falta: !especialR.elegivel ? 'Sem tempo especial suficiente registrado' : undefined,
    },
  ]

  return {
    tempo_contribuicao_meses: tcTotalMeses,
    tempo_contribuicao_anos: tcAnos,
    idade_atual_anos: idadeAnos,
    data_calculo: hoje.toISOString(),

    elegivel_regra_permanente: permR.elegivel,
    elegivel_regra_pontos: pontosR.elegivel,
    elegivel_regra_idade_progressiva: idadeProgR.elegivel,
    elegivel_regra_pedagio_50: pedagio50R.elegivel,
    elegivel_regra_pedagio_100: pedagio100R.elegivel,
    elegivel_aposentadoria_especial: especialR.elegivel,

    regra_aplicavel: regraAplicavel,
    pontos_atuais: pontosR.pontosAtuais,
    pontos_necessarios: pontosR.pontosNecessarios,
    falta_contribuicao_meses: faltaContribMeses,
    falta_idade_meses: faltaIdadeMeses,
    previsao_aposentadoria: previsaoAposentadoria,

    media_salarios: media,
    fator_previdenciario: fatorPrev,
    coeficiente_aposentadoria: coeficiente,
    rmi_estimada: rmiEstimada,

    detalhes,
  }
}
