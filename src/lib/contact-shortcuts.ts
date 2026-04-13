export function normalizePhoneDigits(phone: string | null | undefined) {
  return String(phone || '').replace(/\D/g, '')
}

export function samePhone(a: string | null | undefined, b: string | null | undefined) {
  const aa = normalizePhoneDigits(a)
  const bb = normalizePhoneDigits(b)

  if (!aa || !bb) return false

  return (
    aa === bb ||
    aa === `55${bb}` ||
    bb === `55${aa}` ||
    aa.endsWith(bb) ||
    bb.endsWith(aa)
  )
}

export function toWhatsAppNumber(phone: string | null | undefined) {
  const digits = normalizePhoneDigits(phone)
  if (!digits) return ''

  if (digits.startsWith('55')) return digits

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`
  }

  return digits
}

export function buildWhatsAppHref(phone: string | null | undefined) {
  const number = toWhatsAppNumber(phone)
  return number ? `https://wa.me/${number}` : ''
}

export function buildInboxHref({
  conversaId,
  telefone,
  tab,
  leadId,
}: {
  conversaId?: string | null
  telefone?: string | null
  tab?: 'portal' | 'todas' | null
  leadId?: string | null
}) {
  const params = new URLSearchParams()
  if (conversaId) params.set('conversaId', conversaId)
  if (telefone) params.set('telefone', normalizePhoneDigits(telefone))
  if (tab && tab !== 'todas') params.set('tab', tab)
  if (leadId) params.set('leadId', leadId)
  const query = params.toString()
  return query ? `/caixa-de-entrada?${query}` : '/caixa-de-entrada'
}
