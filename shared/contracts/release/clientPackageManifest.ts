import { CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS } from './clientEndpointProfileManifest'

export type ClientPackageManifestValidationResult = {
  ok: boolean
  errors: string[]
}

export type ClientPackageManifest = {
  manifestKind: 'godot-client-package-release-evidence'
  profileId: string
  preset: string
  artifactPath: string
  artifactSha256: string
  artifactSizeBytes: number
  exportStdoutLog: string
  exportStderrLog: string
  hygieneScan: {
    ok: boolean
    logs: Array<{
      path: string
      hits: string[]
    }>
  }
  generatedBy: {
    script: string
  }
}

export function validateClientPackageManifest(value: unknown): ClientPackageManifestValidationResult {
  const errors: string[] = []
  if (!value || typeof value !== 'object') {
    return { ok: false, errors: ['manifest must be an object'] }
  }

  const record = value as Record<string, unknown>
  if (record.manifestKind !== 'godot-client-package-release-evidence') {
    errors.push('manifestKind must be godot-client-package-release-evidence')
  }

  for (const field of ['profileId', 'preset', 'artifactPath', 'artifactSha256', 'exportStdoutLog', 'exportStderrLog']) {
    if (typeof record[field] !== 'string' || String(record[field]).trim() === '') {
      errors.push(`missing string field: ${field}`)
    }
  }

  if (typeof record.artifactSha256 === 'string' && !/^[a-f0-9]{64}$/.test(record.artifactSha256)) {
    errors.push('artifactSha256 must be a lowercase sha256 hex digest')
  }

  if (typeof record.artifactSizeBytes !== 'number' || !Number.isInteger(record.artifactSizeBytes) || record.artifactSizeBytes <= 0) {
    errors.push('artifactSizeBytes must be a positive integer')
  }

  const hygieneScan = record.hygieneScan as Record<string, unknown> | undefined
  if (!hygieneScan || typeof hygieneScan !== 'object' || Array.isArray(hygieneScan)) {
    errors.push('hygieneScan must be an object')
  } else {
    if (hygieneScan.ok !== true) {
      errors.push('hygieneScan.ok must be true')
    }
    if (!Array.isArray(hygieneScan.logs)) {
      errors.push('hygieneScan.logs must be an array')
    } else {
      for (const log of hygieneScan.logs) {
        const logRecord = log as Record<string, unknown>
        if (typeof logRecord.path !== 'string' || logRecord.path.trim() === '') {
          errors.push('hygieneScan log path must be a non-empty string')
        }
        if (!Array.isArray(logRecord.hits)) {
          errors.push(`hygieneScan log ${String(logRecord.path)} hits must be an array`)
        } else if (logRecord.hits.length !== 0) {
          errors.push(`hygieneScan log ${String(logRecord.path)} must not contain forbidden hits`)
        }
      }
    }
  }

  const generatedBy = record.generatedBy as Record<string, unknown> | undefined
  if (!generatedBy || generatedBy.script !== 'scripts/generate_client_package_manifest.ts') {
    errors.push('generatedBy.script must be scripts/generate_client_package_manifest.ts')
  }

  const serialized = JSON.stringify(record)
  for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
    if (serialized.includes(forbiddenKey)) {
      errors.push(`client package manifest must not contain forbidden server/private key ${forbiddenKey}`)
    }
  }

  return { ok: errors.length === 0, errors }
}
