export function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeSearchText(value: unknown) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

export function normalizeDigits(value: unknown) {
  return normalizeText(value).replace(/\D/g, '')
}

export function buildSearchTokens(value: unknown) {
  const text = normalizeText(value)

  return {
    text,
    normalized: normalizeSearchText(text),
    digits: normalizeDigits(text),
  }
}

export function fieldMatchesSearch(
  value: unknown,
  tokens: { normalized: string; digits: string },
) {
  const textMatch = tokens.normalized
    ? normalizeSearchText(value).includes(tokens.normalized)
    : false

  const digitMatch = tokens.digits
    ? normalizeDigits(value).includes(tokens.digits)
    : false

  return textMatch || digitMatch
}

export function anyFieldMatchesSearch(
  values: unknown[],
  tokens: { normalized: string; digits: string },
) {
  return values.some((value) => fieldMatchesSearch(value, tokens))
}
