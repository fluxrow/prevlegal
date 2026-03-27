import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export interface TwilioCredentials {
  accountSid: string
  authToken: string
  whatsappNumber: string
}

export interface TwilioRoutingContext {
  tenantId: string | null
  credentials: TwilioCredentials
}

function createAdminSupabase() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

function getGlobalTwilioCredentials(): TwilioCredentials {
  return {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
  }
}

function normalizeWhatsAppAddress(value?: string | null) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/^whatsapp:/i, '')
    .toLowerCase()
}

export async function getTwilioCredentials(tenantSlug?: string): Promise<TwilioCredentials> {
  const global = getGlobalTwilioCredentials()

  if (!tenantSlug) return global

  try {
    const supabase = await createClient()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('slug', tenantSlug)
      .single()

    if (
      tenant?.twilio_account_sid &&
      tenant?.twilio_auth_token &&
      tenant?.twilio_whatsapp_number
    ) {
      return {
        accountSid: tenant.twilio_account_sid,
        authToken: tenant.twilio_auth_token,
        whatsappNumber: tenant.twilio_whatsapp_number,
      }
    }
  } catch {
    // fallback silencioso
  }

  return global
}

export async function getTwilioCredentialsByTenantId(tenantId?: string | null): Promise<TwilioCredentials> {
  const global = getGlobalTwilioCredentials()

  if (!tenantId) return global

  try {
    const supabase = createAdminSupabase()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .eq('id', tenantId)
      .maybeSingle()

    if (
      tenant?.twilio_account_sid &&
      tenant?.twilio_auth_token &&
      tenant?.twilio_whatsapp_number
    ) {
      return {
        accountSid: tenant.twilio_account_sid,
        authToken: tenant.twilio_auth_token,
        whatsappNumber: tenant.twilio_whatsapp_number,
      }
    }
  } catch {
    // fallback silencioso
  }

  return global
}

export async function getTwilioRoutingContextByWhatsAppNumber(
  whatsappNumber?: string | null,
): Promise<TwilioRoutingContext> {
  const global = getGlobalTwilioCredentials()
  const normalizedTarget = normalizeWhatsAppAddress(whatsappNumber)

  if (!normalizedTarget) {
    return { tenantId: null, credentials: global }
  }

  try {
    const supabase = createAdminSupabase()
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, twilio_account_sid, twilio_auth_token, twilio_whatsapp_number')
      .not('twilio_whatsapp_number', 'is', null)

    const tenant = (tenants || []).find((entry) => {
      return normalizeWhatsAppAddress(entry.twilio_whatsapp_number) === normalizedTarget
    })

    if (
      tenant?.id &&
      tenant.twilio_account_sid &&
      tenant.twilio_auth_token &&
      tenant.twilio_whatsapp_number
    ) {
      return {
        tenantId: tenant.id,
        credentials: {
          accountSid: tenant.twilio_account_sid,
          authToken: tenant.twilio_auth_token,
          whatsappNumber: tenant.twilio_whatsapp_number,
        },
      }
    }
  } catch {
    // fallback silencioso
  }

  return { tenantId: null, credentials: global }
}

export async function sendWhatsApp(
  to: string,
  body: string,
  credentials: TwilioCredentials
): Promise<{ sid: string; success: boolean; error?: string }> {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
  const url = `https://api.twilio.com/2010-04-01/Accounts/${credentials.accountSid}/Messages.json`
  const auth = Buffer.from(`${credentials.accountSid}:${credentials.authToken}`).toString('base64')

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: new URLSearchParams({
        From: credentials.whatsappNumber,
        To: toFormatted,
        Body: body,
      }).toString(),
    })

    const data = await res.json()

    if (!res.ok) {
      return { sid: '', success: false, error: data.message || 'Erro Twilio' }
    }

    return { sid: data.sid, success: true }
  } catch (err) {
    return { sid: '', success: false, error: String(err) }
  }
}
