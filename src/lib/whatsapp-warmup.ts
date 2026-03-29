export interface CampaignThrottleSettings {
  limitDaily: number
  batchSize: number
  pauseBetweenBatchesS: number
  delayMinMs: number
  delayMaxMs: number
}

export interface WhatsAppWarmupPolicy extends CampaignThrottleSettings {
  enabled: boolean
  profile: string
}

const DEFAULT_WARMUP_POLICY: WhatsAppWarmupPolicy = {
  enabled: true,
  profile: 'novo_numero',
  limitDaily: 15,
  batchSize: 5,
  pauseBetweenBatchesS: 600,
  delayMinMs: 60_000,
  delayMaxMs: 180_000,
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(1, Math.floor(parsed))
}

function toBoolean(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'sim', 'yes'].includes(normalized)) return true
    if (['false', '0', 'nao', 'não', 'no'].includes(normalized)) return false
  }
  return false
}

function normalizeBaseSettings(
  settings: Partial<CampaignThrottleSettings>,
): CampaignThrottleSettings {
  const limitDaily = toPositiveInteger(settings.limitDaily, 500)
  const batchSize = Math.min(toPositiveInteger(settings.batchSize, 50), limitDaily)
  const pauseBetweenBatchesS = toPositiveInteger(settings.pauseBetweenBatchesS, 30)
  const delayMinMs = toPositiveInteger(settings.delayMinMs, 1500)
  const delayMaxMs = Math.max(delayMinMs, toPositiveInteger(settings.delayMaxMs, 3500))

  return {
    limitDaily,
    batchSize,
    pauseBetweenBatchesS,
    delayMinMs,
    delayMaxMs,
  }
}

export function getDefaultWarmupPolicy() {
  return { ...DEFAULT_WARMUP_POLICY }
}

export function getWhatsAppWarmupPolicy(
  metadata: Record<string, unknown> | null | undefined,
): WhatsAppWarmupPolicy | null {
  if (!metadata || !toBoolean(metadata.warmup_enabled)) {
    return null
  }

  const defaults = getDefaultWarmupPolicy()
  const limitDaily = toPositiveInteger(metadata.warmup_max_daily, defaults.limitDaily)
  const batchSize = Math.min(
    toPositiveInteger(metadata.warmup_batch_size, defaults.batchSize),
    limitDaily,
  )
  const pauseBetweenBatchesS = toPositiveInteger(
    metadata.warmup_pause_between_batches_s,
    defaults.pauseBetweenBatchesS,
  )
  const delayMinMs = toPositiveInteger(metadata.warmup_delay_min_ms, defaults.delayMinMs)
  const delayMaxMs = Math.max(
    delayMinMs,
    toPositiveInteger(metadata.warmup_delay_max_ms, defaults.delayMaxMs),
  )

  return {
    enabled: true,
    profile: String(metadata.warmup_profile || defaults.profile),
    limitDaily,
    batchSize,
    pauseBetweenBatchesS,
    delayMinMs,
    delayMaxMs,
  }
}

export function applyWarmupPolicyToThrottleSettings(
  settings: Partial<CampaignThrottleSettings>,
  warmupPolicy: WhatsAppWarmupPolicy | null,
): CampaignThrottleSettings {
  const normalized = normalizeBaseSettings(settings)
  if (!warmupPolicy?.enabled) return normalized

  const limitDaily = Math.min(normalized.limitDaily, warmupPolicy.limitDaily)
  const batchSize = Math.min(normalized.batchSize, warmupPolicy.batchSize, limitDaily)
  const pauseBetweenBatchesS = Math.max(
    normalized.pauseBetweenBatchesS,
    warmupPolicy.pauseBetweenBatchesS,
  )
  const delayMinMs = Math.max(normalized.delayMinMs, warmupPolicy.delayMinMs)
  const delayMaxMs = Math.max(
    delayMinMs,
    Math.max(normalized.delayMaxMs, warmupPolicy.delayMaxMs),
  )

  return {
    limitDaily,
    batchSize,
    pauseBetweenBatchesS,
    delayMinMs,
    delayMaxMs,
  }
}
