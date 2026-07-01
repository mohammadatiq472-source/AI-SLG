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
  packageJson.scripts?.['test:release-github-actions-failure-classifier-stage832-contract'],
  'tsx server/tests/release_github_actions_failure_classifier_stage832_contract.test.ts',
  'package.json must expose the Stage 832 GitHub Actions failure classifier contract',
)

const workflowPath = '.github/workflows/release-candidate-boundary-gate.yml'
const archiveDocPath = 'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'

for (const path of [workflowPath, archiveDocPath, stage826Path, currentPath, splitTargetPath, megaPlanPath]) {
  assert.ok(existsSync(path), `missing required Stage 832 source: ${path}`)
}

const requiredCategories = [
  'runnerProvisioning',
  'godotProvisioning',
  'godotExport',
  'gameplayAnchorRegistry',
  'releaseArtifactDrift',
  'opsRecovery',
  'artifactUpload',
  'unknown',
]

const workflow = readUtf8(workflowPath)
for (const token of [
  'failureReasonClassifier = [ordered]@{',
  'likelyFailureCategory',
  'nextActionHint',
  'failureReasonClassifier = $failureReasonClassifier',
  '#### Failure classifier',
]) {
  assertIncludes(workflow, token, 'GitHub Actions workflow')
}
for (const category of requiredCategories) {
  assertIncludes(workflow, category, 'GitHub Actions workflow failure classifier')
}

const archiveDoc = readUtf8(archiveDocPath)
const checklist = extractJsonBlock(archiveDoc, archiveDocPath) as {
  failureReasonClassifier: {
    summaryJsonField: string
    requiredCategories: Array<{ id: string; nextActionHint: string }>
  }
  failureSummary: { requiredFields: string[] }
  currentHandoff: { requiredHostedRunFields: string[] }
}

assert.equal(checklist.failureReasonClassifier.summaryJsonField, 'failureReasonClassifier')
assert.deepEqual(
  checklist.failureReasonClassifier.requiredCategories.map((item) => item.id),
  requiredCategories,
)
for (const category of checklist.failureReasonClassifier.requiredCategories) {
  assert.notEqual(category.nextActionHint, '', `${category.id} must include a nextActionHint`)
}
for (const field of ['failureReasonClassifier', 'likelyFailureCategory', 'nextActionHint']) {
  assert.ok(checklist.failureSummary.requiredFields.includes(field), `failure summary must include ${field}`)
  assert.ok(checklist.currentHandoff.requiredHostedRunFields.includes(field), `CURRENT handoff fields must include ${field}`)
}

const stage826 = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards?: string[]
}
const stage832 = stage826.completedStages?.find((item) => item.stageId === 832)
assert.ok(stage832, 'Stage 826 convergence manifest must record Stage 832')
assert.equal(stage832.status, 'formal-green-static-github-failure-classifier')
assert.ok(stage832.evidence.includes(workflowPath), 'Stage 832 evidence must include the GitHub workflow')
assert.ok(stage832.evidence.includes(archiveDocPath), 'Stage 832 evidence must include the hosted-run archive doc')
assert.ok(
  stage832.evidence.includes('server/tests/release_github_actions_failure_classifier_stage832_contract.test.ts'),
  'Stage 832 evidence must include the Stage 832 contract',
)
assert.ok(
  stage826.mandatoryGuards?.includes('github_actions_failure_classifier_guard'),
  'Stage 826 must list github_actions_failure_classifier_guard',
)

const current = readUtf8(currentPath)
for (const token of [
  'Stage 832 - GitHub Actions Failure Classifier Guard',
  'failureReasonClassifier',
  'does not trigger a hosted GitHub Actions run',
]) {
  assertIncludes(current, token, 'CURRENT Stage 832')
}

const splitTarget = readUtf8(splitTargetPath)
assertIncludes(splitTarget, 'Stage 832', 'split target')
assertIncludes(splitTarget, 'failureReasonClassifier', 'split target')

const megaPlan = readUtf8(megaPlanPath)
assertIncludes(megaPlan, 'Stage 832', 'mega plan')
assertIncludes(megaPlan, 'GitHub Actions failure classifier guard', 'mega plan')

console.log('[release_github_actions_failure_classifier_stage832_contract] all checks passed')
