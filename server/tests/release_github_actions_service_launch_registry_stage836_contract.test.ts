import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const registryPath = 'ops/release-artifacts/local-dev.service-launch-boundary-registry.json'
const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:release-github-actions-service-launch-registry-stage836-contract'],
  'tsx server/tests/release_github_actions_service_launch_registry_stage836_contract.test.ts',
  'package.json must expose the Stage 836 GitHub Actions service-launch registry archive contract',
)

const workflow = readUtf8('.github/workflows/release-candidate-boundary-gate.yml')
for (const token of [
  'serviceLaunchBoundaryRegistry',
  registryPath,
  '- serviceLaunchBoundaryRegistry: `ops/release-artifacts/local-dev.service-launch-boundary-registry.json`',
]) {
  assertIncludes(workflow, token, 'release candidate workflow')
}

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
const checklistMatch = archiveDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(checklistMatch, 'run archive doc must include a JSON checklist block')
const checklist = JSON.parse(checklistMatch[1]) as {
  archivedPaths: string[]
  boundaryEvidencePaths: string[]
}
assert.ok(checklist.archivedPaths.includes(registryPath), 'archivedPaths must include service launch registry')
assert.ok(checklist.boundaryEvidencePaths.includes(registryPath), 'boundaryEvidencePaths must include service launch registry')
assertIncludes(archiveDoc, 'service launch boundary registry', 'run archive doc')

const validator = readUtf8('scripts/validate_release_github_actions_run_archive.ts')
assertIncludes(validator, registryPath, 'run archive validator')
assertIncludes(validator, 'serviceLaunchBoundaryRegistry', 'run archive validator')

const runArchiveContract = readUtf8('server/tests/release_github_actions_run_archive_contract.test.ts')
assertIncludes(runArchiveContract, registryPath, 'run archive contract')
assertIncludes(runArchiveContract, 'serviceLaunchBoundaryRegistry', 'run archive contract')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 836 - GitHub Actions Service Launch Registry Artifact Guard',
  registryPath,
  'does not trigger a hosted GitHub Actions run',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage836 = progress.completedStages.find((stage) => stage.stageId === 836)
assert.ok(stage836, 'Stage 826 progress manifest must record Stage 836')
assert.equal(stage836.status, 'formal-green-static-github-service-launch-registry-artifact')
assert.ok(stage836.evidence.includes(registryPath))
assert.ok(
  progress.mandatoryGuards.includes('github_actions_service_launch_registry_artifact_guard'),
  'Stage 826 progress manifest must require the GitHub Actions service-launch registry artifact guard',
)

console.log('[release_github_actions_service_launch_registry_stage836_contract] all checks passed')
