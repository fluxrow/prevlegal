import { google } from 'googleapis'
import { getConfiguracaoAtual } from '@/lib/configuracoes'

type SupabaseLike = {
  from: (table: string) => any
}

type CalendarOwnerScope = 'tenant' | 'user'

type CalendarConnection = {
  ownerScope: CalendarOwnerScope
  ownerUsuarioId: string | null
  ownerEmail: string | null
  ownerLabel: string
  tokens: Record<string, unknown>
  persistRef: { table: 'configuracoes' | 'usuarios'; id: string } | null
  connectedAt: string | null
}

type CalendarStatus = {
  connected: boolean
  email: string | null
  connectedAt: string | null
}

function getEnv(name: string) {
  return process.env[name]?.trim()
}

function createOAuthClient() {
  return new google.auth.OAuth2(
    getEnv('GOOGLE_CLIENT_ID'),
    getEnv('GOOGLE_CLIENT_SECRET'),
    getEnv('GOOGLE_REDIRECT_URI'),
  )
}

async function getTenantCalendarConnection(
  supabase: SupabaseLike,
  tenantId: string | null,
): Promise<CalendarConnection | null> {
  const { data: config, error } = await getConfiguracaoAtual(
    supabase,
    tenantId,
    'id, google_calendar_token, google_calendar_email, google_calendar_connected_at',
  )

  if (error) {
    throw new Error(error.message)
  }

  if (!config?.google_calendar_token) {
    return null
  }

  return {
    ownerScope: 'tenant',
    ownerUsuarioId: null,
    ownerEmail: config.google_calendar_email || null,
    ownerLabel: 'calendário do escritório',
    tokens: config.google_calendar_token as Record<string, unknown>,
    persistRef: config.id ? { table: 'configuracoes', id: config.id as string } : null,
    connectedAt: config.google_calendar_connected_at || null,
  }
}

async function getUserCalendarConnection(
  supabase: SupabaseLike,
  tenantId: string | null,
  usuarioId: string,
): Promise<CalendarConnection | null> {
  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id, nome, google_calendar_token, google_calendar_email, google_calendar_connected_at')
    .eq('id', usuarioId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!usuario?.google_calendar_token) {
    return null
  }

  return {
    ownerScope: 'user',
    ownerUsuarioId: usuario.id,
    ownerEmail: usuario.google_calendar_email || null,
    ownerLabel: usuario.nome ? `calendário de ${usuario.nome}` : 'calendário do responsável',
    tokens: usuario.google_calendar_token as Record<string, unknown>,
    persistRef: usuario.id ? { table: 'usuarios', id: usuario.id as string } : null,
    connectedAt: usuario.google_calendar_connected_at || null,
  }
}

function attachTokenPersistence(
  supabase: SupabaseLike,
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  connection: CalendarConnection,
) {
  oauth2Client.on('tokens', async (tokens) => {
    if (!connection.persistRef) return

    const payload = {
      ...(connection.tokens || {}),
      ...tokens,
    }

    await supabase
      .from(connection.persistRef.table)
      .update({
        google_calendar_token: payload,
        google_calendar_connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.persistRef.id)
  })
}

async function resolveCalendarConnection({
  supabase,
  tenantId,
  preferredUsuarioId,
  exactOwnerScope,
  exactOwnerUsuarioId,
  allowTenantFallback = true,
}: {
  supabase: SupabaseLike
  tenantId: string | null
  preferredUsuarioId?: string | null
  exactOwnerScope?: CalendarOwnerScope | null
  exactOwnerUsuarioId?: string | null
  allowTenantFallback?: boolean
}): Promise<CalendarConnection> {
  if (exactOwnerScope === 'user') {
    if (!exactOwnerUsuarioId) {
      throw new Error('Agendamento sem responsável de calendário definido')
    }

    const userConnection = await getUserCalendarConnection(
      supabase,
      tenantId,
      exactOwnerUsuarioId,
    )

    if (!userConnection) {
      throw new Error('Google Calendar do responsável não está conectado')
    }

    return userConnection
  }

  if (exactOwnerScope === 'tenant') {
    const tenantConnection = await getTenantCalendarConnection(supabase, tenantId)
    if (!tenantConnection) {
      throw new Error('Google Calendar do escritório não está conectado')
    }
    return tenantConnection
  }

  if (preferredUsuarioId) {
    const userConnection = await getUserCalendarConnection(
      supabase,
      tenantId,
      preferredUsuarioId,
    )

    if (userConnection) {
      return userConnection
    }
  }

  if (allowTenantFallback) {
    const tenantConnection = await getTenantCalendarConnection(supabase, tenantId)
    if (tenantConnection) {
      return tenantConnection
    }
  }

  if (preferredUsuarioId) {
    throw new Error('Nem o responsável nem o escritório têm Google Calendar conectado')
  }

  throw new Error('Google Calendar não conectado')
}

async function getCalendarClient({
  supabase,
  tenantId,
  preferredUsuarioId,
  exactOwnerScope,
  exactOwnerUsuarioId,
  allowTenantFallback = true,
}: {
  supabase: SupabaseLike
  tenantId: string | null
  preferredUsuarioId?: string | null
  exactOwnerScope?: CalendarOwnerScope | null
  exactOwnerUsuarioId?: string | null
  allowTenantFallback?: boolean
}) {
  const connection = await resolveCalendarConnection({
    supabase,
    tenantId,
    preferredUsuarioId,
    exactOwnerScope,
    exactOwnerUsuarioId,
    allowTenantFallback,
  })

  const oauth2Client = createOAuthClient()
  oauth2Client.setCredentials(connection.tokens)
  attachTokenPersistence(supabase, oauth2Client, connection)

  return {
    connection,
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  }
}

export async function getGoogleCalendarStatus({
  supabase,
  tenantId,
  usuarioId,
}: {
  supabase: SupabaseLike
  tenantId: string | null
  usuarioId: string
}) {
  const [userConnection, tenantConnection] = await Promise.all([
    getUserCalendarConnection(supabase, tenantId, usuarioId),
    getTenantCalendarConnection(supabase, tenantId),
  ])

  const currentUser: CalendarStatus = {
    connected: Boolean(userConnection),
    email: userConnection?.ownerEmail || null,
    connectedAt: userConnection?.connectedAt || null,
  }

  const tenantDefault: CalendarStatus = {
    connected: Boolean(tenantConnection),
    email: tenantConnection?.ownerEmail || null,
    connectedAt: tenantConnection?.connectedAt || null,
  }

  return {
    currentUser,
    tenantDefault,
    effective: {
      connected: currentUser.connected || tenantDefault.connected,
      source: currentUser.connected ? 'user' : tenantDefault.connected ? 'tenant' : 'none',
      email: currentUser.email || tenantDefault.email || null,
    },
  }
}

export async function criarEventoCalendar({
  supabase,
  tenantId,
  ownerUsuarioId,
  titulo,
  descricao,
  dataHora,
  duracaoMinutos,
  emailLead,
  emailAdvogado,
}: {
  supabase: SupabaseLike
  tenantId: string | null
  ownerUsuarioId?: string | null
  titulo: string
  descricao?: string
  dataHora: string
  duracaoMinutos: number
  emailLead?: string
  emailAdvogado?: string
}) {
  const { calendar, connection } = await getCalendarClient({
    supabase,
    tenantId,
    preferredUsuarioId: ownerUsuarioId,
    allowTenantFallback: true,
  })

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
    (entryPoint) => entryPoint.entryPointType === 'video',
  )?.uri ?? null

  return {
    googleEventId: evento.data.id ?? null,
    meetLink,
    calendarOwnerScope: connection.ownerScope,
    calendarOwnerUsuarioId: connection.ownerUsuarioId,
    calendarOwnerEmail: connection.ownerEmail,
    calendarOwnerLabel: connection.ownerLabel,
  }
}

export async function cancelarEventoCalendar({
  supabase,
  tenantId,
  googleEventId,
  ownerScope,
  ownerUsuarioId,
}: {
  supabase: SupabaseLike
  tenantId: string | null
  googleEventId: string
  ownerScope?: CalendarOwnerScope | null
  ownerUsuarioId?: string | null
}) {
  const { calendar } = await getCalendarClient({
    supabase,
    tenantId,
    exactOwnerScope: ownerScope || 'tenant',
    exactOwnerUsuarioId: ownerUsuarioId || null,
    allowTenantFallback: ownerScope !== 'user',
  })

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: googleEventId,
  })
}

export async function atualizarEventoCalendar({
  supabase,
  tenantId,
  googleEventId,
  dataHora,
  duracaoMinutos,
  ownerScope,
  ownerUsuarioId,
}: {
  supabase: SupabaseLike
  tenantId: string | null
  googleEventId: string
  dataHora: string
  duracaoMinutos: number
  ownerScope?: CalendarOwnerScope | null
  ownerUsuarioId?: string | null
}) {
  const { calendar } = await getCalendarClient({
    supabase,
    tenantId,
    exactOwnerScope: ownerScope || 'tenant',
    exactOwnerUsuarioId: ownerUsuarioId || null,
    allowTenantFallback: ownerScope !== 'user',
  })

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
