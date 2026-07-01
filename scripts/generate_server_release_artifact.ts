import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateServerReleaseArtifactManifest } from '../shared/contracts/release/serverReleaseArtifactManifest'

export const DEFAULT_SERVER_RELEASE_ARTIFACT_PROFILE = 'local-dev'
export const SERVER_RELEASE_ARTIFACT_SOURCE_DIR = 'ops/release-artifacts'
export const GENERATED_SERVER_RELEASE_ARTIFACT_DIR = 'ops/release-artifacts/generated'

export type GenerateServerReleaseArtifactOptions = {
  profileId: string
  write?: boolean
}

export type GenerateServerReleaseArtifactResult = {
  profileId: string
  sourcePath: string
  outputPath: string
  artifact: Record<string, unknown>
  written: boolean
}

export function serverReleaseArtifactSourcePath(profileId: string): string {
  const normalizedProfileId = normalizeProfileId(profileId)
  return `${SERVER_RELEASE_ARTIFACT_SOURCE_DIR}/${normalizedProfileId}.server-release-artifact.json`
}

export function generatedServerReleaseArtifactPath(profileId: string): string {
  const normalizedProfileId = normalizeProfileId(profileId)
  return `${GENERATED_SERVER_RELEASE_ARTIFACT_DIR}/${normalizedProfileId}.server-release-artifact.json`
}

export function generateServerReleaseArtifact(
  options: GenerateServerReleaseArtifactOptions,
): GenerateServerReleaseArtifactResult {
  const profileId = normalizeProfileId(options.profileId)
  const sourcePath = serverReleaseArtifactSourcePath(profileId)
  const outputPath = generatedServerReleaseArtifactPath(profileId)

  if (!existsSync(sourcePath)) {
    throw new Error(`server release artifact source not found: ${sourcePath}`)
  }

  const sourceArtifact = JSON.parse(readFileSync(sourcePath, 'utf8')) as Record<string, unknown>
  if (sourceArtifact.profileId !== profileId) {
    throw new Error(`server release artifact profile mismatch: expected ${profileId}, found ${String(sourceArtifact.profileId)}`)
  }

  const artifact: Record<string, unknown> = {
    ...sourceArtifact,
    generatedBy: {
      script: 'scripts/generate_server_release_artifact.ts',
      sourcePath,
    },
  }

  assertNoClientPackageEvidence(artifact)

  const validation = validateServerReleaseArtifactManifest(artifact)
  if (!validation.ok) {
    throw new Error(`server release artifact ${sourcePath} is invalid: ${validation.errors.join('; ')}`)
  }

  const write = options.write ?? true
  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')
  }

  return { profileId, sourcePath, outputPath, artifact, written: write }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_SERVER_RELEASE_ARTIFACT_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid server release artifact profile id: ${profileId}`)
  }
  return normalized
}

function assertNoClientPackageEvidence(artifact: Record<string, unknown>): void {
  const serialized = JSON.stringify(artifact)
  for (const forbidden of [
    'godot-client/profiles/active.client-profile.json',
    'exports/windows/SLG Commander.exe',
    'tmp/godot_release_export_stdout.log',
    'tmp/godot_release_export_stderr.log',
  ]) {
    if (serialized.includes(forbidden)) {
      throw new Error(`server release artifact must not contain client package evidence: ${forbidden}`)
    }
  }
}

function profileArg(argv: string[]): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') return argv[index + 1] ?? ''
    if (arg.startsWith('--profile=')) return arg.slice('--profile='.length)
  }
  return DEFAULT_SERVER_RELEASE_ARTIFACT_PROFILE
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = generateServerReleaseArtifact({ profileId: profileArg(process.argv.slice(2)), write: true })
    console.log(`[server-release-artifact-generate] ${result.profileId} -> ${result.outputPath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
