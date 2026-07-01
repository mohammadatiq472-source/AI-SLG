import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS,
  validateAiSubjectReleaseBoundaryManifest,
} from '../../shared/contracts/release/aiSubjectReleaseBoundaryManifest'
import {
  aiSubjectReleaseBoundaryOutputPath,
  generateAiSubjectReleaseBoundary,
} from '../../scripts/generate_ai_subject_release_boundary'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['generate:ai-subject-release-boundary'],
  'tsx scripts/generate_ai_subject_release_boundary.ts',
  'package.json must expose the AI subject release boundary generator',
)
assert.equal(
  packageJson.scripts?.['test:ai-subject-release-boundary-manifest-contract'],
  'tsx server/tests/ai_subject_release_boundary_manifest_contract.test.ts',
  'package.json must expose the AI subject release boundary contract',
)

assert.equal(
  aiSubjectReleaseBoundaryOutputPath('local-dev'),
  'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json',
)

const preview = generateAiSubjectReleaseBoundary({ profileId: 'local-dev', write: false })
assert.equal(preview.profileId, 'local-dev')
assert.equal(preview.outputPath, 'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json')
assert.equal(preview.written, false)

const manifest = preview.manifest
assert.equal(manifest.manifestKind, 'ai-subject-release-boundary')
assert.equal(manifest.profileId, 'local-dev')
assert.equal(manifest.generatedBy.script, 'scripts/generate_ai_subject_release_boundary.ts')

const validation = validateAiSubjectReleaseBoundaryManifest(manifest)
assert.equal(validation.ok, true, validation.errors.join('; '))

const subjectEntrypoint = manifest.aiReadEntrypoints.find(
  (entrypoint) => entrypoint.route === 'GET /api/ai/players/:id/subject',
)
assert.ok(subjectEntrypoint, 'AI subject release boundary must name the HTTP subject entrypoint')
assert.equal(subjectEntrypoint.schemaVersion, 'ai_player_subject_read_model_v1')
assert.equal(subjectEntrypoint.producer, 'buildAiPlayerSubjectReadModel')
assert.deepEqual(subjectEntrypoint.ownerLabels, ['server-owned', 'AI-read'])
assert.equal(subjectEntrypoint.serverProduced, true)
assert.equal(subjectEntrypoint.readOnly, true)
assert.equal(subjectEntrypoint.clientMutationAllowed, false)
assert.equal(subjectEntrypoint.directPrivateSourceRefsAllowed, false)
assert.equal(subjectEntrypoint.sourceRefsVisibility, 'internal_link_only')

assert.deepEqual(manifest.sourceRefsPolicy, {
  directPrivateSourceRefsAllowed: false,
  allowedWithinSubjectPacket: 'internal_link_only',
  visibleToPlayer: false,
  visibleToClient: false,
  rawPersistencePathsAllowed: false,
  providerKeysAllowed: false,
  restoreTokensAllowed: false,
})

assert.deepEqual(manifest.packetExpiryRules, {
  subjectPacketBuild: 'server_rebuild_per_request',
  clientCacheAuthority: 'none',
  maxClientCacheTtlMs: 0,
  stalePacketAction: 'discard_and_refetch_subject',
  recoveryAnchorRetentionOwner: 'server',
})

assert.deepEqual(manifest.driftProtection, {
  generatedArtifactPath: 'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json',
  releaseArtifactDriftTarget: 'AI subject boundary manifest',
  driftGateCommand: 'npm.cmd run release:artifact-drift:check -- --profile local-dev',
  releaseCandidateStep: 'verify release artifact drift is clean',
  generatorIsSourceOfTruth: true,
  addNewAiInputRequiresManifestUpdate: true,
  failOnUnlistedSubjectInput: true,
  privateInputDriftAction: 'reject_manifest',
})

for (const approvedInput of manifest.approvedSubjectInputs) {
  assert.equal(approvedInput.serverProduced, true, `${approvedInput.packet} must be server-produced`)
  assert.equal(approvedInput.directRead, false, `${approvedInput.packet} must not be a direct private read`)
}

for (const requiredPacket of [
  'ai_player_subject_read_model_v1',
  'ai_player_subject_recent_body_changes_v1',
  'ai_player_subject_history_anchors_v1',
  'ai_player_subject_recovery_anchors_v1',
]) {
  assert.ok(
    manifest.approvedSubjectInputs.some((input) => input.packet === requiredPacket),
    `missing approved AI subject input packet: ${requiredPacket}`,
  )
}

for (const requiredForbidden of [
  'DATABASE_URL',
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'FACTION_APIKEY_ENCRYPTION_KEY',
  'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH',
  'WORLD_PERSIST_ROOT',
  'privateAiSourceRefs',
]) {
  assert.ok(
    manifest.forbiddenPrivateInputs.includes(requiredForbidden),
    `manifest must explicitly forbid ${requiredForbidden}`,
  )
}

const aiReadableSurface = JSON.stringify({
  aiReadEntrypoints: manifest.aiReadEntrypoints,
  approvedSubjectInputs: manifest.approvedSubjectInputs,
  sourceRefsPolicy: manifest.sourceRefsPolicy,
  packetExpiryRules: manifest.packetExpiryRules,
})
for (const forbidden of AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS) {
  assert.ok(!aiReadableSurface.includes(forbidden), `AI-readable surface must not contain ${forbidden}`)
}

const written = generateAiSubjectReleaseBoundary({ profileId: 'local-dev', write: true })
assert.equal(written.written, true)
assert.ok(existsSync(written.outputPath), `expected generated manifest at ${written.outputPath}`)
const generatedValidation = validateAiSubjectReleaseBoundaryManifest(
  JSON.parse(readFileSync(written.outputPath, 'utf8')) as unknown,
)
assert.equal(generatedValidation.ok, true, generatedValidation.errors.join('; '))

const brokenValidation = validateAiSubjectReleaseBoundaryManifest({
  ...manifest,
  sourceRefsPolicy: {
    ...manifest.sourceRefsPolicy,
    directPrivateSourceRefsAllowed: true,
  },
})
assert.equal(brokenValidation.ok, false, 'validator must reject private sourceRefs exposure')
assert.ok(
  brokenValidation.errors.some((error) => error.includes('directPrivateSourceRefsAllowed')),
  brokenValidation.errors.join('; '),
)

const brokenDriftValidation = validateAiSubjectReleaseBoundaryManifest({
  ...manifest,
  driftProtection: {
    ...manifest.driftProtection,
    addNewAiInputRequiresManifestUpdate: false,
  },
})
assert.equal(brokenDriftValidation.ok, false, 'validator must reject AI subject input drift bypass')
assert.ok(
  brokenDriftValidation.errors.some((error) => error.includes('addNewAiInputRequiresManifestUpdate')),
  brokenDriftValidation.errors.join('; '),
)

const brokenPrivateDriftValidation = validateAiSubjectReleaseBoundaryManifest({
  ...manifest,
  driftProtection: {
    ...manifest.driftProtection,
    driftGateCommand: 'npm.cmd run release:artifact-drift:check -- --profile local-dev --leak OPENAI_API_KEY',
  },
})
assert.equal(brokenPrivateDriftValidation.ok, false, 'validator must reject private input drift metadata leaks')
assert.ok(
  brokenPrivateDriftValidation.errors.some((error) => error.includes('OPENAI_API_KEY')),
  brokenPrivateDriftValidation.errors.join('; '),
)

assert.throws(
  () => aiSubjectReleaseBoundaryOutputPath('../prod'),
  /invalid ai subject release boundary profile id/,
)

const releaseSteps = buildReleaseCandidateGateSteps('local-dev')
assert.ok(
  releaseSteps.some((step) => step.name === 'generate AI subject release boundary manifest'),
  'release candidate gate must generate the AI subject boundary manifest',
)
assert.ok(
  releaseSteps.some((step) => step.name === 'validate AI subject release boundary manifest'),
  'release candidate gate must validate the AI subject boundary manifest',
)

console.log('[ai_subject_release_boundary_manifest_contract] all checks passed')
