import { createClient } from '@/lib/supabase/server'

export interface TwilioCredentials {
  accountSid: string
  authToken: string
  whatsappNumber: string
}

export async function getTwilioCredentials(tenantSlug?: string): Promise<TwilioCredentials> {
  const global: TwilioCredentials = {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886',
  }

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
