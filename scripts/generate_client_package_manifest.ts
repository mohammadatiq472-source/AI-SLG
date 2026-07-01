import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { validateClientPackageManifest, type ClientPackageManifest } from '../shared/contracts/release/clientPackageManifest'
import { inspectGodotReleaseExportLog } from './validate_godot_release_export_hygiene'

export const DEFAULT_CLIENT_PACKAGE_MANIFEST_PROFILE = 'local-dev'
export const DEFAULT_CLIENT_PACKAGE_MANIFEST_PRESET = 'Windows Desktop'
export const DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH = 'exports/windows/SLG Commander.exe'
export const DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG = 'tmp/godot_release_export_stdout.log'
export const DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG = 'tmp/godot_release_export_stderr.log'
export const GENERATED_CLIENT_PACKAGE_MANIFEST_DIR = 'ops/release-artifacts/generated'

export type GenerateClientPackageManifestOptions = {
  profileId: string
  preset: string
  artifactPath: string
  exportStdoutLog: string
  exportStderrLog: string
  outputPath?: string
  write?: boolean
}

export type GenerateClientPackageManifestResult = {
  profileId: string
  outputPath: string
  manifest: ClientPackageManifest
  written: boolean
}

export function clientPackageManifestOutputPath(profileId: string): string {
  const normalizedProfileId = normalizeProfileId(profileId)
  return `${GENERATED_CLIENT_PACKAGE_MANIFEST_DIR}/${normalizedProfileId}.client-package-manifest.json`
}

export function generateClientPackageManifest(
  options: GenerateClientPackageManifestOptions,
): GenerateClientPackageManifestResult {
  const profileId = normalizeProfileId(options.profileId)
  const preset = options.preset.trim() || DEFAULT_CLIENT_PACKAGE_MANIFEST_PRESET
  const artifactPath = options.artifactPath.trim() || DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH
  const exportStdoutLog = options.exportStdoutLog.trim() || DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG
  const exportStderrLog = options.exportStderrLog.trim() || DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG
  const outputPath = options.outputPath?.trim() || clientPackageManifestOutputPath(profileId)

  assertFileExists(artifactPath, 'client package artifact')
  assertFileExists(exportStdoutLog, 'Godot release export stdout log')
  assertFileExists(exportStderrLog, 'Godot release export stderr log')

  const stdoutInspection = inspectGodotReleaseExportLog(readFileSync(exportStdoutLog, 'utf8'))
  const stderrInspection = inspectGodotReleaseExportLog(readFileSync(exportStderrLog, 'utf8'))
  if (!stdoutInspection.ok || !stderrInspection.ok) {
    throw new Error(
      `client package hygiene scan failed: ${JSON.stringify({
        stdoutHits: stdoutInspection.hits,
        stderrHits: stderrInspection.hits,
      })}`,
    )
  }

  const manifest: ClientPackageManifest = {
    manifestKind: 'godot-client-package-release-evidence',
    profileId,
    preset,
    artifactPath,
    artifactSha256: sha256File(artifactPath),
    artifactSizeBytes: statSync(artifactPath).size,
    exportStdoutLog,
    exportStderrLog,
    hygieneScan: {
      ok: true,
      logs: [
        { path: exportStdoutLog, hits: stdoutInspection.hits },
        { path: exportStderrLog, hits: stderrInspection.hits },
      ],
    },
    generatedBy: {
      script: 'scripts/generate_client_package_manifest.ts',
    },
  }

  const validation = validateClientPackageManifest(manifest)
  if (!validation.ok) {
    throw new Error(`client package manifest is invalid: ${validation.errors.join('; ')}`)
  }

  const write = options.write ?? true
  if (write) {
    mkdirSync(dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  }

  return { profileId, outputPath, manifest, written: write }
}

function sha256File(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function assertFileExists(path: string, label: string): void {
  if (!existsSync(path)) {
    throw new Error(`${label} not found: ${path}`)
  }
}

function normalizeProfileId(profileId: string): string {
  const normalized = profileId.trim() || DEFAULT_CLIENT_PACKAGE_MANIFEST_PROFILE
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`invalid client package manifest profile id: ${profileId}`)
  }
  return normalized
}

function optionArg(argv: string[], name: string, fallback: string): string {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === name) return argv[index + 1] ?? ''
    if (arg.startsWith(`${name}=`)) return arg.slice(name.length + 1)
  }
  return fallback
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? '')).href) {
  try {
    const result = generateClientPackageManifest({
      profileId: optionArg(process.argv.slice(2), '--profile', DEFAULT_CLIENT_PACKAGE_MANIFEST_PROFILE),
      preset: optionArg(process.argv.slice(2), '--preset', DEFAULT_CLIENT_PACKAGE_MANIFEST_PRESET),
      artifactPath: optionArg(process.argv.slice(2), '--artifact', DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH),
      exportStdoutLog: optionArg(process.argv.slice(2), '--stdout-log', DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG),
      exportStderrLog: optionArg(process.argv.slice(2), '--stderr-log', DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG),
      write: true,
    })
    console.log(`[client-package-manifest-generate] ${result.profileId} -> ${result.outputPath}`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}
