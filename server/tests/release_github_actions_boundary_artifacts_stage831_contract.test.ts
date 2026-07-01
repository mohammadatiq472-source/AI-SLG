import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function extractJsonBlock(source: string, label: string): any {
  const match = source.match(/```json\s*\n([\s\S]*?)\n```/)
  assert.ok(match, `${label} must contain a JSON block`)
  return JSON.parse(match[1])
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-github-actions-boundary-artifacts-stage831-contract'],
  'tsx server/tests/release_github_actions_boundary_artifacts_stage831_contract.test.ts',
  'package.json must expose the Stage 831 GitHub Actions boundary artifact contract',
)

const workflowPath = '.github/workflows/release-candidate-boundary-gate.yml'
const archiveDocPath = 'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md'
const provisioningDocPath = 'docs/RELEASE_CANDIDATE_CI_RUNNER_PROVISIONING_CHECKLIST_CURRENT_2026_06_16.md'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'

const boundaryEvidencePaths = [
  'ops/release-artifacts/local-dev.boundary-convergence-progress.json',
  'ops/release-artifacts/local-dev.boundary-change-registration.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-evidence-template.json',
  'ops/release-artifacts/local-dev.gameplay-anchor-registry.json',
  'ops/release-artifacts/local-dev.tmp-evidence-retention.json',
]

for (const path of [workflowPath, archiveDocPath, provisioningDocPath, stage826Path]) {
  assert.ok(existsSync(path), `missing required Stage 831 source: ${path}`)
}
for (const path of boundaryEvidencePaths) {
  assert.ok(existsSync(path), `missing boundary evidence path: ${path}`)
}

const workflow = readUtf8(workflowPath)
for (const path of boundaryEvidencePaths) {
  assertIncludes(workflow, path, 'GitHub Actions workflow')
}
for (const token of [
  'boundaryEvidence = [ordered]@{',
  'boundaryConvergenceProgress',
  'boundaryChangeRegistration',
  'gameplayAnchorEvidenceTemplate',
  'gameplayAnchorRegistry',
  'tmpEvidenceRetention',
  '#### Boundary evidence',
]) {
  assertIncludes(workflow, token, 'GitHub Actions workflow')
}

const archiveDoc = readUtf8(archiveDocPath)
const archiveChecklist = extractJsonBlock(archiveDoc, archiveDocPath) as {
  archivedPaths: string[]
  boundaryEvidencePaths: string[]
  failureSummary: { requiredFields: string[] }
  currentHandoff: { requiredHostedRunFields: string[] }
}
assert.deepEqual(archiveChecklist.boundaryEvidencePaths, boundaryEvidencePaths)
for (const path of boundaryEvidencePaths) {
  assert.ok(archiveChecklist.archivedPaths.includes(path), `run archive must upload ${path}`)
}
for (const requiredField of ['boundaryEvidence', 'gameplayAnchorRegistry', 'boundaryConvergenceProgress']) {
  assert.ok(
    archiveChecklist.failureSummary.requiredFields.includes(requiredField),
    `failure summary must include ${requiredField}`,
  )
  assert.ok(
    archiveChecklist.currentHandoff.requiredHostedRunFields.includes(requiredField),
    `CURRENT hosted-run fields must include ${requiredField}`,
  )
}

const provisioningDoc = readUtf8(provisioningDocPath)
const provisioningChecklist = extractJsonBlock(provisioningDoc, provisioningDocPath) as {
  artifactUpload: { paths: string[] }
}
for (const path of boundaryEvidencePaths) {
  assert.ok(provisioningChecklist.artifactUpload.paths.includes(path), `CI provisioning upload paths must include ${path}`)
}

const stage826 = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards?: string[]
}
const stage831 = stage826.completedStages?.find((item) => item.stageId === 831)
assert.ok(stage831, 'Stage 826 convergence manifest must record Stage 831')
assert.equal(stage831.status, 'formal-green-static-github-artifact-boundary')
assert.ok(stage831.evidence.includes(workflowPath), 'Stage 831 evidence must include the GitHub workflow')
assert.ok(stage831.evidence.includes(archiveDocPath), 'Stage 831 evidence must include the hosted-run archive doc')
assert.ok(stage831.evidence.includes(provisioningDocPath), 'Stage 831 evidence must include the provisioning checklist')
assert.ok(
  stage826.mandatoryGuards?.includes('github_actions_boundary_artifact_archive_guard'),
  'Stage 826 must list github_actions_boundary_artifact_archive_guard',
)

const current = readUtf8(currentPath)
for (const token of [
  'Stage 831 - GitHub Actions Boundary Artifact Archive Guard',
  'boundaryEvidence',
  'does not trigger a hosted GitHub Actions run',
]) {
  assertIncludes(current, token, 'CURRENT Stage 831')
}

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 831', 'split target')
assertIncludes(splitTarget, 'boundaryEvidence', 'split target')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 831', 'mega plan')
assertIncludes(megaPlan, 'GitHub Actions boundary artifact archive guard', 'mega plan')

console.log('[release_github_actions_boundary_artifacts_stage831_contract] all checks passed')
