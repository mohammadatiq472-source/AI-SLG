export type ServerReleaseArtifactValidationResult = {
  ok: boolean
  errors: string[]
}

export function validateServerReleaseArtifactManifest(value: unknown): ServerReleaseArtifactValidationResult {
  const errors: string[] = []
  if (!value || typeof value !== 'object') {
    return { ok: false, errors: ['manifest must be an object'] }
  }

  const record = value as Record<string, unknown>
  if (typeof record.serverBuildId !== 'string' || record.serverBuildId.trim() === '') {
    errors.push('serverBuildId is required')
  }
  if (!Array.isArray(record.routes)) errors.push('routes must be an array')
  if (!Array.isArray(record.persistence)) errors.push('persistence must be an array')
  if (!Array.isArray(record.secrets)) errors.push('secrets must be an array')
  if (!Array.isArray(record.producers)) errors.push('producers must be an array')
  if (!Array.isArray(record.opsGates)) errors.push('opsGates must be an array')

  for (const persistence of Array.isArray(record.persistence) ? record.persistence : []) {
    const persistenceRecord = persistence as Record<string, unknown>
    if (persistenceRecord.clientPackaged !== false) {
      errors.push(`persistence ${String(persistenceRecord.name)} must not be client packaged`)
    }
  }

  for (const secret of Array.isArray(record.secrets) ? record.secrets : []) {
    const secretRecord = secret as Record<string, unknown>
    if (secretRecord.inClientPackage !== false) {
      errors.push(`secret ${String(secretRecord.name)} must not be in client package`)
    }
    if (secretRecord.inOpsSecretStore !== true) {
      errors.push(`secret ${String(secretRecord.name)} must be in ops secret store`)
    }
  }

  return { ok: errors.length === 0, errors }
}
