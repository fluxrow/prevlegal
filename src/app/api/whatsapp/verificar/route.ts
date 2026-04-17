export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { getTenantContext } from '@/lib/tenant-context'

function createAdminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('0')) return '+55' + digits.slice(1)
  if (digits.length === 11) return '+55' + digits
  if (digits.length === 10) return '+55' + digits.slice(0, 2) + '9' + digits.slice(2)
  if (digits.length === 13 && digits.startsWith('55')) return '+' + digits
  if (digits.length === 12 && digits.startsWith('55')) return '+' + digits.slice(0, 4) + '9' + digits.slice(4)
  return null
}

async function checkWhatsApp(phone: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!
  const authToken = process.env.TWILIO_AUTH_TOKEN!
  const encoded = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}?Fields=whatsapp`
  const res = await fetch(url, { headers: { Authorization: `Basic ${encoded}` } })
  if (!res.ok) return false
  const data = await res.json()
  return data?.whatsapp?.has_whatsapp === true
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const context = await getTenantContext(supabase)
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { lista_id } = await request.json()
    if (!lista_id) return NextResponse.json({ error: 'lista_id obrigatorio' }, { status: 400 })
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Credenciais Twilio nao configuradas' }, { status: 500 })
    }
    let listaQuery = adminClient
      .from('listas')
      .select('id, tenant_id')
      .eq('id', lista_id)
      .limit(1)

    if (context.tenantId) {
      listaQuery = listaQuery.eq('tenant_id', context.tenantId)
    }

    const { data: lista, error: listaError } = await listaQuery.maybeSingle()
    if (listaError || !lista) return NextResponse.json({ error: 'Lista nao encontrada' }, { status: 404 })

    let leadsDaListaQuery = adminClient
      .from('leads')
      .select('id')
      .eq('lista_id', lista_id)
      .limit(500)

    if (context.tenantId) {
      leadsDaListaQuery = leadsDaListaQuery.eq('tenant_id', context.tenantId)
    }

    const { data: listaLeads, error: leadsError } = await leadsDaListaQuery
    if (leadsError || !listaLeads) return NextResponse.json({ error: 'Erro ao buscar leads da lista' }, { status: 500 })
    const leadIds = listaLeads.map((lead: any) => lead.id)

    if (leadIds.length === 0) {
      return NextResponse.json({ success: true, stats: { verificados: 0, com_whatsapp: 0, sem_whatsapp: 0 } })
    }

    const { data: leads, error: fetchError } = await adminClient
      .from('leads')
      .select('id, telefone, nome, tem_whatsapp')
      .in('id', leadIds)
    if (fetchError) return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, stats: { verificados: 0, com_whatsapp: 0, sem_whatsapp: 0 } })
    }
    let comWhatsapp = 0, semWhatsapp = 0, erros = 0
    for (let i = 0; i < leads.length; i += 10) {
      const batch = leads.slice(i, i + 10)
      await Promise.all(batch.map(async (lead: any) => {
        const phone = normalizePhone(lead.telefone || '')
        if (!phone) {
          await adminClient.from('leads').update({ tem_whatsapp: false, whatsapp_verificado_em: new Date().toISOString() }).eq('id', lead.id)
          semWhatsapp++; return
        }
        try {
          const hasWpp = await checkWhatsApp(phone)
          await adminClient.from('leads').update({ tem_whatsapp: hasWpp, whatsapp_verificado_em: new Date().toISOString() }).eq('id', lead.id)
          if (hasWpp) comWhatsapp++; else semWhatsapp++
        } catch { erros++ }
      }))
      if (i + 10 < leads.length) await new Promise(r => setTimeout(r, 300))
    }
    const { data: statsLeads } = await adminClient.from('leads').select('tem_whatsapp').in('id', leadIds)
    await adminClient.from('listas').update({
      total_com_whatsapp: (statsLeads || []).filter((l: any) => l.tem_whatsapp === true).length,
      total_sem_whatsapp: (statsLeads || []).filter((l: any) => l.tem_whatsapp === false).length,
      total_nao_verificado: (statsLeads || []).filter((l: any) => l.tem_whatsapp == null).length,
      updated_at: new Date().toISOString()
    }).eq('id', lista_id)
    return NextResponse.json({ success: true, stats: { verificados: leads.length, com_whatsapp: comWhatsapp, sem_whatsapp: semWhatsapp, erros } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
