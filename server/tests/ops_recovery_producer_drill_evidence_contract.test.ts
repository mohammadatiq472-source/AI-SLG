import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  validateOpsReleaseChecklist,
  type OpsReleaseChecklistRecoveryDrillEvidence,
} from '../../shared/contracts/release/opsReleaseChecklist'
import {
  loadOpsReleaseChecklist,
  validateOpsReleaseChecklistFile,
} from '../../scripts/validate_ops_release_checklist'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'
import { buildReleaseArtifactDriftChecks } from '../../scripts/verify_release_artifact_drift'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}
const docPath = 'docs/OPS_RECOVERY_PRODUCER_DRILL_EVIDENCE_CURRENT_2026_06_17.md'

assert.equal(
  packageJson.scripts?.['test:ops-recovery-producer-drill-evidence-contract'],
  'tsx server/tests/ops_recovery_producer_drill_evidence_contract.test.ts',
  'package.json must expose the Stage 821 ops recovery producer drill evidence contract',
)
assert.ok(existsSync(docPath), `missing Stage 821 ops recovery producer drill evidence doc: ${docPath}`)
const doc = readUtf8(docPath)
for (const token of [
  'Stage 821',
  'ops recovery producer drill evidence',
  'drillEvidence',
  'release:ops:check',
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
  'secretMaterialRecorded=false',
  'privatePathValuesRecorded=false',
  'clientPackaged=false',
  'aiReadable=false',
]) {
  assertIncludes(doc, token, 'Stage 821 doc')
}

const loaded = loadOpsReleaseChecklist('local-dev')
const checklist = loaded.checklist
const validation = validateOpsReleaseChecklist(checklist)
assert.equal(validation.ok, true, validation.errors.join('; '))
const fileValidation = validateOpsReleaseChecklistFile({ profileId: 'local-dev' })
assert.equal(fileValidation.validation.ok, true, fileValidation.validation.errors.join('; '))

const expectedEvidence: Array<Pick<OpsReleaseChecklistRecoveryDrillEvidence, 'producerName' | 'resultSemantic' | 'entrypoint'>> = [
  {
    producerName: 'save-slots-archive-restore-drill',
    resultSemantic: 'restore-drill',
    entrypoint: 'release:ops:check -> /api/save-slots/archive/restore-drill marker validation',
  },
  {
    producerName: 'save-slots-archive-restore-apply',
    resultSemantic: 'restore-apply-stability',
    entrypoint: 'gate:save-slots:restore-apply:stability',
  },
  {
    producerName: 'save-slots-archive-restore-rollback-drill',
    resultSemantic: 'rollback-drill',
    entrypoint: 'gate:ai:nightly:acceptance',
  },
]

for (const expected of expectedEvidence) {
  const evidence = checklist.drillEvidence.find((item) => item.producerName === expected.producerName)
  assert.ok(evidence, `missing drill evidence for ${expected.producerName}`)
  assert.equal(evidence.resultSemantic, expected.resultSemantic)
  assert.equal(evidence.entrypoint, expected.entrypoint)
  assert.equal(evidence.owner, 'ops')
  assert.equal(evidence.requiresSecret, 'SAVE_SLOT_RESTORE_SCOPE_TOKEN')
  assert.equal(evidence.secretMaterialRecorded, false)
  assert.equal(evidence.privatePathValuesRecorded, false)
  assert.equal(evidence.clientPackaged, false)
  assert.equal(evidence.aiReadable, false)
  assert.equal(evidence.releaseCandidateGate, 'release:ops:check')
}

const serializedDrillEvidence = JSON.stringify(checklist.drillEvidence)
for (const forbidden of [
  'godot-client/',
  'exports/windows/',
  'tmp/godot_release_export',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'WORLD_SAVE_SLOTS_PATH=',
  'SAVE_SLOT_RESTORE_SCOPE_TOKEN=',
]) {
  assert.equal(
    serializedDrillEvidence.includes(forbidden),
    false,
    `drill evidence must not expose client path or secret material ${forbidden}`,
  )
}

const brokenClientValidation = validateOpsReleaseChecklist({
  ...checklist,
  drillEvidence: checklist.drillEvidence.map((evidence, index) => (
    index === 0 ? { ...evidence, clientPackaged: true } : evidence
  )),
})
assert.equal(brokenClientValidation.ok, false, 'validator must reject client-packaged recovery drill evidence')
assert.ok(
  brokenClientValidation.errors.some((error) => error.includes('clientPackaged')),
  brokenClientValidation.errors.join('; '),
)

const releaseSteps = buildReleaseCandidateGateSteps('local-dev')
const opsStep = releaseSteps.find((step) => step.name === 'validate ops secret restore recovery checklist')
assert.ok(opsStep, 'release candidate gate must include ops recovery checklist validation')
assert.equal(opsStep.args.join(' '), 'run release:ops:check -- --profile local-dev')

const opsDriftCheck = buildReleaseArtifactDriftChecks({ profileId: 'local-dev' }).find(
  (check) => check.label === 'ops secret restore recovery checklist',
)
assert.ok(opsDriftCheck, 'release artifact drift checks must include the ops checklist')
assert.equal(opsDriftCheck.ok, true, opsDriftCheck.detail ?? 'ops checklist drift validation failed')
assert.equal(opsDriftCheck.status, 'validated')

console.log('[ops_recovery_producer_drill_evidence_contract] all checks passed')
