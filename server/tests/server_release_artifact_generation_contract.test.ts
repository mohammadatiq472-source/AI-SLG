import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  generateServerReleaseArtifact,
  generatedServerReleaseArtifactPath,
  serverReleaseArtifactSourcePath,
} from '../../scripts/generate_server_release_artifact'
import { validateServerReleaseArtifactManifest } from '../../shared/contracts/release/serverReleaseArtifactManifest'

const PACKAGE_JSON = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  PACKAGE_JSON.scripts?.['release:server-artifact:generate'],
  'tsx scripts/generate_server_release_artifact.ts',
  'package.json must expose release:server-artifact:generate as the formal server artifact generation entry',
)
assert.equal(
  PACKAGE_JSON.scripts?.['test:server-release-artifact-generation-contract'],
  'tsx server/tests/server_release_artifact_generation_contract.test.ts',
  'package.json must expose test:server-release-artifact-generation-contract as the formal contract gate',
)

assert.equal(
  serverReleaseArtifactSourcePath('local-dev'),
  'ops/release-artifacts/local-dev.server-release-artifact.json',
)
assert.equal(
  generatedServerReleaseArtifactPath('local-dev'),
  'ops/release-artifacts/generated/local-dev.server-release-artifact.json',
)

const preview = generateServerReleaseArtifact({ profileId: 'local-dev', write: false })

assert.equal(preview.profileId, 'local-dev')
assert.equal(preview.sourcePath, 'ops/release-artifacts/local-dev.server-release-artifact.json')
assert.equal(preview.outputPath, 'ops/release-artifacts/generated/local-dev.server-release-artifact.json')
assert.equal(preview.written, false)
assert.equal(preview.artifact.profileId, 'local-dev')
assert.equal(preview.artifact.artifactKind, 'server-authoritative-release')

const validation = validateServerReleaseArtifactManifest(preview.artifact)
assert.equal(validation.ok, true, `generated server release artifact must validate: ${validation.errors.join('; ')}`)

const routes = preview.artifact.routes as Array<Record<string, unknown>>
for (const requiredRoute of ['/api/world', '/api/player-history', '/api/ai/players/:id/subject']) {
  assert.ok(routes.some((route) => route.path === requiredRoute), `generated artifact must carry route ${requiredRoute}`)
}

const serializedPreview = JSON.stringify(preview.artifact)
for (const forbiddenClientPackageEvidence of [
  'godot-client/profiles/active.client-profile.json',
  'exports/windows/SLG Commander.exe',
  'tmp/godot_release_export_stdout.log',
  'tmp/godot_release_export_stderr.log',
]) {
  assert.ok(
    !serializedPreview.includes(forbiddenClientPackageEvidence),
    `server release artifact must not contain client package evidence ${forbiddenClientPackageEvidence}`,
  )
}

assert.throws(
  () => serverReleaseArtifactSourcePath('../prod'),
  /invalid server release artifact profile id/,
  'profile id normalization must reject path traversal',
)
assert.throws(
  () => generateServerReleaseArtifact({ profileId: 'missing-profile', write: false }),
  /server release artifact source not found/,
  'unknown profiles must fail instead of silently generating placeholder artifacts',
)

const written = generateServerReleaseArtifact({ profileId: 'local-dev', write: true })
assert.equal(written.written, true)
assert.ok(existsSync(written.outputPath), `${written.outputPath} must be written by the generator`)

const writtenArtifact = JSON.parse(readFileSync(written.outputPath, 'utf8')) as Record<string, unknown>
const writtenValidation = validateServerReleaseArtifactManifest(writtenArtifact)
assert.equal(writtenValidation.ok, true, `written server release artifact must validate: ${writtenValidation.errors.join('; ')}`)
assert.equal(writtenArtifact.profileId, 'local-dev')
assert.equal(writtenArtifact.clientProfilePath, 'godot-client/profiles/local-dev.client-profile.json')

console.log('[server_release_artifact_generation_contract] all checks passed')
