import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs'
import { buildGodotReleaseExportSteps } from '../../scripts/run_godot_release_export'
import {
  DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
  DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
  DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG,
  clientPackageManifestOutputPath,
  generateClientPackageManifest,
} from '../../scripts/generate_client_package_manifest'
import { validateClientPackageManifest } from '../../shared/contracts/release/clientPackageManifest'
import { CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS } from '../../shared/contracts/release/clientEndpointProfileManifest'

const PACKAGE_JSON = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  PACKAGE_JSON.scripts?.['release:client-package-manifest:generate'],
  'tsx scripts/generate_client_package_manifest.ts',
  'package.json must expose release:client-package-manifest:generate as the formal client package manifest generator',
)
assert.equal(
  PACKAGE_JSON.scripts?.['test:client-package-manifest-generation-contract'],
  'tsx server/tests/client_package_manifest_generation_contract.test.ts',
  'package.json must expose test:client-package-manifest-generation-contract as the formal contract gate',
)

assert.equal(DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH, 'exports/windows/SLG Commander.exe')
assert.equal(DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG, 'tmp/godot_release_export_stdout.log')
assert.equal(DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG, 'tmp/godot_release_export_stderr.log')
assert.equal(
  clientPackageManifestOutputPath('local-dev'),
  'ops/release-artifacts/generated/local-dev.client-package-manifest.json',
)

const preview = generateClientPackageManifest({
  profileId: 'local-dev',
  preset: 'Windows Desktop',
  artifactPath: DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
  exportStdoutLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG,
  exportStderrLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
  write: false,
})

assert.equal(preview.profileId, 'local-dev')
assert.equal(preview.outputPath, 'ops/release-artifacts/generated/local-dev.client-package-manifest.json')
assert.equal(preview.written, false)
assert.equal(preview.manifest.manifestKind, 'godot-client-package-release-evidence')
assert.equal(preview.manifest.profileId, 'local-dev')
assert.equal(preview.manifest.preset, 'Windows Desktop')
assert.equal(preview.manifest.artifactPath, DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH)
assert.equal(preview.manifest.exportStdoutLog, DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG)
assert.equal(preview.manifest.exportStderrLog, DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG)
assert.equal(preview.manifest.artifactSizeBytes, statSync(DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH).size)
assert.equal(
  preview.manifest.artifactSha256,
  createHash('sha256').update(readFileSync(DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH)).digest('hex'),
)
assert.deepEqual(preview.manifest.hygieneScan, {
  ok: true,
  logs: [
    { path: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG, hits: [] },
    { path: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG, hits: [] },
  ],
})

const validation = validateClientPackageManifest(preview.manifest)
assert.equal(validation.ok, true, `client package manifest must validate: ${validation.errors.join('; ')}`)

const serializedPreview = JSON.stringify(preview.manifest)
for (const forbiddenKey of CLIENT_ENDPOINT_PROFILE_FORBIDDEN_KEYS) {
  assert.ok(
    !serializedPreview.includes(forbiddenKey),
    `client package manifest must not contain forbidden server/private key ${forbiddenKey}`,
  )
}

const dirtyLogPath = 'tmp/client_package_manifest_dirty_log_test.log'
writeFileSync(dirtyLogPath, 'SCRIPT ERROR: res://tmp/dev_resource.gd failed', 'utf8')
try {
  assert.throws(
    () =>
      generateClientPackageManifest({
        profileId: 'local-dev',
        preset: 'Windows Desktop',
        artifactPath: DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
        exportStdoutLog: dirtyLogPath,
        exportStderrLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
        write: false,
      }),
    /client package hygiene scan failed/,
    'dirty export logs must fail before a client package manifest is written',
  )
} finally {
  unlinkSync(dirtyLogPath)
}

assert.throws(
  () => clientPackageManifestOutputPath('../prod'),
  /invalid client package manifest profile id/,
  'profile id normalization must reject path traversal',
)
assert.throws(
  () =>
    generateClientPackageManifest({
      profileId: 'local-dev',
      preset: 'Windows Desktop',
      artifactPath: 'exports/windows/missing.exe',
      exportStdoutLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG,
      exportStderrLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
      write: false,
    }),
  /client package artifact not found/,
  'manifest generation must fail when the exported client package is missing',
)

const written = generateClientPackageManifest({
  profileId: 'local-dev',
  preset: 'Windows Desktop',
  artifactPath: DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
  exportStdoutLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDOUT_LOG,
  exportStderrLog: DEFAULT_CLIENT_PACKAGE_MANIFEST_STDERR_LOG,
  write: true,
})
assert.equal(written.written, true)
assert.ok(existsSync(written.outputPath), `${written.outputPath} must be written by the generator`)

const writtenManifest = JSON.parse(readFileSync(written.outputPath, 'utf8')) as Record<string, unknown>
const writtenValidation = validateClientPackageManifest(writtenManifest)
assert.equal(writtenValidation.ok, true, `written client package manifest must validate: ${writtenValidation.errors.join('; ')}`)
assert.equal(writtenManifest.profileId, 'local-dev')
assert.equal(writtenManifest.artifactPath, DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH)

const exportSteps = buildGodotReleaseExportSteps({
  profileId: 'local-dev',
  preset: 'Windows Desktop',
  outputPath: DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
  godotExe: '',
  dryRun: false,
})
assert.deepEqual(
  exportSteps.map((step) => step.name),
  [
    'run release preflight for selected client profile',
    'export Godot release package',
    'generate client package manifest',
  ],
)
const manifestStep = exportSteps[2]
assert.equal(manifestStep.command, 'npm')
assert.deepEqual(manifestStep.args, [
  'run',
  'release:client-package-manifest:generate',
  '--',
  '--profile',
  'local-dev',
  '--preset',
  'Windows Desktop',
  '--artifact',
  DEFAULT_CLIENT_PACKAGE_MANIFEST_ARTIFACT_PATH,
])

console.log('[client_package_manifest_generation_contract] all checks passed')
