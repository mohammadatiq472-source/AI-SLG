import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const requiredPasteBlockFields = [
  'stage',
  'runUrl',
  'runId',
  'runAttempt',
  'jobStatus',
  'artifactName',
  'summaryJsonPath',
  'boundaryEvidence',
  'failureReasonClassifier',
  'likelyFailureCategory',
  'nextActionHint',
]

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-github-actions-current-handoff-block-stage833-contract'],
  'tsx server/tests/release_github_actions_current_handoff_block_stage833_contract.test.ts',
  'package.json must expose the Stage 833 CURRENT handoff paste block contract',
)

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
for (const token of [
  '$currentHandoffPasteBlock = [ordered]@{',
  'currentHandoffPasteBlock = $currentHandoffPasteBlock',
  '#### CURRENT handoff paste block',
  'tmp/release_candidate_github_actions_run_summary.json.currentHandoffPasteBlock',
]) {
  assertIncludes(workflow, token, 'release candidate workflow')
}

for (const field of requiredPasteBlockFields) {
  assertIncludes(workflow, `${field} =`, 'release candidate workflow paste block')
}

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
const checklistMatch = archiveDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(checklistMatch, 'run archive doc must include a JSON checklist block')
const checklist = JSON.parse(checklistMatch[1]) as {
  currentHandoffPasteBlock?: {
    summaryJsonField: string
    targetPath: string
    requiredFields: string[]
  }
}

assert.deepEqual(checklist.currentHandoffPasteBlock, {
  summaryJsonField: 'currentHandoffPasteBlock',
  targetPath: 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
  requiredFields: requiredPasteBlockFields,
})
assertIncludes(archiveDoc, 'currentHandoffPasteBlock', 'run archive doc')
assertIncludes(archiveDoc, 'CURRENT handoff paste block', 'run archive doc')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 833 - GitHub Actions CURRENT Handoff Paste Block Guard',
  'currentHandoffPasteBlock',
  'does not trigger a hosted GitHub Actions run',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 833', 'split target')
assertIncludes(splitTarget, 'currentHandoffPasteBlock', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 833', 'mega plan')
assertIncludes(megaPlan, 'currentHandoffPasteBlock', 'mega plan')

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage833 = progress.completedStages.find((stage) => stage.stageId === 833)
assert.ok(stage833, 'Stage 826 progress manifest must record Stage 833')
assert.equal(stage833.status, 'formal-green-static-current-handoff-paste-block')
assert.ok(stage833.evidence.includes('server/tests/release_github_actions_current_handoff_block_stage833_contract.test.ts'))
assert.ok(
  progress.mandatoryGuards.includes('github_actions_current_handoff_paste_block_guard'),
  'Stage 826 progress manifest must require the CURRENT handoff paste block guard',
)

console.log('[release_github_actions_current_handoff_block_stage833_contract] all checks passed')
