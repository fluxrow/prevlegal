import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  TwilioCredentials,
  getTwilioCredentialsByTenantId,
  normalizeWhatsAppRecipient,
  sendWhatsApp,
} from '@/lib/twilio'

export type WhatsAppProviderKind = 'twilio' | 'zapi'

type WhatsAppNumberRow = {
  id: string
  tenant_id: string | null
  provider: WhatsAppProviderKind
  label: string | null
  phone: string | null
  is_default: boolean | null
  ativo: boolean | null
  purpose: string | null
  twilio_account_sid: string | null
  twilio_auth_token: string | null
  twilio_whatsapp_number: string | null
  zapi_instance_id: string | null
  zapi_instance_token: string | null
  zapi_client_token: string | null
  zapi_base_url: string | null
  zapi_connected_phone: string | null
  metadata: Record<string, unknown> | null
}

export interface ResolvedWhatsAppChannel {
  id: string | null
  tenantId: string | null
  provider: WhatsAppProviderKind
  label: string | null
  from: string
  purpose: string | null
  metadata: Record<string, unknown> | null
  credentials?: TwilioCredentials
  zapi?: {
    instanceId: string
    instanceToken: string
    clientToken: string | null
    baseUrl: string
  }
}

export interface ZApiRoutingContext {
  tenantId: string | null
  channelId: string | null
  from: string | null
}

export interface SendWhatsAppMessageInput {
  tenantId: string | null
  to: string
  body: string
  preferredNumberId?: string | null
}

export interface SendWhatsAppMessageResult {
  success: boolean
  provider: WhatsAppProviderKind
  channelId: string | null
  from: string
  externalMessageId: string
  error?: string
}

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function normalizeZApiBaseUrl(value?: string | null) {
  const fallback = 'https://api.z-api.io'
  const raw = String(value || fallback).trim()

  if (!raw) return fallback

  try {
    const parsed = new URL(raw)
    return parsed.origin.replace(/\/+$/, '') || fallback
  } catch {
    return fallback
  }
}

function normalizeDigitsOnly(value?: string | null) {
  return normalizeWhatsAppRecipient(value).replace(/\D/g, '')
}

function mapTwilioRowToChannel(row: WhatsAppNumberRow): ResolvedWhatsAppChannel | null {
  if (
    row.provider !== 'twilio' ||
    !row.twilio_account_sid ||
    !row.twilio_auth_token
  ) {
    return null
  }

  const from = row.twilio_whatsapp_number || row.phone
  if (!from) return null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    provider: 'twilio',
    label: row.label,
    from,
    purpose: row.purpose,
    metadata: row.metadata || null,
    credentials: {
      accountSid: row.twilio_account_sid,
      authToken: row.twilio_auth_token,
      whatsappNumber: from,
    },
  }
}

function mapZApiRowToChannel(row: WhatsAppNumberRow): ResolvedWhatsAppChannel | null {
  if (
    row.provider !== 'zapi' ||
    !row.zapi_instance_id ||
    !row.zapi_instance_token
  ) {
    return null
  }

  const from = row.zapi_connected_phone || row.phone
  if (!from) return null

  return {
    id: row.id,
    tenantId: row.tenant_id,
    provider: 'zapi',
    label: row.label,
    from,
    purpose: row.purpose,
    metadata: row.metadata || null,
    zapi: {
      instanceId: row.zapi_instance_id,
      instanceToken: row.zapi_instance_token,
      clientToken: row.zapi_client_token || null,
      baseUrl: normalizeZApiBaseUrl(row.zapi_base_url),
    },
  }
}

async function getWhatsAppNumberRow(
  tenantId: string | null,
  preferredNumberId?: string | null,
): Promise<WhatsAppNumberRow | null> {
  if (!tenantId) return null

  try {
    const supabase = createAdminSupabase()
    let query = supabase
      .from('whatsapp_numbers')
      .select(`
        id,
        tenant_id,
        provider,
        label,
        phone,
        is_default,
        ativo,
        purpose,
        twilio_account_sid,
        twilio_auth_token,
        twilio_whatsapp_number,
        zapi_instance_id,
        zapi_instance_token,
        zapi_client_token,
        zapi_base_url,
        zapi_connected_phone,
        metadata
      `)
      .eq('tenant_id', tenantId)
      .eq('ativo', true)

    if (preferredNumberId) {
      query = query.eq('id', preferredNumberId)
    } else {
      query = query.order('is_default', { ascending: false }).order('created_at', { ascending: true })
    }

    const { data, error } = await query.limit(1).maybeSingle()
    if (error || !data) return null
    return data as WhatsAppNumberRow
  } catch {
    return null
  }
}

export async function getZApiRoutingContextByInstanceId(
  instanceId?: string | null,
): Promise<ZApiRoutingContext> {
  if (!instanceId) {
    return { tenantId: null, channelId: null, from: null }
  }

  try {
    const supabase = createAdminSupabase()
    const { data, error } = await supabase
      .from('whatsapp_numbers')
      .select('id, tenant_id, phone, zapi_connected_phone')
      .eq('provider', 'zapi')
      .eq('ativo', true)
      .eq('zapi_instance_id', instanceId)
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      return { tenantId: null, channelId: null, from: null }
    }

    return {
      tenantId: data.tenant_id || null,
      channelId: data.id || null,
      from: data.zapi_connected_phone || data.phone || null,
    }
  } catch {
    return { tenantId: null, channelId: null, from: null }
  }
}

export async function resolveWhatsAppChannel(
  tenantId: string | null,
  preferredNumberId?: string | null,
): Promise<ResolvedWhatsAppChannel> {
  const row = await getWhatsAppNumberRow(tenantId, preferredNumberId)

  if (row?.provider === 'zapi') {
    const zapiChannel = mapZApiRowToChannel(row)
    if (zapiChannel) return zapiChannel
  }

  if (row?.provider === 'twilio') {
    const twilioChannel = mapTwilioRowToChannel(row)
    if (twilioChannel) return twilioChannel
  }

  const legacyTwilio = await getTwilioCredentialsByTenantId(tenantId)
  return {
    id: null,
    tenantId,
    provider: 'twilio',
    label: null,
    from: legacyTwilio.whatsappNumber,
    purpose: 'ambos',
    metadata: null,
    credentials: legacyTwilio,
  }
}

async function sendViaZApi(
  channel: ResolvedWhatsAppChannel,
  to: string,
  body: string,
): Promise<SendWhatsAppMessageResult> {
  if (!channel.zapi) {
    return {
      success: false,
      provider: 'zapi',
      channelId: channel.id,
      from: channel.from,
      externalMessageId: '',
      error: 'Canal Z-API incompleto',
    }
  }

  const phone = normalizeDigitsOnly(to)
  if (!phone) {
    return {
      success: false,
      provider: 'zapi',
      channelId: channel.id,
      from: channel.from,
      externalMessageId: '',
      error: 'Numero de destino invalido',
    }
  }

  try {
    const response = await fetch(
      `${channel.zapi.baseUrl}/instances/${channel.zapi.instanceId}/token/${channel.zapi.instanceToken}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(channel.zapi.clientToken ? { 'Client-Token': channel.zapi.clientToken } : {}),
        },
        body: JSON.stringify({
          phone,
          message: body,
        }),
      },
    )

    const data = await response.json()
    if (!response.ok) {
      return {
        success: false,
        provider: 'zapi',
        channelId: channel.id,
        from: channel.from,
        externalMessageId: '',
        error: data?.message || data?.error || 'Erro Z-API',
      }
    }

    return {
      success: true,
      provider: 'zapi',
      channelId: channel.id,
      from: channel.from,
      externalMessageId: data?.messageId || data?.id || data?.zaapId || '',
    }
  } catch (error) {
    return {
      success: false,
      provider: 'zapi',
      channelId: channel.id,
      from: channel.from,
      externalMessageId: '',
      error: String(error),
    }
  }
}

export async function sendWhatsAppMessage(
  input: SendWhatsAppMessageInput,
): Promise<SendWhatsAppMessageResult> {
  const channel = await resolveWhatsAppChannel(input.tenantId, input.preferredNumberId)

  if (channel.provider === 'zapi') {
    return sendViaZApi(channel, input.to, input.body)
  }

  const result = await sendWhatsApp(input.to, input.body, channel.credentials!)
  return {
    success: result.success,
    provider: 'twilio',
    channelId: channel.id,
    from: channel.from,
    externalMessageId: result.sid,
    error: result.error,
  }
}
