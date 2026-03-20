import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

function getEnv(name: string) {
  return process.env[name]?.trim()
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
    return NextResponse.redirect('/configuracoes?google=erro')
  }

  try {
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect('/auth/login')

    // Salva token em configuracoes
    const { data: config } = await supabase
      .from('configuracoes')
      .select('id')
      .single()

    if (config) {
      await supabase
        .from('configuracoes')
        .update({ google_calendar_token: tokens, updated_at: new Date().toISOString() })
        .eq('id', config.id)
    } else {
      await supabase
        .from('configuracoes')
        .insert({ google_calendar_token: tokens })
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'}/configuracoes?google=conectado`)
  } catch (err) {
    console.error('Google OAuth error:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'https://app.prevlegal.com.br'}/configuracoes?google=erro`)
  }
}
