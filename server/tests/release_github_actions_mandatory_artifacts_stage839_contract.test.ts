import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const checklistPath = 'ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json'
const stage839Guard = 'github_actions_mandatory_artifacts_archive_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-github-actions-mandatory-artifacts-stage839-contract'],
  'tsx server/tests/release_github_actions_mandatory_artifacts_stage839_contract.test.ts',
  'package.json must expose the Stage 839 GitHub Actions mandatory artifacts archive contract',
)

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
for (const token of [
  'releaseBoundaryMandatoryArtifacts',
  checklistPath,
  '- releaseBoundaryMandatoryArtifacts: `ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json`',
]) {
  assertIncludes(workflow, token, 'release candidate workflow')
}

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
const checklistMatch = archiveDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(checklistMatch, 'run archive doc must include a JSON checklist block')
const archiveChecklist = JSON.parse(checklistMatch[1]) as {
  archivedPaths: string[]
  boundaryEvidencePaths: string[]
}
assert.ok(archiveChecklist.archivedPaths.includes(checklistPath), 'archivedPaths must include mandatory artifact checklist')
assert.ok(
  archiveChecklist.boundaryEvidencePaths.includes(checklistPath),
  'boundaryEvidencePaths must include mandatory artifact checklist',
)
assertIncludes(archiveDoc, 'release boundary mandatory artifact checklist', 'run archive doc')

const validator = readUtf8('scripts/validate_release_github_actions_run_archive.ts')
assertIncludes(validator, checklistPath, 'run archive validator')
assertIncludes(validator, 'releaseBoundaryMandatoryArtifacts', 'run archive validator')

const runArchiveContract = readUtf8('server/tests/release_github_actions_run_archive_contract.test.ts')
assertIncludes(runArchiveContract, checklistPath, 'run archive contract')
assertIncludes(runArchiveContract, 'releaseBoundaryMandatoryArtifacts', 'run archive contract')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 839 - GitHub Actions Mandatory Artifact Checklist Archive Guard',
  checklistPath,
  'does not trigger a hosted GitHub Actions run',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages?: Array<{
    stageId?: number
    status?: string
    evidence?: string[]
  }>
  mandatoryGuards?: string[]
}
const stage839 = progress.completedStages?.find((stage) => stage.stageId === 839)
assert.ok(stage839, 'Stage 826 progress manifest must record Stage 839')
assert.equal(stage839.status, 'formal-green-static-github-mandatory-artifacts-archive')
assert.ok(stage839.evidence?.includes(checklistPath), 'Stage 839 evidence must include mandatory artifact checklist')
assert.ok(
  progress.mandatoryGuards?.includes(stage839Guard),
  'Stage 826 progress manifest must require the Stage 839 GitHub Actions mandatory artifacts archive guard',
)

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 839', 'split target')
assertIncludes(splitTarget, 'releaseBoundaryMandatoryArtifacts', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 839', 'mega plan')
assertIncludes(megaPlan, stage839Guard, 'mega plan')
