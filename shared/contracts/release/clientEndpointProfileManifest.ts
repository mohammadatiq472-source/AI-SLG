export const CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS = [
  'OPENAI_API_KEY',
  'LLM_RELAY_API_KEY',
  'LLM_RELAY_API_KEYS',
  'MEM0_API_KEY',
  'DATABASE_URL',
  'POSTGRES_URL',
  'REDIS_URL',
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'WORLD_SAVE_SLOTS_PATH',
  'WORLD_SAVE_SLOTS_ARCHIVE_DIR',
  'WORLD_PERSIST_ROOT',
  'FACTION_APIKEY_ENCRYPTION_KEY',
  'AI_PLAYER_RUNTIME_MODEL_API_KEY',
  'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH',
  'providerAccountStorePath',
  'archiveRestoreRouteForOps',
  'privateAiSourceRefs',
] as const

export type ClientEndpointProfileValidationResult = {
  ok: boolean
  errors: string[]
}

export function validateClientEndpointProfileManifest(value: unknown): ClientEndpointProfileValidationResult {
  const errors: string[] = []
  if (!value || typeof value !== 'object') {
    return { ok: false, errors: ['manifest must be an object'] }
  }

  const record = value as Record<string, unknown>
  for (const key of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      errors.push(`forbidden client profile key: ${key}`)
    }
  }

  for (const key of ['profileId', 'apiBaseUrl', 'minimumServerBuild', 'clientBuildChannel']) {
    if (typeof record[key] !== 'string' || String(record[key]).trim() === '') {
      errors.push(`missing string field: ${key}`)
    }
  }

  if (!record.capabilities || typeof record.capabilities !== 'object' || Array.isArray(record.capabilities)) {
    errors.push('capabilities must be an object')
  }

  const cachePolicy = record.cachePolicy as Record<string, unknown> | undefined
  if (
    !cachePolicy ||
    cachePolicy.readModels !== 'read_through_presentation_cache' ||
    cachePolicy.offlineAuthority !== false
  ) {
    errors.push('cachePolicy must keep read models as presentation cache and offlineAuthority=false')
  }

  return { ok: errors.length === 0, errors }
}
