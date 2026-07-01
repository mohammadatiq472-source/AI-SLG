import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  aiSubjectReleaseBoundaryOutputPath,
  generateAiSubjectReleaseBoundary,
} from './generate_ai_subject_release_boundary'
import {
  DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
  DEFAULT_CLIENT_PACKAGE_MANIFEST_PRESET,
  DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
  DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG,
  clientPackageManifestOutputPath,
  generateClientPackageManifest,
} from './generate_client_package_manifest'
import {
  generateServerReleaseArtifact,
  generatedServerReleaseArtifactPath,
} from './generate_server_release_artifact'
import {
  opsReleaseChecklistPath,
  validateOpsReleaseChecklistFile,
} from './validate_ops_release_checklist'

export const DEFAULT_RELEASE_ARTIFACT_DRIFT_PROFILE = 'local-dev'

export type ReleaseArtifactDriftOwner = 'server-owned' | 'client-owned' | 'AI-read' | 'ops-only'

export type ReleaseArtifactDriftTarget = {
  label: string
  path: string
  owner: ReleaseArtifactDriftOwner
}

export type ReleaseArtifactDriftCheckStatus = 'clean' | 'drift' | 'missing' | 'invalid' | 'validated'

export type ReleaseArtifactDriftCheck = ReleaseArtifactDriftTarget & {
  ok: boolean
  status: ReleaseArtifactDriftCheckStatus
  detail?: string
}

export type ReleaseArtifactDriftOptions = {
  profileId: string
}

export type ReleaseArtifactDriftResult = {
  profileId: string
  ok: boolean
  checks: ReleaseArtifactDriftCheck[]
  errors: string[]
}

export function parseReleaseArtifactDriftArgs(argv: string[]): ReleaseArtifactDriftOptions {
  let profileId = DEFAULT_RELEASE_ARTIFACT_DRIFT_PROFILE

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      profileId = argv[index + 1] ?? ''
      index += 1
      continue
    }
    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length)
      continue
    }
    throw new Error(`unknown release artifact drift argument: ${arg}`)
  }

  return { profileId: normalizeProfileId(profileId) }
}

export function releaseArtifactDriftTargets(profileId: string): ReleaseArtifactDriftTarget[] {
  const profile = normalizeProfileId(profileId)
  return [
    {
      label: 'server release artifact',
      path: generatedServerReleaseArtifactPath(profile),
      owner: 'server-owned',
    },
    {
      label: 'client package manifest',
      path: clientPackageManifestOutputPath(profile),
      owner: 'client-owned',
    },
    {
      label: 'AI subject boundary manifest',
      path: aiSubjectReleaseBoundaryOutputPath(profile),
      owner: 'AI-read',
    },
    {
      label: 'ops secret restore recovery checklist',
      path: opsReleaseChecklistPath(profile),
      owner: 'ops-only',
    },
  ]
}

export function buildReleaseArtifactDriftChecks(
  options: ReleaseArtifactDriftOptions,
): ReleaseArtifactDriftCheck[] {
  const profileId = normalizeProfileId(options.profileId)

  const [serverTarget, clientTarget, aiTarget, opsTarget] = releaseArtifactDriftTargets(profileId)
  return [
    compareGeneratedJsonArtifact(serverTarget, () =>
      generateServerReleaseArtifact({ profileId, write: false }).artifact,
    ),
    compareGeneratedJsonArtifact(clientTarget, () =>
      generateClientPackageManifest({
        profileId,
        preset: DEFAULT_CLIENT_PACKAGE_MANIFEST_PRESET,
        artifactPath: DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
        exportStdoutLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG,
        exportStderrLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
        write: false,
      }).manifest,
    ),
    compareGeneratedJsonArtifact(aiTarget, () =>
      generateAiSubjectReleaseBoundary({ profileId, write: false }).manifest,
    ),
    validateOpsChecklistTarget(opsTarget, profileId),
  ]
}

export function verifyReleaseArtifactDrift(options: ReleaseArtifactDriftOptions): ReleaseArtifactDriftResult {
  const profileId = normalizeProfileId(options.profileId)
  const checks = buildReleaseArtifactDriftChecks({ profileId })
  const errors = checks
    .filter((check) => !check.ok)
    .map((check) => `${check.label}: ${check.status}${check.detail ? ` (${check.detail})` : ''}`)

  return {
    profileId,
    ok: errors.length === 0,
    checks,
    errors,
  }
}

function compareGeneratedJsonArtifact(
  target: ReleaseArtifactDriftTarget,
  buildExpected: () => unknown,
): ReleaseArtifactDriftCheck {
  if (!existsSync(target.path)) {
    return {
      ...target,
      ok: false,
      status: 'missing',
      detail: `run the matching generator before release candidate validation: ${target.path}`,
    }
  }

  try {
    const expected = buildExpected()
    const actual = JSON.parse(readFileSync(target.path, 'utf8')) as unknown
    if (canonicalReleaseJson(expected) !== canonicalReleaseJson(actual)) {
      return {
        ...target,
        ok: false,
        status: 'drift',
        detail: `regenerate or commit ${target.path}`,
      }
    }
    return { ...target, ok: true, status: 'clean' }
  } catch (error) {
    return {
      ...target,
      ok: false,
      status: 'invalid',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function validateOpsChecklistTarget(target: ReleaseArtifactDriftTarget, profileId: string): ReleaseArtifactDriftCheck {
  try {
    const result = validateOpsReleaseChecklistFile({ profileId })
    if (!result.validation.ok) {
      return {
        ...target,
        ok: false,
        status: 'invalid',
        detail: result.validation.errors.join('; '),
      }
    }
    return { ...target, ok: true, status: 'validated' }
  } catch (error) {
    return {
      ...target,
      ok: false,
      status: existsSync(target.path) ? 'invalid' : 'missing',
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function canonicalReleaseJson(value: unknown): string {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue)
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, sortJsonValue(entry)]),
  )
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_RELEASE_ARTIFACT_DRIFT_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid release artifact drift profile id: ${profileId}`)
  }
  return normalized
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = verifyReleaseArtifactDrift(parseReleaseArtifactDriftArgs(process.argv.slice(2)))
    if (!result.ok) {
      throw new Error(`release artifact drift detected: ${result.errors.join('; ')}`)
    }
    console.log(`[release-artifact-drift] ${result.profileId} clean (${result.checks.length} checks)`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
