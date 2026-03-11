export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const adminClient = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    const { lista_id } = await request.json()
    if (!lista_id) return NextResponse.json({ error: 'lista_id obrigatorio' }, { status: 400 })
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Credenciais Twilio nao configuradas' }, { status: 500 })
    }
    const { data: listaLeads, error: leadsError } = await adminClient
      .from('lista_leads').select('lead_id').eq('lista_id', lista_id).limit(500)
    if (leadsError || !listaLeads) return NextResponse.json({ error: 'Lista nao encontrada' }, { status: 404 })
    const leadIds = listaLeads.map((ll: any) => ll.lead_id)
    const { data: leads, error: fetchError } = await adminClient
      .from('leads').select('id, cpf, nome, tem_whatsapp').in('id', leadIds).is('tem_whatsapp', null)
    if (fetchError) return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 })
    if (!leads || leads.length === 0) {
      return NextResponse.json({ success: true, stats: { verificados: 0, com_whatsapp: 0, sem_whatsapp: 0 } })
    }
    let comWhatsapp = 0, semWhatsapp = 0, erros = 0
    for (let i = 0; i < leads.length; i += 10) {
      const batch = leads.slice(i, i + 10)
      await Promise.all(batch.map(async (lead: any) => {
        const phone = normalizePhone(lead.cpf || '')
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
      com_whatsapp: (statsLeads || []).filter((l: any) => l.tem_whatsapp === true).length,
      sem_whatsapp: (statsLeads || []).filter((l: any) => l.tem_whatsapp === false).length,
      nao_verificado: (statsLeads || []).filter((l: any) => l.tem_whatsapp === null).length,
      updated_at: new Date().toISOString()
    }).eq('id', lista_id)
    return NextResponse.json({ success: true, stats: { verificados: leads.length, com_whatsapp: comWhatsapp, sem_whatsapp: semWhatsapp, erros } })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
