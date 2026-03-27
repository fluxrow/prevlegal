import { google } from 'googleapis'
import { getConfiguracaoAtual } from '@/lib/configuracoes'
import { createClient } from '@/lib/supabase/server'
import { getTenantContext } from '@/lib/tenant-context'

function getEnv(name: string) {
  return process.env[name]?.trim()
}

export async function getCalendarClient() {
  const supabase = await createClient()
  const context = await getTenantContext(supabase)

  if (!context) {
    throw new Error('Tenant não identificado')
  }

  const { data: config } = await getConfiguracaoAtual(
    supabase,
    context.tenantId,
    'id, google_calendar_token',
  )

  if (!config?.google_calendar_token) {
    throw new Error('Google Calendar não conectado')
  }

  const oauth2Client = new google.auth.OAuth2(
    getEnv('GOOGLE_CLIENT_ID'),
    getEnv('GOOGLE_CLIENT_SECRET'),
    getEnv('GOOGLE_REDIRECT_URI')
  )

  oauth2Client.setCredentials(config.google_calendar_token as object)

  // Auto-refresh: se o token expirou, atualiza no banco
  oauth2Client.on('tokens', async (tokens) => {
    if (config?.id) {
      const current = config.google_calendar_token as Record<string, unknown>
      await supabase
        .from('configuracoes')
        .update({ google_calendar_token: { ...current, ...tokens } })
        .eq('id', config.id)
    }
  })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

export async function criarEventoCalendar({
  titulo,
  descricao,
  dataHora,
  duracaoMinutos,
  emailLead,
  emailAdvogado,
}: {
  titulo: string
  descricao?: string
  dataHora: string
  duracaoMinutos: number
  emailLead?: string
  emailAdvogado?: string
}) {
  const calendar = await getCalendarClient()

  const inicio = new Date(dataHora)
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000)

  const attendees: { email: string }[] = []
  if (emailLead) attendees.push({ email: emailLead })
  if (emailAdvogado) attendees.push({ email: emailAdvogado })

  const evento = await calendar.events.insert({
    calendarId: 'primary',
    conferenceDataVersion: 1,
    requestBody: {
      summary: titulo,
      description: descricao,
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
      attendees: attendees.length > 0 ? attendees : undefined,
      conferenceData: {
        createRequest: {
          requestId: `prevlegal-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    },
  })

  const meetLink = evento.data.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === 'video'
  )?.uri ?? null

  return {
    googleEventId: evento.data.id ?? null,
    meetLink,
  }
}

export async function cancelarEventoCalendar(googleEventId: string) {
  const calendar = await getCalendarClient()
  await calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId,
  })
}

export async function atualizarEventoCalendar({
  googleEventId,
  dataHora,
  duracaoMinutos,
}: {
  googleEventId: string
  dataHora: string
  duracaoMinutos: number
}) {
  const calendar = await getCalendarClient()

  const inicio = new Date(dataHora)
  const fim = new Date(inicio.getTime() + duracaoMinutos * 60 * 1000)

  await calendar.events.patch({
    calendarId: 'primary',
    eventId: googleEventId,
    requestBody: {
      start: { dateTime: inicio.toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: fim.toISOString(), timeZone: 'America/Sao_Paulo' },
    },
  })
}
