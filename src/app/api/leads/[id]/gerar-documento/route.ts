import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildPrompt, TipoDocumento, DadosDocumento } from '@/lib/doc-templates'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAccessLeadId(supabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { tipo } = await request.json() as { tipo: TipoDocumento }

  // Busca dados do lead
  const { data: lead } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single()
  if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { data: config } = await supabase
    .from('advogados')
    .select('nome, email, oab_numero, oab_estado, escritorio_nome, escritorio_endereco, escritorio_cidade, escritorio_estado, assinatura_texto, assinatura_rodape')
    .eq('usuario_id', context.usuarioId)
    .limit(1)
    .single()

  // Busca resultado da calculadora
  const { data: calc } = await supabase
    .from('calculadora_prev')
    .select('*')
    .eq('lead_id', id)
    .maybeSingle()

  const dados: DadosDocumento = {
    leadNome: lead.nome,
    leadCpf: lead.cpf || '',
    leadTelefone: lead.telefone,
    leadNb: lead.nb,
    leadBanco: lead.banco,
    leadValorRma: lead.valor_rma,
    leadGanhoPotencial: lead.ganho_potencial,
    advogadoNome: config?.nome || '',
    advogadoOabNumero: config?.oab_numero || '',
    advogadoOabEstado: config?.oab_estado || '',
    escritorioNome: config?.escritorio_nome,
    escritorioEndereco: config?.escritorio_endereco,
    escritorioCidade: config?.escritorio_cidade,
    escritorioEstado: config?.escritorio_estado,
    assinaturaTexto: config?.assinatura_texto,
    assinaturaRodape: config?.assinatura_rodape,
    tempoContribuicaoAnos: calc ? Math.floor((calc.tempo_contribuicao_meses ?? 0) / 12) : undefined,
    tempoContribuicaoMeses: calc ? (calc.tempo_contribuicao_meses ?? 0) % 12 : undefined,
    idadeAnos: calc?.idade_atual_anos ?? undefined,
    rmiEstimada: calc?.rmi_estimada ?? undefined,
    elegivelRegraAtual: calc
      ? (calc.elegivel_regra_permanente || calc.elegivel_regra_pontos || calc.elegivel_regra_idade_progressiva || calc.elegivel_regra_pedagio_50 || calc.elegivel_regra_pedagio_100)
      : undefined,
    melhorRegra: calc?.regra_aplicavel ?? undefined,
    dataAtual: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    cidadeAtual: config?.escritorio_cidade ?? undefined,
  }

  const prompt = buildPrompt(tipo, dados)

  // Gera o documento via Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  const conteudo = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as { type: 'text'; text: string }).text)
    .join('')

  // Salva em lead_documentos
  const nomes: Record<TipoDocumento, string> = {
    peticao_inicial: 'Petição Inicial',
    procuracao: 'Procuração',
    requerimento_inss: 'Requerimento INSS',
  }

  const tipoDoc: Record<TipoDocumento, string> = {
    peticao_inicial: 'peticao',
    procuracao: 'procuracao',
    requerimento_inss: 'outro',
  }

  const { data: doc, error } = await supabase
    .from('lead_documentos')
    .insert({
      lead_id: id,
      nome: `${nomes[tipo]} — ${lead.nome}`,
      tipo: tipoDoc[tipo],
      conteudo_texto: conteudo,
      gerado_por_ia: true,
      tipo_documento: tipo,
      modelo_ia: 'claude-sonnet-4-20250514',
      prompt_usado: prompt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documento: doc, conteudo })
}
