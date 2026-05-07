export type ConversationMessageRow = {
  id: string
  created_at: string
  mensagem?: string | null
  telefone_remetente?: string | null
  telefone_destinatario?: string | null
  respondido_manualmente?: boolean | null
  respondido_por_agente?: boolean | null
  twilio_message_sid?: string | null
  twilio_sid?: string | null
  resposta_agente?: string | null
  lido_em?: string | null
}

export type TimelineMessageRow = {
  id: string
  created_at: string
  mensagem: string
  telefone_remetente: string
  telefone_destinatario: string
  respondido_manualmente: boolean
  respondido_por_agente: boolean
  twilio_message_sid?: string | null
  twilio_sid?: string | null
  resposta_agente: string | null
  lido_em?: string | null
  source_message_id: string
  timeline_role: 'lead' | 'assistant'
  synthetic: boolean
}

function normalizeComparablePhone(value: string | null | undefined) {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) return digits.slice(2)
  return digits
}

function scoreConversationMessage(row: ConversationMessageRow) {
  let score = 0

  if (row.resposta_agente?.trim()) score += 4
  if (row.twilio_sid && row.twilio_sid !== 'on-receive') score += 2
  if (row.twilio_sid === 'on-receive') score -= 1

  return score
}

export function dedupeConversationMessages<T extends ConversationMessageRow>(rows: T[]) {
  const result: T[] = []
  const byExternalInboundId = new Map<string, number>()
  const byRecentManualMirror = new Map<string, number>()

  const pickPreferredRow = (existing: T, candidate: T) => {
    const existingScore = scoreConversationMessage(existing)
    const candidateScore = scoreConversationMessage(candidate)

    if (candidateScore > existingScore) return candidate
    if (candidateScore < existingScore) return existing

    return new Date(candidate.created_at).getTime() > new Date(existing.created_at).getTime()
      ? candidate
      : existing
  }

  const rowsAsc = [...rows].sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )

  for (const row of rowsAsc) {
    const externalInboundId = String(row.twilio_message_sid || '').trim()
    const normalizedBody = String(row.mensagem || '').trim().toLowerCase()
    const manualMirrorFingerprint =
      row.respondido_manualmente &&
      normalizedBody &&
      row.telefone_remetente &&
      row.telefone_destinatario
        ? `${row.telefone_remetente}::${row.telefone_destinatario}::${normalizedBody}`
        : ''

    let duplicateIndex: number | null = null

    if (externalInboundId) {
      duplicateIndex = byExternalInboundId.get(externalInboundId) ?? null
    }

    if (duplicateIndex === null && manualMirrorFingerprint) {
      const existingIndex = byRecentManualMirror.get(manualMirrorFingerprint)
      if (existingIndex !== undefined) {
        const existingRow = result[existingIndex]
        const existingTs = new Date(existingRow.created_at).getTime()
        const currentTs = new Date(row.created_at).getTime()

        if (Math.abs(currentTs - existingTs) <= 180000) {
          duplicateIndex = existingIndex
        }
      }
    }

    if (duplicateIndex !== null) {
      const preferred = pickPreferredRow(result[duplicateIndex], row)
      result[duplicateIndex] = preferred
      continue
    }

    const nextIndex = result.push(row) - 1

    if (externalInboundId) {
      byExternalInboundId.set(externalInboundId, nextIndex)
    }

    if (manualMirrorFingerprint) {
      byRecentManualMirror.set(manualMirrorFingerprint, nextIndex)
    }
  }

  return result.sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )
}

function resolveAssistantTimestamp(row: ConversationMessageRow) {
  const responseAt = row.lido_em ? new Date(row.lido_em).getTime() : NaN
  const createdAt = new Date(row.created_at).getTime()

  if (Number.isFinite(responseAt) && responseAt > createdAt) {
    return new Date(responseAt).toISOString()
  }

  return row.created_at
}

export function buildConversationTimelineRows<T extends ConversationMessageRow>(
  rows: T[],
  leadPhone?: string | null,
) {
  const normalizedLeadPhone = normalizeComparablePhone(leadPhone)
  const timeline: TimelineMessageRow[] = []

  for (const row of rows) {
    const inboundText = String(row.mensagem || '').trim()
    const outboundText = String(row.resposta_agente || '').trim()
    const outboundToLead =
      Boolean(normalizedLeadPhone) &&
      normalizeComparablePhone(row.telefone_destinatario) === normalizedLeadPhone &&
      normalizeComparablePhone(row.telefone_remetente) !== normalizedLeadPhone

    if (outboundToLead) {
      const messageBody = String(row.resposta_agente || row.mensagem || '').trim()
      if (!messageBody) continue

      timeline.push({
        id: row.id,
        created_at: row.created_at,
        mensagem: messageBody,
        telefone_remetente: String(row.telefone_remetente || ''),
        telefone_destinatario: String(row.telefone_destinatario || ''),
        respondido_manualmente: Boolean(row.respondido_manualmente),
        respondido_por_agente: Boolean(row.respondido_por_agente),
        twilio_message_sid: row.twilio_message_sid || null,
        twilio_sid: row.twilio_sid || null,
        resposta_agente: null,
        lido_em: row.lido_em || null,
        source_message_id: row.id,
        timeline_role: 'assistant',
        synthetic: false,
      })
      continue
    }

    if (inboundText) {
      timeline.push({
        id: row.id,
        source_message_id: row.id,
        created_at: row.created_at,
        mensagem: inboundText,
        telefone_remetente: String(row.telefone_remetente || ''),
        telefone_destinatario: String(row.telefone_destinatario || ''),
        respondido_manualmente: Boolean(row.respondido_manualmente),
        respondido_por_agente: false,
        twilio_message_sid: row.twilio_message_sid || null,
        twilio_sid: row.twilio_sid || null,
        resposta_agente: null,
        lido_em: row.lido_em || null,
        timeline_role: 'lead',
        synthetic: false,
      })
    }

    if (outboundText && row.respondido_por_agente) {
      timeline.push({
        id: `${row.id}:agent-reply`,
        source_message_id: row.id,
        created_at: resolveAssistantTimestamp(row),
        mensagem: outboundText,
        telefone_remetente: String(row.telefone_destinatario || ''),
        telefone_destinatario: String(row.telefone_remetente || ''),
        respondido_manualmente: false,
        respondido_por_agente: true,
        twilio_message_sid: row.twilio_message_sid || null,
        twilio_sid: row.twilio_sid || null,
        resposta_agente: null,
        lido_em: row.lido_em || null,
        timeline_role: 'assistant',
        synthetic: true,
      })
    }
  }

  return timeline.sort(
    (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
  )
}
