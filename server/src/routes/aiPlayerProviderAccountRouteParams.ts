export function parseLimit(url: URL) {
  const parsed = Number(url.searchParams.get('limit') ?? '50')
  if (!Number.isFinite(parsed)) {
    return 50
  }
  return Math.max(1, Math.min(500, Math.trunc(parsed)))
}

export function decodePathSegment(input: string | undefined): string | null {
  if (!input) {
    return null
  }
  try {
    const decoded = decodeURIComponent(input).trim()
    return /^[a-zA-Z0-9_-]{1,80}$/.test(decoded) ? decoded : null
  } catch {
    return null
  }
}

export function parseUsageNumberParam(url: URL, name: string) {
  const raw = url.searchParams.get(name)
  if (raw === null) {
    return undefined
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined
  }
  return parsed
}

export function parsePositiveIntegerParam(url: URL, name: string) {
  const raw = url.searchParams.get(name)
  if (raw === null) {
    return undefined
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0 || Math.trunc(parsed) !== parsed) {
    return undefined
  }
  return parsed
}

export function parseBooleanFilterParam(url: URL, name: string) {
  const raw = url.searchParams.get(name)?.trim().toLowerCase()
  if (raw === undefined || raw === '') {
    return undefined
  }
  if (raw === '1' || raw === 'true' || raw === 'yes') {
    return true
  }
  if (raw === '0' || raw === 'false' || raw === 'no') {
    return false
  }
  return undefined
}

export function parseUtcBoundary(value: string | null) {
  if (value === null) {
    return undefined
  }
  const trimmed = value.trim()
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
    ? Date.parse(`${trimmed}T00:00:00.000Z`)
    : Date.parse(trimmed)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function readPricingEstimateUsage(url: URL) {
  return {
    promptTokens: parseUsageNumberParam(url, 'promptTokens'),
    completionTokens: parseUsageNumberParam(url, 'completionTokens'),
    totalTokens: parseUsageNumberParam(url, 'totalTokens'),
    promptCacheHitTokens: parseUsageNumberParam(url, 'promptCacheHitTokens'),
    promptCacheMissTokens: parseUsageNumberParam(url, 'promptCacheMissTokens'),
  }
}

export function readDeepSeekBillingObservation(url: URL, prefix: 'today' | 'thisMonth' | 'range') {
  const field = (name: string) => `${prefix}${name[0]?.toUpperCase() ?? ''}${name.slice(1)}`
  return {
    requestCount: parsePositiveIntegerParam(url, field('requestCount')),
    actualCostCny: parseUsageNumberParam(url, field('actualCostCny')),
    actualCostUsd: parseUsageNumberParam(url, field('actualCostUsd')),
    estimatedCostUsd: parseUsageNumberParam(url, field('estimatedCostUsd')),
  }
}

export function readCreditBodyString(input: unknown, name: string) {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  const value = (input as Record<string, unknown>)[name]
  return typeof value === 'string' ? value.trim() || undefined : undefined
}

export function readCreditBodyNumber(input: unknown, name: string) {
  if (!input || typeof input !== 'object') {
    return undefined
  }
  const value = (input as Record<string, unknown>)[name]
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
