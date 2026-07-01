import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function extractJsonBlock(source: string): any {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'Stage 822 doc must include one fenced json block')
  return JSON.parse(match[1])
}

const docPath = 'docs/RELEASE_CANDIDATE_LOCAL_DEV_STAGE822_CURRENT_2026_06_17.md'
const clientManifestPath = 'ops/release-artifacts/generated/local-dev.client-package-manifest.json'
const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-candidate-local-dev-stage822-contract'],
  'tsx server/tests/release_candidate_local_dev_stage822_contract.test.ts',
  'package.json must expose the Stage 822 release candidate evidence contract',
)

assert.ok(existsSync(docPath), `missing Stage 822 release candidate doc: ${docPath}`)
assert.ok(existsSync(clientManifestPath), `missing Stage 822 client package manifest: ${clientManifestPath}`)

const doc = readUtf8(docPath)
for (const token of [
  'Stage 822',
  'npm.cmd run release:candidate:local-dev',
  'run Godot release export wrapper',
  'validate ops secret restore recovery checklist',
  'verify release artifact drift is clean',
  'scan saved Godot release export logs',
  'processCountBefore=0',
  'processCountAfter=0',
  'Stage 823 and Stage 824 remain blocked',
]) {
  assertIncludes(doc, token, 'Stage 822 doc')
}

const stage = extractJsonBlock(doc)
const clientManifest = JSON.parse(readUtf8(clientManifestPath)) as {
  manifestKind: string
  profileId: string
  artifactPath: string
  artifactSizeBytes: number
  artifactSha256: string
}

assert.equal(stage.status, 'current Stage 822 local-dev release candidate evidence')
assert.equal(stage.stage, 822)
assert.equal(stage.profileId, 'local-dev')
assert.equal(stage.formalCommand, 'npm.cmd run release:candidate:local-dev')
assert.equal(stage.result, 'passed')
assert.equal(stage.clientPackageManifest, clientManifestPath)
assert.equal(stage.clientArtifactPath, clientManifest.artifactPath)
assert.equal(stage.clientArtifactSizeBytes, clientManifest.artifactSizeBytes)
assert.equal(stage.clientArtifactSha256, clientManifest.artifactSha256)
assert.equal(stage.serverArtifact, 'ops/release-artifacts/generated/local-dev.server-release-artifact.json')
assert.equal(stage.aiSubjectBoundary, 'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json')
assert.equal(stage.opsChecklist, 'ops/release-artifacts/local-dev.ops-release-checklist.json')
assert.deepEqual(stage.serviceProcessGuard, {
  command: 'npm.cmd run ops:service-process-guard',
  processCountBefore: 0,
  processCountAfter: 0,
  ok: true,
})
assert.deepEqual(stage.boundary, {
  sourceMovementAllowed: false,
  fakeEndpointAllowed: false,
  hostedRunEvidenceClaimed: false,
  stagingProdProfilesClaimed: false,
  physicalSplitReady: false,
})

assert.equal(clientManifest.manifestKind, 'godot-client-package-release-evidence')
assert.equal(clientManifest.profileId, 'local-dev')
assert.equal(clientManifest.artifactPath, 'exports/windows/SLG Commander.exe')
assert.ok(clientManifest.artifactSizeBytes > 0, 'client package artifact size must be positive')
assert.match(clientManifest.artifactSha256, /^[a-f0-9]{64}$/)

console.log('[release_candidate_local_dev_stage822_contract] all checks passed')
