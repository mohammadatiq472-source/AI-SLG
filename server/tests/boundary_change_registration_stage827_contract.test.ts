import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

type RequiredSurface = {
  id: string
  path?: string
  command?: string
  requiredFields?: string[]
  requiredWhen: string
}

type StageTypePolicy = {
  stageType: string
  mustRegister: string[]
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:boundary-change-registration-stage827-contract'],
  'tsx server/tests/boundary_change_registration_stage827_contract.test.ts',
  'package.json must expose the Stage 827 boundary change registration contract',
)
assert.equal(
  packageJson.scripts?.['test:release-artifact:feature-boundary-card-contract'],
  'tsx server/tests/feature_boundary_card_doc_contract.test.ts',
  'package.json must keep the reusable Feature Boundary Card contract available',
)
assert.equal(
  packageJson.scripts?.['release:artifact-drift:check'],
  'tsx scripts/verify_release_artifact_drift.ts',
  'package.json must keep the release artifact drift gate available',
)

const manifestPath = 'ops/release-artifacts/local-dev.boundary-change-registration.json'
const stage826ManifestPath = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const docPath = 'docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CHANGE_REGISTRATION_CURRENT_2026_06_17.md'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'

assert.ok(existsSync(manifestPath), `missing Stage 827 registration manifest: ${manifestPath}`)
assert.ok(existsSync(stage826ManifestPath), `missing Stage 826 convergence manifest: ${stage826ManifestPath}`)
assert.ok(existsSync(docPath), `missing Stage 827 registration doc: ${docPath}`)

const manifest = JSON.parse(readUtf8(manifestPath)) as {
  status: string
  stage: number
  profileId: string
  policyId: string
  requiredSurfaces: RequiredSurface[]
  stageTypePolicies: StageTypePolicy[]
  bypassDenied: string[]
  staticGuardCommand: string
}

assert.equal(manifest.status, 'current Stage 827 boundary change registration guard')
assert.equal(manifest.stage, 827)
assert.equal(manifest.profileId, 'local-dev')
assert.equal(manifest.policyId, 'client_server_ai_ops_boundary_change_registration_v1')
assert.equal(manifest.staticGuardCommand, 'npm.cmd run test:boundary-change-registration-stage827-contract')

for (const [id, requiredWhen] of [
  ['feature_boundary_card', 'every boundary-sensitive feature stage'],
  ['stage826_convergence_sentinel', 'every completed boundary stage'],
  ['current_handoff', 'every completed stage'],
  ['release_artifact_drift_gate', 'release artifact, client package, AI subject, or ops checklist changes'],
  ['service_process_policy', 'any command that can start server:dev, tsx watch, Godot smoke, or export work'],
  ['gameplay_anchor_registry', 'every gameplay-anchor stage'],
] as Array<[string, string]>) {
  const surface = manifest.requiredSurfaces.find((item) => item.id === id)
  assert.ok(surface, `manifest must include registration surface: ${id}`)
  assert.equal(surface.requiredWhen, requiredWhen)
}

const featureBoundaryCard = manifest.requiredSurfaces.find((item) => item.id === 'feature_boundary_card')
assert.ok(featureBoundaryCard, 'feature boundary card surface must exist')
assert.deepEqual(featureBoundaryCard.requiredFields, [
  'Client artifact changes',
  'Server authoritative changes',
  'Shared contract changes',
  'AI-read changes',
  'Ops/release changes',
  'Secret/persistence/recovery touched',
  'Client package forbidden-data scan',
  'Formal gates',
])

for (const [stageType, mustRegister] of [
  ['gameplay-anchor', 'feature_boundary_card'],
  ['gameplay-anchor', 'gameplay_anchor_registry'],
  ['server-authority', 'stage826_convergence_sentinel'],
  ['ai-subject', 'release_artifact_drift_gate'],
  ['ops-recovery', 'release_artifact_drift_gate'],
  ['client-package-profile', 'release_artifact_drift_gate'],
  ['release-artifact', 'release_artifact_drift_gate'],
  ['service-spawning-gate', 'service_process_policy'],
] as Array<[string, string]>) {
  const policy = manifest.stageTypePolicies.find((item) => item.stageType === stageType)
  assert.ok(policy, `manifest must include stage type policy: ${stageType}`)
  assert.ok(policy.mustRegister.includes(mustRegister), `${stageType} must register ${mustRegister}`)
}

for (const denied of [
  'client-only completion claim for server-authoritative feature',
  'server route change without client package boundary classification',
  'AI subject input change without release artifact drift consideration',
  'ops recovery or secret change without server-only checklist evidence',
  'backend-starting verification without service process guard',
  'physical source split without Stage 823 and Stage 824 evidence',
]) {
  assert.ok(manifest.bypassDenied.includes(denied), `missing denied bypass: ${denied}`)
}

const stage826 = JSON.parse(readUtf8(stage826ManifestPath)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards?: string[]
}
const stage827 = stage826.completedStages?.find((item) => item.stageId === 827)
assert.ok(stage827, 'Stage 826 convergence manifest must record Stage 827 completion')
assert.equal(stage827.status, 'formal-green')
assert.ok(stage827.evidence.includes(manifestPath), 'Stage 827 evidence must include the registration manifest')
assert.ok(
  stage826.mandatoryGuards?.includes('boundary_change_registration_guard'),
  'Stage 826 convergence manifest must list boundary_change_registration_guard as mandatory',
)

const doc = readUtf8(docPath)
for (const token of [
  'Stage 827',
  manifestPath,
  'current Stage 827 boundary change registration guard',
  'Feature Boundary Card',
  'release:artifact-drift:check',
  'boundary_change_registration_guard',
  'does not start `server:dev`, `tsx watch`, Godot export, or a smoke backend',
]) {
  assertIncludes(doc, token, 'Stage 827 doc')
}

const current = readUtf8(currentPath)
assertIncludes(current, 'Stage 827 - Boundary Change Registration Guard', 'CURRENT handoff')
assertIncludes(current, manifestPath, 'CURRENT handoff')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 827', 'mega plan')
assertIncludes(megaPlan, 'boundary change registration guard', 'mega plan')

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 827', 'split target')
assertIncludes(splitTarget, 'local-dev.boundary-change-registration.json', 'split target')

console.log('[boundary_change_registration_stage827_contract] all checks passed')
