import type {
  AiPlayerProviderAuditEvent,
  ListAiPlayerProviderAccountPoolOpsAuditResponse,
} from '../../../../shared/contracts/aiPlayerProviderAccount'

type ProviderAccountPoolOpsAuditItem = ListAiPlayerProviderAccountPoolOpsAuditResponse['items'][number]

function readAuditMetadataNumber(
  metadata: AiPlayerProviderAuditEvent['metadata'] | undefined,
  key: string,
): number | null {
  const value = metadata?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function readAuditMetadataBoolean(
  metadata: AiPlayerProviderAuditEvent['metadata'] | undefined,
  key: string,
): boolean | null {
  const value = metadata?.[key]
  return typeof value === 'boolean' ? value : null
}

function readAuditMetadataString(
  metadata: AiPlayerProviderAuditEvent['metadata'] | undefined,
  key: string,
): string | null {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function resolveProviderAccountPoolOpsAuditAction(reason: string | undefined) {
  if (reason === 'provider_account_enabled') {
    return {
      action: 'enabled' as const,
      enabled: true,
    }
  }
  if (reason === 'provider_account_disabled') {
    return {
      action: 'disabled' as const,
      enabled: false,
    }
  }
  return {
    action: 'updated' as const,
    enabled: null,
  }
}

export function toProviderAccountPoolOpsAuditItem(event: AiPlayerProviderAuditEvent): ProviderAccountPoolOpsAuditItem | null {
  if (event.eventType !== 'provider_account_pool_ops_configured' || !event.provider || !event.model) {
    return null
  }
  const action = resolveProviderAccountPoolOpsAuditAction(event.reason)
  return {
    eventId: event.eventId,
    eventType: 'provider_account_pool_ops_configured',
    actorId: event.actorId ?? null,
    provider: event.provider,
    model: event.model,
    keyFingerprint: event.keyFingerprint ?? null,
    action: action.action,
    enabled: action.enabled,
    reason: event.reason ?? null,
    opsReason: readAuditMetadataString(event.metadata, 'opsReason'),
    authRole: readAuditMetadataString(event.metadata, 'authRole'),
    authSource: readAuditMetadataString(event.metadata, 'authSource'),
    restoreSourceEventId: readAuditMetadataString(event.metadata, 'restoreSourceEventId'),
    maxConcurrency: readAuditMetadataNumber(event.metadata, 'maxConcurrency'),
    enterpriseQuota: readAuditMetadataBoolean(event.metadata, 'enterpriseQuota'),
    quotaLabel: readAuditMetadataString(event.metadata, 'quotaLabel'),
    createdAt: event.createdAt,
  }
}

export function listProviderAccountPoolOpsAuditReadModel(input: {
  events: readonly AiPlayerProviderAuditEvent[]
  limit: number
  generatedAt: string
  provider?: string
  model?: string
  keyFingerprint?: string | null
  actorId?: string
  enabled?: boolean
  invalidKeyFingerprintFilter?: boolean
}): ListAiPlayerProviderAccountPoolOpsAuditResponse {
  const items = input.invalidKeyFingerprintFilter
    ? []
    : input.events
      .map(toProviderAccountPoolOpsAuditItem)
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .filter((item) => {
        if (input.provider && item.provider !== input.provider) return false
        if (input.model && item.model !== input.model) return false
        if (input.keyFingerprint !== undefined && item.keyFingerprint !== input.keyFingerprint) return false
        if (input.actorId && item.actorId !== input.actorId) return false
        if (input.enabled !== undefined && item.enabled !== input.enabled) return false
        return true
      })
      .slice(-input.limit)
      .reverse()
      .map((item) => structuredClone(item))
  return {
    ok: true,
    generatedAt: input.generatedAt,
    items,
    count: items.length,
  }
}

export function findProviderAccountPoolOpsAuditItemForRestore(
  events: readonly AiPlayerProviderAuditEvent[],
  input: {
    provider: string
    model: string
    keyFingerprint: string | null
    restoreEventId?: string
  },
): ProviderAccountPoolOpsAuditItem | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const item = toProviderAccountPoolOpsAuditItem(events[index])
    if (!item) {
      continue
    }
    if (input.restoreEventId && item.eventId !== input.restoreEventId) {
      continue
    }
    if (item.provider !== input.provider || item.model !== input.model || item.keyFingerprint !== input.keyFingerprint) {
      continue
    }
    return item.enabled === null ? null : structuredClone(item)
  }
  return null
}
