import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { seedDefaultPlanningContractTemplate } from '@/lib/contract-template-seeds'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

async function buildUniqueSlug(adminSupabase: any, baseValue: string) {
  const base = slugify(baseValue) || `escritorio-${Date.now()}`
  const { data: existing } = await adminSupabase
    .from('tenants')
    .select('slug')
    .like('slug', `${base}%`)

  const used = new Set(((existing || []) as Array<{ slug: string }>).map(item => item.slug))
  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

function normalizeBillingType(value: unknown) {
  return String(value || '').trim() === 'negociado_manual' ? 'negociado_manual' : 'lp_publica'
}

function parseMoneyInput(value: unknown) {
  const raw = String(value ?? '').trim()
  if (!raw) return null

  const cleaned = raw.replace(/[^\d,.-]/g, '')
  if (!cleaned) return null

  const normalized = cleaned.includes(',') && cleaned.includes('.')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(',', '.')

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.round(parsed * 100) / 100
}

async function normalizeTenantPayload(
  adminSupabase: any,
  body: Record<string, unknown>
) {
  const nome = String(body.nome || '').trim()
  const responsavelEmail = String(body.responsavel_email || '').trim().toLowerCase()

  if (!nome) {
    return { error: 'Nome do escritório é obrigatório' }
  }

  if (!responsavelEmail) {
    return { error: 'Email do responsável é obrigatório' }
  }

  const providedSlug = String(body.slug || '').trim()
  const slug = await buildUniqueSlug(adminSupabase, providedSlug || nome)
  const cobrancaTipo = normalizeBillingType(body.cobranca_tipo)
  const valorMensalContratado = parseMoneyInput(body.valor_mensal_contratado)

  return {
    payload: {
      ...body,
      nome,
      slug,
      cnpj: String(body.cnpj || '').trim() || null,
      responsavel_nome: String(body.responsavel_nome || '').trim() || null,
      responsavel_email: responsavelEmail,
      responsavel_telefone: String(body.responsavel_telefone || '').trim() || null,
      oab_estado: String(body.oab_estado || '').trim().toUpperCase() || null,
      oab_numero: String(body.oab_numero || '').trim() || null,
      notas: String(body.notas || '').trim() || null,
      cobranca_tipo: cobrancaTipo,
      valor_mensal_contratado: valorMensalContratado,
      trial_expira_em: body.trial_expira_em || null,
      twilio_account_sid: String(body.twilio_account_sid || '').trim() || null,
      twilio_auth_token: String(body.twilio_auth_token || '').trim() || null,
      twilio_whatsapp_number: String(body.twilio_whatsapp_number || '').trim() || null,
    },
  }
}

export async function GET() {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: tenants } = await adminSupabase
    .from('tenants').select('*').order('created_at', { ascending: false })

  const [{ count: totalLeads }, { count: totalConversas }] = await Promise.all([
    adminSupabase.from('leads').select('id', { count: 'exact', head: true }),
    adminSupabase.from('conversas').select('id', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    tenants: tenants || [],
    metricas: { totalLeads: totalLeads || 0, totalConversas: totalConversas || 0 },
  })
}

export async function POST(request: Request) {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body = await request.json()
  const normalized = await normalizeTenantPayload(adminSupabase, body)

  if ('error' in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 })
  }

  const { data, error } = await adminSupabase
    .from('tenants')
    .insert(normalized.payload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await seedDefaultPlanningContractTemplate(adminSupabase, {
      id: data.id,
      slug: data.slug,
      nome: data.nome,
      responsavel_email: data.responsavel_email,
    })
  } catch (seedError) {
    console.warn('[contract-template-seed] não foi possível semear template inicial', seedError)
  }

  return NextResponse.json(data)
}
