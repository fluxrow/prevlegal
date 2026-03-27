import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { canAccessLeadId, getTenantContext } from '@/lib/tenant-context'
import { getTwilioCredentialsByTenantId, sendWhatsApp } from '@/lib/twilio'

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function applyTenantFilter(query: any, tenantId: string | null) {
  return tenantId ? query.eq('tenant_id', tenantId) : query.is('tenant_id', null)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authSupabase = await createServerClient()
  const context = await getTenantContext(authSupabase)
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const allowed = await canAccessLeadId(authSupabase, context, id)
  if (!allowed) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

  const { mensagem } = await request.json()
  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'mensagem obrigatória' }, { status: 400 })
  }

  const supabase = createAdminSupabase()

  let leadQuery = supabase
    .from('leads')
    .select('id, nome, telefone, tenant_id')
    .eq('id', id)
  leadQuery = applyTenantFilter(leadQuery, context.tenantId)

  const { data: lead, error: leadError } = await leadQuery.maybeSingle()
  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
  }

  if (!lead.telefone?.trim()) {
    return NextResponse.json({ error: 'Lead sem telefone para iniciar conversa' }, { status: 400 })
  }

  let conversaQuery = supabase
    .from('conversas')
    .select('id')
    .eq('lead_id', lead.id)
  conversaQuery = applyTenantFilter(conversaQuery, context.tenantId)

  let { data: conversa } = await conversaQuery.limit(1).maybeSingle()

  if (!conversa) {
    const { data: criada, error: createError } = await supabase
      .from('conversas')
      .insert({
        tenant_id: context.tenantId,
        lead_id: lead.id,
        telefone: lead.telefone,
        status: 'humano',
        nao_lidas: 0,
      })
      .select('id')
      .single()

    if (createError || !criada) {
      return NextResponse.json(
        { error: createError?.message || 'Falha ao criar conversa' },
        { status: 500 },
      )
    }

    conversa = criada
  }

  const creds = await getTwilioCredentialsByTenantId(context.tenantId)
  const twilioTo = lead.telefone.startsWith('whatsapp:')
    ? lead.telefone
    : `whatsapp:${lead.telefone}`

  const result = await sendWhatsApp(twilioTo, mensagem.trim(), creds)
  if (!result.success) {
    return NextResponse.json(
      { error: result.error || 'Falha no envio WhatsApp' },
      { status: 502 },
    )
  }

  const agora = new Date().toISOString()

  await supabase.from('mensagens_inbound').insert({
    tenant_id: context.tenantId,
    conversa_id: conversa.id,
    lead_id: lead.id,
    telefone_remetente: creds.whatsappNumber,
    telefone_destinatario: lead.telefone,
    mensagem: mensagem.trim(),
    respondido_por_agente: false,
    respondido_manualmente: true,
    resposta_agente: mensagem.trim(),
    twilio_sid: result.sid,
  })

  await supabase
    .from('conversas')
    .update({
      status: 'humano',
      ultima_mensagem: mensagem.trim(),
      ultima_mensagem_at: agora,
      nao_lidas: 0,
    })
    .eq('id', conversa.id)

  return NextResponse.json({
    success: true,
    conversaId: conversa.id,
    leadNome: lead.nome,
  })
}
