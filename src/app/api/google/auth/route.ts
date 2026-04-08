import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

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

function sanitizeNext(next: string | null) {
  if (!next || !next.startsWith('/')) return '/agendamentos'
  return next
}

function buildReturnUrl(next: string, params: Record<string, string>) {
  const url = new URL(`${getAppUrl()}${next}`)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return url.toString()
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)

  if (!context) {
    return NextResponse.redirect(`${getAppUrl()}/login`)
  }

  const { searchParams } = new URL(request.url)
  const target = searchParams.get('target') === 'tenant' ? 'tenant' : 'user'
  const next = sanitizeNext(searchParams.get('next'))

  if (target === 'tenant' && !context.isAdmin) {
    return NextResponse.redirect(
      buildReturnUrl(next, {
        google: 'forbidden',
        google_target: 'tenant',
      }),
    )
  }

  const oauth2Client = getOAuthClient()
  const state = Buffer.from(
    JSON.stringify({
      target,
      next,
      usuarioId: context.usuarioId,
      tenantId: context.tenantId,
    }),
    'utf8',
  ).toString('base64url')

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    state,
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
    ],
  })

  return NextResponse.redirect(url)
}
