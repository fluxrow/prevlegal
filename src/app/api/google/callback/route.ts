import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { ensureConfiguracaoAtual } from '@/lib/configuracoes'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function getEnv(name: string) {
  return process.env[name]?.trim()
}

function getAppUrl() {
  return getEnv('NEXT_PUBLIC_APP_URL') || 'https://app.prevlegal.com.br'
}

function getOAuthClient() {
  return new google.auth.OAuth2(
    getEnv('GOOGLE_CLIENT_ID'),
    getEnv('GOOGLE_CLIENT_SECRET'),
    getEnv('GOOGLE_REDIRECT_URI')
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${getAppUrl()}/agendamentos?google=erro`)
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    const supabase = await createClient()
    const context = await getTenantContext(supabase)
    if (!context) {
      return NextResponse.redirect(`${getAppUrl()}/login`)
    }

    const { data: config, error: configError } = await ensureConfiguracaoAtual(
      supabase,
      context.tenantId,
    )

    if (configError || !config) {
      throw new Error(configError?.message || 'Falha ao preparar configuracoes')
    }

    const { error: updateError } = await supabase
      .from('configuracoes')
      .update({
        google_calendar_token: tokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', config.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.redirect(`${getAppUrl()}/agendamentos?google=conectado`)
  } catch (err) {
    console.error('Google OAuth error:', err)
    return NextResponse.redirect(`${getAppUrl()}/agendamentos?google=erro`)
  }
}
