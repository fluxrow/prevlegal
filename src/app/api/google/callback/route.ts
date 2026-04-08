import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'
import { ensureConfiguracaoAtual } from '@/lib/configuracoes'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { isMissingUserCalendarColumnError } from '@/lib/permissions'

type GoogleAuthTarget = 'tenant' | 'user'

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
    getEnv('GOOGLE_REDIRECT_URI'),
  )
}

function decodeState(rawState: string | null) {
  if (!rawState) {
    return { target: 'user' as GoogleAuthTarget, next: '/agendamentos' }
  }

  try {
    const parsed = JSON.parse(Buffer.from(rawState, 'base64url').toString('utf8'))
    const target = parsed?.target === 'tenant' ? 'tenant' : 'user'
    const next = typeof parsed?.next === 'string' && parsed.next.startsWith('/')
      ? parsed.next
      : '/agendamentos'

    return { target, next }
  } catch {
    return { target: 'user' as GoogleAuthTarget, next: '/agendamentos' }
  }
}

function buildReturnUrl(next: string, params: Record<string, string>) {
  const url = new URL(`${getAppUrl()}${next}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url.toString()
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const { target, next } = decodeState(searchParams.get('state'))

  if (!code) {
    return NextResponse.redirect(
      buildReturnUrl(next, { google: 'erro', google_target: target }),
    )
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()
    const connectedEmail = userInfo.email || null

    const supabase = await createClient()
    const context = await getTenantContext(supabase)
    if (!context) {
      return NextResponse.redirect(`${getAppUrl()}/login`)
    }

    if (target === 'tenant') {
      if (!context.isAdmin) {
        return NextResponse.redirect(
          buildReturnUrl(next, { google: 'forbidden', google_target: target }),
        )
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
          google_calendar_email: connectedEmail,
          google_calendar_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', config.id)

      if (updateError) {
        throw new Error(updateError.message)
      }
    } else {
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          google_calendar_token: tokens,
          google_calendar_email: connectedEmail,
          google_calendar_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', context.usuarioId)
        .eq('tenant_id', context.tenantId)

      if (updateError) {
        if (isMissingUserCalendarColumnError(updateError)) {
          return NextResponse.redirect(
            buildReturnUrl(next, { google: 'erro', google_target: target }),
          )
        }
        throw new Error(updateError.message)
      }
    }

    return NextResponse.redirect(
      buildReturnUrl(next, { google: 'conectado', google_target: target }),
    )
  } catch (err) {
    console.error('Google OAuth error:', err)
    return NextResponse.redirect(
      buildReturnUrl(next, { google: 'erro', google_target: target }),
    )
  }
}
