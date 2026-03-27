import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarAdminAuth, verificarAdminReauthRecente } from '@/lib/admin-auth'

type ProviderKind = 'twilio' | 'zapi'

function createAdminSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function getTenantOr404(adminSupabase: ReturnType<typeof createAdminSupabase>, tenantId: string) {
  const { data: tenant, error } = await adminSupabase
    .from('tenants')
    .select('id, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
    .eq('id', tenantId)
    .maybeSingle()

  if (error || !tenant) return null
  return tenant
}

async function syncTenantLegacyFromDefaultTwilio(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  tenantId: string,
) {
  const { data: currentDefault } = await adminSupabase
    .from('whatsapp_numbers')
    .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number, phone')
    .eq('tenant_id', tenantId)
    .eq('provider', 'twilio')
    .eq('ativo', true)
    .eq('is_default', true)
    .limit(1)
    .maybeSingle()

  await adminSupabase
    .from('tenants')
    .update({
      twilio_account_sid: currentDefault?.twilio_account_sid || null,
      twilio_auth_token: currentDefault?.twilio_auth_token || null,
      twilio_whatsapp_number: currentDefault?.twilio_whatsapp_number || currentDefault?.phone || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tenantId)
}

function normalizeString(value: unknown) {
  return String(value || '').trim() || null
}

function normalizeBoolean(value: unknown, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'sim', 'yes'].includes(normalized)) return true
    if (['false', '0', 'nao', 'não', 'no'].includes(normalized)) return false
  }
  return fallback
}

async function normalizeChannelPayload(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  tenant: Awaited<ReturnType<typeof getTenantOr404>>,
  body: Record<string, unknown>,
) {
  const provider = String(body.provider || '').trim().toLowerCase() as ProviderKind
  if (!['twilio', 'zapi'].includes(provider)) {
    return { error: 'Provider invalido. Use twilio ou zapi.' }
  }

  const ativo = normalizeBoolean(body.ativo, true)
  const isDefault = ativo ? normalizeBoolean(body.is_default, false) : false
  const phone = normalizeString(body.phone)
  const purpose = normalizeString(body.purpose) || 'ambos'

  const payload: Record<string, unknown> = {
    tenant_id: tenant!.id,
    provider,
    label: normalizeString(body.label),
    phone,
    purpose,
    ativo,
    is_default: isDefault,
    updated_at: new Date().toISOString(),
  }

  if (provider === 'twilio') {
    const accountSid = normalizeString(body.twilio_account_sid) || tenant?.twilio_account_sid || null
    const authToken = normalizeString(body.twilio_auth_token) || tenant?.twilio_auth_token || null
    const whatsappNumber =
      normalizeString(body.twilio_whatsapp_number) ||
      phone ||
      tenant?.twilio_whatsapp_number ||
      null

    if (!accountSid || !authToken || !whatsappNumber) {
      return { error: 'Twilio exige Account SID, Auth Token e numero WhatsApp.' }
    }

    payload.twilio_account_sid = accountSid
    payload.twilio_auth_token = authToken
    payload.twilio_whatsapp_number = whatsappNumber
    payload.phone = phone || whatsappNumber
    payload.zapi_instance_id = null
    payload.zapi_instance_token = null
    payload.zapi_client_token = null
    payload.zapi_base_url = null
    payload.zapi_connected_phone = null
  }

  if (provider === 'zapi') {
    const instanceId = normalizeString(body.zapi_instance_id)
    const instanceToken = normalizeString(body.zapi_instance_token)
    if (!instanceId || !instanceToken) {
      return { error: 'Z-API exige Instance ID e Instance Token.' }
    }

    payload.zapi_instance_id = instanceId
    payload.zapi_instance_token = instanceToken
    payload.zapi_client_token = normalizeString(body.zapi_client_token)
    payload.zapi_base_url = normalizeString(body.zapi_base_url) || 'https://api.z-api.io'
    payload.zapi_connected_phone = normalizeString(body.zapi_connected_phone)
    payload.twilio_account_sid = null
    payload.twilio_auth_token = null
    payload.twilio_whatsapp_number = null
  }

  return { payload }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await verificarAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!await verificarAdminReauthRecente()) {
    return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })
  }

  const { id } = await params
  const adminSupabase = createAdminSupabase()
  const tenant = await getTenantOr404(adminSupabase, id)

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const { data, error } = await adminSupabase
    .from('whatsapp_numbers')
    .select('*')
    .eq('tenant_id', id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    numbers: data || [],
    legacy: {
      twilio_account_sid: tenant.twilio_account_sid,
      twilio_auth_token: tenant.twilio_auth_token,
      twilio_whatsapp_number: tenant.twilio_whatsapp_number,
    },
  })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!await verificarAdminAuth()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!await verificarAdminReauthRecente()) {
    return NextResponse.json({ error: 'Reauthentication required' }, { status: 428 })
  }

  const { id } = await params
  const adminSupabase = createAdminSupabase()
  const tenant = await getTenantOr404(adminSupabase, id)

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 })
  }

  const body = await request.json()
  const normalized = await normalizeChannelPayload(adminSupabase, tenant, body)
  if ('error' in normalized) {
    return NextResponse.json({ error: normalized.error }, { status: 400 })
  }

  if (normalized.payload.is_default) {
    await adminSupabase
      .from('whatsapp_numbers')
      .update({ is_default: false, updated_at: new Date().toISOString() })
      .eq('tenant_id', id)
  }

  const { data, error } = await adminSupabase
    .from('whatsapp_numbers')
    .insert({
      ...normalized.payload,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await syncTenantLegacyFromDefaultTwilio(adminSupabase, id)
  return NextResponse.json(data)
}
