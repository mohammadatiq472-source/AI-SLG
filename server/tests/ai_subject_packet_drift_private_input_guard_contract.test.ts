import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS,
  validateAiSubjectReleaseBoundaryManifest,
} from '../../shared/contracts/release/aiSubjectReleaseBoundaryManifest'
import { generateAiSubjectReleaseBoundary } from '../../scripts/generate_ai_subject_release_boundary'
import {
  buildReleaseArtifactDriftChecks,
  releaseArtifactDriftTargets,
} from '../../scripts/verify_release_artifact_drift'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
const docPath = 'docs/AI_SUBJECT_PACKET_DRIFT_PRIVATE_INPUT_GUARD_CURRENT_2026_06_17.md'

assert.equal(
  packageJson.scripts?.['test:ai-subject-packet-drift-private-input-guard-contract'],
  'tsx server/tests/ai_subject_packet_drift_private_input_guard_contract.test.ts',
  'package.json must expose the Stage 820 AI subject packet drift/private input guard contract',
)

assert.ok(existsSync(docPath), `missing Stage 820 guard doc: ${docPath}`)
const guardDoc = readUtf8(docPath)
for (const token of [
  'Stage 820',
  'AI subject packet drift / private input guard',
  'driftProtection',
  'release:artifact-drift:check',
  'GET /api/ai/players/:id/subject',
  'private sourceRefs',
  'restore tokens',
  'provider keys',
  'persistence paths',
]) {
  assertIncludes(guardDoc, token, 'Stage 820 guard doc')
}

const manifest = generateAiSubjectReleaseBoundary({ profileId: 'local-dev', write: false }).manifest
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

const aiReadableReleaseInputs = JSON.stringify({
  aiReadEntrypoints: manifest.aiReadEntrypoints,
  approvedSubjectInputs: manifest.approvedSubjectInputs,
  sourceRefsPolicy: manifest.sourceRefsPolicy,
  packetExpiryRules: manifest.packetExpiryRules,
  driftProtection: manifest.driftProtection,
})
for (const forbidden of AI_SUBJECT_RELEASE_BOUNDARY_FORBIDDEN_PRIVATE_INPUTS) {
  assert.ok(!aiReadableReleaseInputs.includes(forbidden), `AI-readable release inputs must not contain ${forbidden}`)
}

const forbiddenPacketValidation = validateAiSubjectReleaseBoundaryManifest({
  ...manifest,
  approvedSubjectInputs: [
    ...manifest.approvedSubjectInputs,
    {
      packet: 'DATABASE_URL',
      producer: 'directEnvRead',
      visibility: 'AI-read',
      serverProduced: true,
      directRead: false,
      sourceRefsPolicy: 'none',
    },
  ],
})
assert.equal(forbiddenPacketValidation.ok, false, 'validator must reject forbidden private input packet drift')
assert.ok(
  forbiddenPacketValidation.errors.some((error) => error.includes('DATABASE_URL')),
  forbiddenPacketValidation.errors.join('; '),
)

const driftTargets = releaseArtifactDriftTargets('local-dev')
assert.ok(
  driftTargets.some((target) => (
    target.label === 'AI subject boundary manifest' &&
    target.owner === 'AI-read' &&
    target.path === 'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json'
  )),
  'release artifact drift targets must include the generated AI subject boundary manifest',
)

const aiDriftCheck = buildReleaseArtifactDriftChecks({ profileId: 'local-dev' }).find(
  (check) => check.label === 'AI subject boundary manifest',
)
assert.ok(aiDriftCheck, 'release artifact drift checks must include the AI subject boundary manifest')
assert.equal(aiDriftCheck.ok, true, aiDriftCheck.detail ?? 'AI subject boundary manifest drift check failed')
assert.equal(aiDriftCheck.status, 'clean')

const releaseSteps = buildReleaseCandidateGateSteps('local-dev')
assert.ok(
  releaseSteps.some((step) => (
    step.name === 'verify release artifact drift is clean' &&
    step.args.join(' ') === 'run release:artifact-drift:check -- --profile local-dev'
  )),
  'release candidate gate must run artifact drift after generating AI subject release evidence',
)

console.log('[ai_subject_packet_drift_private_input_guard_contract] all checks passed')
