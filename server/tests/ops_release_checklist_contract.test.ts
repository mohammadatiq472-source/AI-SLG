import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  OPS_RELEASE_CHECKLIST_REQUIRED_SECRET_NAMES,
  validateOpsReleaseChecklist,
} from '../../shared/contracts/release/opsReleaseChecklist'
import {
  loadOpsReleaseChecklist,
  opsReleaseChecklistPath,
  validateOpsReleaseChecklistFile,
} from '../../scripts/validate_ops_release_checklist'
import { buildReleaseCandidateGateSteps } from '../../scripts/run_release_candidate_gate'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:ops:check'],
  'tsx scripts/validate_ops_release_checklist.ts',
  'package.json must expose the ops release checklist validator',
)
assert.equal(
  packageJson.scripts?.['test:ops-release-checklist-contract'],
  'tsx server/tests/ops_release_checklist_contract.test.ts',
  'package.json must expose the ops release checklist contract',
)

assert.equal(
  opsReleaseChecklistPath('local-dev'),
  'ops/release-artifacts/local-dev.ops-release-checklist.json',
)

const loaded = loadOpsReleaseChecklist('local-dev')
assert.equal(loaded.profileId, 'local-dev')
assert.equal(loaded.sourcePath, 'ops/release-artifacts/local-dev.ops-release-checklist.json')

const checklist = loaded.checklist
assert.equal(checklist.checklistKind, 'ops-secret-restore-recovery-producer-checklist')
assert.equal(checklist.profileId, 'local-dev')
assert.equal(checklist.validatedBy.script, 'scripts/validate_ops_release_checklist.ts')

const validation = validateOpsReleaseChecklist(checklist)
assert.equal(validation.ok, true, validation.errors.join('; '))
const fileValidation = validateOpsReleaseChecklistFile({ profileId: 'local-dev' })
assert.equal(fileValidation.validation.ok, true, fileValidation.validation.errors.join('; '))

const secretNames = checklist.secretInputs.map((secret) => secret.name)
for (const secretName of OPS_RELEASE_CHECKLIST_REQUIRED_SECRET_NAMES) {
  assert.ok(secretNames.includes(secretName), `ops checklist must include secret ${secretName}`)
}
for (const secret of checklist.secretInputs) {
  assert.equal(secret.inClientPackage, false, `${secret.name} must not be in the client package`)
  assert.equal(secret.inOpsSecretStore, true, `${secret.name} must be in the ops secret store`)
  assert.equal(secret.injection, 'env', `${secret.name} must be injected as an env secret`)
}

const privateStateEnvNames = checklist.privateStateStores.map((store) => store.env)
for (const envName of [
  'WORLD_PERSIST_ROOT',
  'WORLD_SAVE_SLOTS_PATH',
  'WORLD_SAVE_SLOTS_ARCHIVE_DIR',
  'AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH',
]) {
  assert.ok(privateStateEnvNames.includes(envName), `ops checklist must include private state env ${envName}`)
}
for (const store of checklist.privateStateStores) {
  assert.equal(store.clientPackaged, false, `${store.name} must not be client packaged`)
  assert.equal(store.owner, 'server-owned', `${store.name} must be server-owned`)
  assert.equal(store.pathScope, 'server-runtime', `${store.name} must stay in server runtime path scope`)
}

const restoreProducerNames = checklist.recoveryProducers.map((producer) => producer.name)
for (const producerName of [
  'save-slots-archive-catalog',
  'save-slots-archive-restore-drill',
  'save-slots-archive-restore-apply',
  'save-slots-archive-restore-rollback-drill',
  'save-slots-persist-health',
]) {
  assert.ok(restoreProducerNames.includes(producerName), `missing recovery producer ${producerName}`)
}
for (const producer of checklist.recoveryProducers) {
  assert.equal(producer.owner, 'server-owned', `${producer.name} must be server-owned`)
  assert.equal(producer.clientVisible, false, `${producer.name} must not be a client-visible producer`)
  assert.equal(producer.clientPackaged, false, `${producer.name} must not be client packaged`)
}

const commandNames = checklist.backupRollbackCommands.map((command) => command.command)
for (const commandName of [
  'gate:save-slots:restore-apply:stability',
  'gate:ai:nightly:acceptance',
]) {
  assert.ok(commandNames.includes(commandName), `missing backup/rollback command ${commandName}`)
}

const drillEvidenceByProducer = new Map(checklist.drillEvidence.map((evidence) => [evidence.producerName, evidence]))
for (const producerName of [
  'save-slots-archive-restore-drill',
  'save-slots-archive-restore-apply',
  'save-slots-archive-restore-rollback-drill',
]) {
  assert.ok(drillEvidenceByProducer.has(producerName), `missing drill evidence for ${producerName}`)
}
for (const evidence of checklist.drillEvidence) {
  assert.equal(evidence.owner, 'ops', `${evidence.evidenceId} must be owned by ops`)
  assert.equal(evidence.releaseCandidateGate, 'release:ops:check', `${evidence.evidenceId} must be gated by release:ops:check`)
  assert.equal(evidence.secretMaterialRecorded, false, `${evidence.evidenceId} must not record secret material`)
  assert.equal(evidence.privatePathValuesRecorded, false, `${evidence.evidenceId} must not record private path values`)
  assert.equal(evidence.clientPackaged, false, `${evidence.evidenceId} must not be client packaged`)
  assert.equal(evidence.aiReadable, false, `${evidence.evidenceId} must not be AI-readable`)
}

const serializedChecklist = JSON.stringify(checklist)
for (const forbiddenClientPath of [
  'godot-client/',
  'godot-client\\\\',
  'exports/windows/',
  'tmp/godot_release_export',
]) {
  assert.equal(
    serializedChecklist.includes(forbiddenClientPath),
    false,
    `ops checklist must not point to client/export path ${forbiddenClientPath}`,
  )
}

for (const evidence of checklist.codeEvidence) {
  assert.ok(evidence.requiredMarkers.length > 0, `${evidence.path} must have code evidence markers`)
}

const brokenValidation = validateOpsReleaseChecklist({
  ...checklist,
  privateStateStores: [
    ...checklist.privateStateStores,
    {
      name: 'bad-client-store',
      env: 'BAD_CLIENT_STORE_PATH',
      owner: 'server-owned',
      clientPackaged: false,
      pathScope: 'server-runtime',
      restoreAuthority: 'server-only',
      evidencePath: 'godot-client/private-store.json',
    },
  ],
})
assert.equal(brokenValidation.ok, false, 'validator must reject checklist paths under godot-client')
assert.ok(
  brokenValidation.errors.some((error) => error.includes('godot-client')),
  brokenValidation.errors.join('; '),
)

const brokenDrillValidation = validateOpsReleaseChecklist({
  ...checklist,
  drillEvidence: [
    ...checklist.drillEvidence,
    {
      evidenceId: 'bad_restore_drill_secret_leak',
      producerName: 'save-slots-archive-restore-drill',
      entrypoint: 'bad drill',
      evidenceKind: 'static-command-contract',
      owner: 'ops',
      resultSemantic: 'restore-drill',
      requiresSecret: 'SAVE_SLOT_RESTORE_SCOPE_TOKEN',
      secretMaterialRecorded: true,
      privatePathValuesRecorded: false,
      clientPackaged: false,
      aiReadable: false,
      releaseCandidateGate: 'release:ops:check',
    },
  ],
})
assert.equal(brokenDrillValidation.ok, false, 'validator must reject drill evidence that records secret material')
assert.ok(
  brokenDrillValidation.errors.some((error) => error.includes('secretMaterialRecorded')),
  brokenDrillValidation.errors.join('; '),
)

assert.throws(
  () => opsReleaseChecklistPath('../prod'),
  /invalid ops release checklist profile id/,
)

const releaseSteps = buildReleaseCandidateGateSteps('local-dev')
assert.ok(
  releaseSteps.some((step) => step.name === 'validate ops secret restore recovery checklist'),
  'release candidate gate must validate the ops checklist',
)
assert.ok(
  releaseSteps.some((step) => (
    step.name === 'validate ops secret restore recovery checklist' &&
    step.args.join(' ') === 'run release:ops:check -- --profile local-dev'
  )),
  'release candidate gate must pass the selected profile to release:ops:check',
)

console.log('[ops_release_checklist_contract] all checks passed')
