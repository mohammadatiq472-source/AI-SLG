import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import {
  buildReleaseCiRunnerProvisioningChecks,
  parseReleaseCiRunnerProvisioningArgs,
  releaseCiRunnerProvisioningChecklistPath,
  validateReleaseCiRunnerProvisioning,
} from '../../scripts/validate_release_ci_runner_provisioning'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:ci-runner:provisioning-check'],
  'tsx scripts/validate_release_ci_runner_provisioning.ts',
  'package.json must expose the formal CI runner provisioning gate',
)
assert.equal(
  packageJson.scripts?.['test:release-ci-runner-provisioning-contract'],
  'tsx server/tests/release_candidate_ci_runner_provisioning_contract.test.ts',
  'package.json must expose the CI runner provisioning contract test',
)

assert.deepEqual(parseReleaseCiRunnerProvisioningArgs([]), { profileId: 'local-dev' })
assert.deepEqual(parseReleaseCiRunnerProvisioningArgs(['--profile', 'local-dev']), { profileId: 'local-dev' })
assert.deepEqual(parseReleaseCiRunnerProvisioningArgs(['--profile=local-dev']), { profileId: 'local-dev' })
assert.throws(
  () => parseReleaseCiRunnerProvisioningArgs(['--profile', '../prod']),
  /invalid release CI runner provisioning profile id/,
  'profile ids must reject path traversal',
)

const checklistPath = releaseCiRunnerProvisioningChecklistPath('local-dev')
assert.equal(
  checklistPath,
  'docs/RELEASE_CANDIDATE_CI_RUNNER_PROVISIONING_CHECKLIST_CURRENT_2026_06_16.md',
)
assert.ok(existsSync(checklistPath), `missing CI runner provisioning checklist: ${checklistPath}`)

const checklistDoc = readFileSync(checklistPath, 'utf8')
assert.ok(
  checklistDoc.includes('Status: current release candidate CI runner provisioning checklist'),
  'checklist must identify itself as the current CI runner provisioning checklist',
)

const checklistMatch = checklistDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(checklistMatch, 'checklist must contain a machine-readable JSON block')
const checklist = JSON.parse(checklistMatch[1]) as {
  status: string
  workflow: string
  ciCommand: string
  runner: {
    os: string
    nodeVersion: string
    timeoutMinutes: number
    diskBudgetGb: number
  }
  godot: {
    version: string
    downloadAsset: string
    exportTemplatesAsset: string
    binaryEnv: string
    fallbackBinaryEnv: string
    templateVersion: string
  }
  exportPreset: {
    name: string
    presetFile: string
    artifactPath: string
  }
  artifactUpload: {
    action: string
    name: string
    retentionDays: number
    ifNoFilesFound: string
    paths: string[]
  }
  logRetention: {
    summary: string
    paths: string[]
  }
}

assert.equal(checklist.status, 'current release candidate CI runner provisioning checklist')
assert.equal(checklist.workflow, '.github/workflows/release-candidate-boundary-gate.yml')
assert.equal(checklist.ciCommand, 'npm run ci:release-candidate:local-dev')
assert.deepEqual(checklist.runner, {
  os: 'windows-latest',
  nodeVersion: '22',
  timeoutMinutes: 60,
  diskBudgetGb: 20,
})
assert.deepEqual(checklist.godot, {
  version: '4.6.2',
  downloadAsset: 'Godot_v4.6.2-stable_win64.exe.zip',
  exportTemplatesAsset: 'Godot_v4.6.2-stable_export_templates.tpz',
  binaryEnv: 'GODOT_CONSOLE_EXE',
  fallbackBinaryEnv: 'GODOT_EXE',
  templateVersion: '4.6.2.stable',
})
assert.deepEqual(checklist.exportPreset, {
  name: 'Windows Desktop',
  presetFile: 'godot-client/export_presets.cfg',
  artifactPath: 'exports/windows/SLG Commander.exe',
})
assert.equal(checklist.artifactUpload.action, 'actions/upload-artifact@v4')
assert.equal(checklist.artifactUpload.name, 'release-candidate-local-dev')
assert.equal(checklist.artifactUpload.retentionDays, 14)
assert.equal(checklist.artifactUpload.ifNoFilesFound, 'warn')

for (const requiredArtifactPath of [
  'exports/windows/SLG Commander.exe',
  'ops/release-artifacts/generated/*.json',
  'ops/release-artifacts/local-dev.ops-release-checklist.json',
  'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  'ops/release-artifacts/local-dev.boundary-change-registration.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
  'tmp/godot_release_export_stdout.log',
  'tmp/godot_release_export_stderr.log',
]) {
  assert.ok(
    checklist.artifactUpload.paths.includes(requiredArtifactPath),
    `missing upload artifact path: ${requiredArtifactPath}`,
  )
}

for (const requiredLogPath of [
  'tmp/godot_release_export_stdout.log',
  'tmp/godot_release_export_stderr.log',
]) {
  assert.ok(checklist.logRetention.paths.includes(requiredLogPath), `missing log retention path: ${requiredLogPath}`)
}

const workflow = readFileSync('.github/workflows/release-candidate-boundary-gate.yml', 'utf8')
for (const requiredWorkflowToken of [
  'GODOT_VERSION: \'4.6.2\'',
  'Godot_v4.6.2-stable_win64.exe.zip',
  'Godot_v4.6.2-stable_export_templates.tpz',
  'GODOT_CONSOLE_EXE',
  'GODOT_EXE',
  'RELEASE_CANDIDATE_DISK_BUDGET_GB: \'20\'',
  'timeout-minutes: 60',
  'npm run release:ci-runner:provisioning-check',
  'npm run ci:release-candidate:local-dev',
  'actions/upload-artifact@v4',
  'retention-days: 14',
  'exports/windows/SLG Commander.exe',
  'ops/release-artifacts/generated/*.json',
  'ops/release-artifacts/local-dev.ops-release-checklist.json',
  'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  'ops/release-artifacts/local-dev.boundary-change-registration.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
  'tmp/godot_release_export_stdout.log',
  'tmp/godot_release_export_stderr.log',
  'GITHUB_STEP_SUMMARY',
]) {
  assert.ok(workflow.includes(requiredWorkflowToken), `workflow must include provisioning token: ${requiredWorkflowToken}`)
}

const checks = buildReleaseCiRunnerProvisioningChecks({ profileId: 'local-dev' })
assert.deepEqual(
  checks.map((check) => [check.label, check.status]),
  [
    ['CI runner checklist', 'present'],
    ['workflow runner budget', 'declared'],
    ['Godot engine provisioning', 'declared'],
    ['Godot export templates provisioning', 'declared'],
    ['export preset and artifact path', 'declared'],
    ['formal CI release candidate command', 'declared'],
    ['release artifact upload', 'declared'],
    ['log retention and step summary', 'declared'],
  ],
)
assert.equal(checks.every((check) => check.ok), true)

const result = validateReleaseCiRunnerProvisioning({ profileId: 'local-dev' })
assert.equal(result.profileId, 'local-dev')
assert.equal(result.ok, true, result.errors.join('; '))

console.log('[release_candidate_ci_runner_provisioning_contract] all checks passed')
