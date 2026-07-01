import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-github-actions-antifreeze-summary-stage837-contract'],
  'tsx server/tests/release_github_actions_antifreeze_summary_stage837_contract.test.ts',
  'package.json must expose the Stage 837 GitHub Actions anti-freeze summary contract',
)

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
for (const token of [
  '#### Anti-freeze release preflight',
  '- serviceProcessGuard: `npm.cmd run ops:service-process-guard`',
  '- serviceLaunchBoundaryRegistry: `ops/release-artifacts/local-dev.service-launch-boundary-registry.json`',
  '- releaseDryRunStep1: `validate service launch boundary registry`',
  '- releaseDryRunStep2: `validate direct backend spawn guard index`',
  '- releaseDryRunStep3: `validate solo-local release gate matrix`',
  '- releaseDryRunStep4: `validate release boundary mandatory artifacts`',
  '- releaseDryRunStep5: `run Godot release export wrapper`',
  '- duplicateLaunchAllowed: `false`',
  '- hostedSummaryNonClaim: `summary-only; does not start server:dev, tsx watch, Godot runtime, or smoke backend`',
]) {
  assertIncludes(workflow, token, 'release candidate workflow summary')
}

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
for (const token of [
  'Anti-freeze release preflight',
  'releaseDryRunStep1',
  'releaseDryRunStep2',
  'releaseDryRunStep3',
  'releaseDryRunStep4',
  'releaseDryRunStep5',
  'validate direct backend spawn guard index',
  'validate solo-local release gate matrix',
  'validate service launch boundary registry',
  'summary-only; does not start server:dev, tsx watch, Godot runtime, or smoke backend',
]) {
  assertIncludes(archiveDoc, token, 'run archive doc')
}

const validator = readUtf8('scripts/validate_release_github_actions_run_archive.ts')
for (const token of [
  'anti-freeze release preflight summary',
  '#### Anti-freeze release preflight',
  'releaseDryRunStep1',
  'releaseDryRunStep2',
  'releaseDryRunStep3',
  'releaseDryRunStep4',
  'releaseDryRunStep5',
  'duplicateLaunchAllowed',
]) {
  assertIncludes(validator, token, 'run archive validator')
}

const runArchiveContract = readUtf8('server/tests/release_github_actions_run_archive_contract.test.ts')
assertIncludes(runArchiveContract, '#### Anti-freeze release preflight', 'run archive contract')
assertIncludes(runArchiveContract, 'releaseDryRunStep1', 'run archive contract')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 837 - GitHub Actions Anti-freeze Summary Guard',
  'releaseDryRunStep1',
  'does not trigger a hosted GitHub Actions run',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage837 = progress.completedStages.find((stage) => stage.stageId === 837)
assert.ok(stage837, 'Stage 826 progress manifest must record Stage 837')
assert.equal(stage837.status, 'formal-green-static-github-antifreeze-summary')
assert.ok(stage837.evidence.includes('server/tests/release_github_actions_antifreeze_summary_stage837_contract.test.ts'))
assert.ok(
  progress.mandatoryGuards.includes('github_actions_antifreeze_summary_guard'),
  'Stage 826 progress manifest must require the GitHub Actions anti-freeze summary guard',
)

console.log('[release_github_actions_antifreeze_summary_stage837_contract] all checks passed')
