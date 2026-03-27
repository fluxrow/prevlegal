import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { sendWhatsAppMessage } from '@/lib/whatsapp-provider'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Prompt padrão do sistema caso o escritório não tenha configurado um personalizado
const PROMPT_PADRAO = `Você é Ana, assistente virtual de um escritório de advocacia previdenciária especializado em revisão de benefícios do INSS.

Seu objetivo é qualificar leads e agendar consultas gratuitas.

CONTEXTO DO LEAD:
Nome: {nome}
Benefício (NB): {nb}
Banco pagador: {banco}
Valor atual: R$ {valor}
Ganho potencial com revisão: R$ {ganho}

INSTRUÇÕES:
- Seja cordial, direta e profissional
- Use linguagem simples, acessível para idosos
- Nunca prometa valores ou resultados garantidos
- Foque em agendar uma consulta gratuita
- Se o lead demonstrar interesse, peça disponibilidade de horário
- Se recusar, agradeça e encerre educadamente
- Respostas curtas (máximo 3 linhas no WhatsApp)
- Nunca use markdown, listas ou asteriscos`

export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminSupabase()
    const { mensagem_id } = await request.json()

    if (!mensagem_id) {
      return NextResponse.json({ error: 'mensagem_id obrigatório' }, { status: 400 })
    }

    // 1. Buscar a mensagem recebida + dados do lead
    const { data: mensagem, error: msgError } = await supabase
      .from('mensagens_inbound')
      .select(`
        id,
        mensagem,
        telefone_remetente,
        lead_id,
        leads (
          nome, nb, banco, valor_rma, ganho_potencial, status, campanha_id, tenant_id
        )
      `)
      .eq('id', mensagem_id)
      .single()

    if (msgError || !mensagem) {
      return NextResponse.json({ error: 'Mensagem não encontrada' }, { status: 404 })
    }

    // 2. Buscar configurações do agente
    const tenantId = (mensagem.leads as any)?.tenant_id || null
    const { data: config } = await getConfiguracaoAtual(
      supabase,
      tenantId,
      'agente_ativo, agente_nome, agente_prompt_sistema, agente_modelo, agente_max_tokens, agente_resposta_automatica, agente_horario_inicio, agente_horario_fim, agente_apenas_dias_uteis, agente_fluxo_qualificacao, agente_exemplos_dialogo, agente_gatilhos_escalada, agente_frases_proibidas, agente_objeccoes, agente_fallback',
    )

    if (!config?.agente_ativo) {
      return NextResponse.json({ error: 'Agente não está ativo' }, { status: 403 })
    }

    // 3. Verificar janela de horário
    if (config.agente_horario_inicio && config.agente_horario_fim) {
      const agora = new Date()
      const horaAtual = agora.toTimeString().slice(0, 5) // "HH:MM"
      const diaSemana = agora.getDay() // 0=dom, 6=sáb

      if (config.agente_apenas_dias_uteis && (diaSemana === 0 || diaSemana === 6)) {
        return NextResponse.json({ error: 'Fora do horário de atendimento (fim de semana)' }, { status: 403 })
      }

      if (horaAtual < config.agente_horario_inicio || horaAtual > config.agente_horario_fim) {
        return NextResponse.json({ error: 'Fora do horário de atendimento' }, { status: 403 })
      }
    }

    // 4. Buscar histórico da conversa (últimas 10 mensagens do lead)
    const lead = mensagem.leads as any
    const historico: { role: 'user' | 'assistant'; content: string }[] = []

    if (mensagem.lead_id) {
      const { data: inbounds } = await supabase
        .from('mensagens_inbound')
        .select('mensagem, respondido_por_agente, resposta_agente, created_at')
        .eq('lead_id', mensagem.lead_id)
        .neq('id', mensagem_id)
        .order('created_at', { ascending: true })
        .limit(10)

      inbounds?.forEach(msg => {
        historico.push({ role: 'user', content: msg.mensagem })
        if (msg.respondido_por_agente && msg.resposta_agente) {
          historico.push({ role: 'assistant', content: msg.resposta_agente })
        }
      })
    }

    // Adicionar a mensagem atual ao histórico
    historico.push({ role: 'user', content: mensagem.mensagem })

    // 5. Montar system prompt com dados do lead
    const promptBase = config.agente_prompt_sistema || PROMPT_PADRAO
    const partes = [promptBase]
    if (config.agente_fluxo_qualificacao) partes.push(`\nFLUXO DE QUALIFICAÇÃO:\n${config.agente_fluxo_qualificacao}`)
    if (config.agente_exemplos_dialogo) partes.push(`\nEXEMPLOS DE DIÁLOGO:\n${config.agente_exemplos_dialogo}`)
    if (config.agente_gatilhos_escalada) partes.push(`\nGATILHOS DE ESCALADA — quando ocorrerem, encerre e informe que a advogada entrará em contato:\n${config.agente_gatilhos_escalada}`)
    if (config.agente_frases_proibidas) partes.push(`\nFRASES ABSOLUTAMENTE PROIBIDAS:\n${config.agente_frases_proibidas}`)
    if (config.agente_objeccoes) partes.push(`\nCOMO LIDAR COM OBJEÇÕES:\n${config.agente_objeccoes}`)
    if (config.agente_fallback) partes.push(`\nFALLBACK — quando não entender a mensagem, responda: "${config.agente_fallback}"`)

    const systemPrompt = partes.join('\n')
      .replace('{nome}', lead?.nome || 'Beneficiário')
      .replace('{nb}', lead?.nb || 'N/A')
      .replace('{banco}', lead?.banco || 'N/A')
      .replace('{valor}', lead?.valor_rma ? `${Number(lead.valor_rma).toFixed(2)}` : 'N/A')
      .replace('{ganho}', lead?.ganho_potencial ? `${Number(lead.ganho_potencial).toFixed(2)}` : 'N/A')

    // 6. Chamar Claude
    const response = await anthropic.messages.create({
      model: config.agente_modelo || 'claude-sonnet-4-20250514',
      max_tokens: config.agente_max_tokens || 500,
      system: systemPrompt,
      messages: historico,
    })

    const respostaTexto = response.content[0].type === 'text' ? response.content[0].text : ''

    if (!respostaTexto) {
      return NextResponse.json({ error: 'Resposta vazia do modelo' }, { status: 500 })
    }

    // 7. Marcar mensagem como respondida pelo agente
    await supabase
      .from('mensagens_inbound')
      .update({
        respondido_por_agente: true,
        resposta_agente: respostaTexto,
        lido: true,
        lido_em: new Date().toISOString(),
      })
      .eq('id', mensagem_id)

    // 8. Se resposta automática ativa, enviar via Twilio
    if (config.agente_resposta_automatica && mensagem.telefone_remetente) {
      const result = await sendWhatsAppMessage({
        tenantId,
        to: mensagem.telefone_remetente,
        body: respostaTexto,
      })

      if (!result.success) {
        console.error('Falha ao enviar resposta automática via WhatsApp:', result.error)
      }
    }

    return NextResponse.json({
      success: true,
      resposta: respostaTexto,
      automatico: config.agente_resposta_automatica,
    })

  } catch (error: any) {
    console.error('Erro no agente:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
