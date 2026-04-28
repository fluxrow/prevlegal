function countMojibakeArtifacts(value: string) {
  const matches = value.match(/(?:Ã.|Â.|â..|�)/g)
  return matches ? matches.length : 0
}

export function repairCommonMojibake(value: unknown) {
  if (typeof value !== 'string') return ''
  if (!value || !/[ÃÂâ�]/.test(value)) return value

  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8')
    return countMojibakeArtifacts(repaired) < countMojibakeArtifacts(value)
      ? repaired
      : value
  } catch {
    return value
  }
}

export function normalizeHumanText(value: unknown) {
  if (typeof value !== 'string') return ''
  return repairCommonMojibake(value).trim()
}
