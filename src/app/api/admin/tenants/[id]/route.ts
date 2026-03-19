import { NextResponse } from 'next/server'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

async function buildUniqueSlug(
  adminSupabase: any,
  baseValue: string,
  currentId: string
) {
  const base = slugify(baseValue) || `escritorio-${Date.now()}`
  const { data: existing } = await adminSupabase
    .from('tenants')
    .select('id, slug')
    .like('slug', `${base}%`)

  const used = new Set(
    ((existing || []) as Array<{ id: string; slug: string }>)
      .filter(item => item.id !== currentId)
      .map(item => item.slug)
  )
  if (!used.has(base)) return base

  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id } = await params
  const body = await request.json()
  const { data: current, error: currentError } = await adminSupabase
    .from('tenants')
    .select('id, nome, slug')
    .eq('id', id)
    .single()

  if (currentError || !current) {
    return NextResponse.json({ error: 'Escritório não encontrado' }, { status: 404 })
  }

  const nome = String(body.nome || current.nome || '').trim()
  const responsavelEmail = String(body.responsavel_email || '').trim().toLowerCase()
  const rawSlug = String(body.slug || '').trim()
  const slug = await buildUniqueSlug(adminSupabase, rawSlug || nome || current.slug, id)

  const { data, error } = await adminSupabase
    .from('tenants')
    .update({
      ...body,
      nome,
      slug,
      cnpj: String(body.cnpj || '').trim() || null,
      responsavel_nome: String(body.responsavel_nome || '').trim() || null,
      responsavel_email: responsavelEmail || null,
      responsavel_telefone: String(body.responsavel_telefone || '').trim() || null,
      oab_estado: String(body.oab_estado || '').trim().toUpperCase() || null,
      oab_numero: String(body.oab_numero || '').trim() || null,
      notas: String(body.notas || '').trim() || null,
      trial_expira_em: body.trial_expira_em || null,
      twilio_account_sid: String(body.twilio_account_sid || '').trim() || null,
      twilio_auth_token: String(body.twilio_auth_token || '').trim() || null,
      twilio_whatsapp_number: String(body.twilio_whatsapp_number || '').trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await verificarAdminAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!await verificarAdminReauthRecente()) return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { id } = await params
  await adminSupabase.from('tenants').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
