import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:physical-split-readiness-contract'],
  'tsx server/tests/physical_split_readiness_contract.test.ts',
  'package.json must expose the physical split readiness contract',
)

const checklistPath = 'docs/PHYSICAL_SPLIT_READINESS_CHECKLIST_CURRENT_2026_06_16.md'
assert.ok(existsSync(checklistPath), `missing physical split readiness checklist: ${checklistPath}`)

const checklist = readFileSync(checklistPath, 'utf8')
assert.ok(
  checklist.includes('Status: current physical split readiness decision'),
  'checklist must identify itself as the current physical split readiness decision',
)

const decisionMatch = checklist.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(decisionMatch, 'checklist must contain a machine-readable JSON decision block')
const decision = JSON.parse(decisionMatch[1]) as {
  decision: string
  physicalMoveAllowed: boolean
  localDevReleaseLane: string
  blockedPrerequisites: string[]
  requiredStages: Record<string, string>
  directoryMap: Array<{
    currentPath: string
    futurePackage: string
    owner: string
    moveAllowedNow: boolean
  }>
  migrationOrder: string[]
  requiredEvidence: string[]
}

assert.equal(decision.decision, 'not_ready')
assert.equal(decision.physicalMoveAllowed, false)
assert.equal(decision.localDevReleaseLane, 'green')
assert.ok(
  decision.blockedPrerequisites.includes('real staging/prod public endpoints are not supplied'),
  'Stage 803 endpoint prerequisite must block physical split readiness',
)
assert.deepEqual(decision.requiredStages, {
  '798': 'green',
  '799': 'green',
  '800': 'green',
  '801': 'green',
  '802': 'green',
  '803': 'blocked_missing_real_staging_prod_endpoints',
  '804': 'decision_not_ready',
  '805': 'green',
  '806': 'green',
  '807': 'green_contract_hosted_run_pending',
})
assert.deepEqual(decision.migrationOrder, [
  'contracts first',
  'generated release artifacts second',
  'release candidate command third',
  'artifact drift and CI gate fourth',
  'CI runner provisioning fifth',
  'hosted CI run archive sixth',
  'directory movement last',
])

for (const requiredEvidence of [
  'ops/release-artifacts/generated/local-dev.server-release-artifact.json',
  'ops/release-artifacts/generated/local-dev.client-package-manifest.json',
  'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json',
  'ops/release-artifacts/local-dev.ops-release-checklist.json',
  'npm.cmd run release:candidate:local-dev',
  'npm.cmd run release:artifact-drift:check -- --profile local-dev',
  'npm.cmd run ci:release-candidate:local-dev',
  'npm.cmd run release:ci-runner:provisioning-check -- --profile local-dev',
  'docs/RELEASE_CANDIDATE_CI_RUNNER_PROVISIONING_CHECKLIST_CURRENT_2026_06_16.md',
  'npm.cmd run release:github-actions-run-archive:check -- --profile local-dev',
  'docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md',
  'hosted GitHub Actions run URL recorded in CURRENT',
]) {
  assert.ok(
    decision.requiredEvidence.includes(requiredEvidence),
    `missing required split readiness evidence: ${requiredEvidence}`,
  )
}

for (const requiredMapping of [
  ['godot-client', 'client-godot', 'client-owned'],
  ['server', 'server-authoritative', 'server-owned'],
  ['shared/contracts', 'shared-contracts', 'shared-contract'],
  ['ops/release-artifacts', 'ops', 'ops'],
  ['docs', 'docs-governance', 'historical-reference'],
]) {
  const [currentPath, futurePackage, owner] = requiredMapping
  const mapping = decision.directoryMap.find((item) => item.currentPath === currentPath)
  assert.ok(mapping, `missing directory mapping for ${currentPath}`)
  assert.equal(mapping.futurePackage, futurePackage)
  assert.equal(mapping.owner, owner)
  assert.equal(mapping.moveAllowedNow, false, `${currentPath} must not be physically moved yet`)
}

for (const phrase of [
  'Do not move source directories as part of Stage 804.',
  'Stage 803 is blocked until real staging/prod endpoints exist.',
  'Physical movement is last, after contracts, generated artifacts, release candidate gates, artifact drift, CI/pre-release gates, CI runner provisioning, and hosted CI run archive evidence.',
]) {
  assert.ok(checklist.includes(phrase), `checklist must include: ${phrase}`)
}

for (const evidencePath of [
  'ops/release-artifacts/generated/local-dev.server-release-artifact.json',
  'ops/release-artifacts/generated/local-dev.client-package-manifest.json',
  'ops/release-artifacts/generated/local-dev.ai-subject-boundary.json',
  'ops/release-artifacts/local-dev.ops-release-checklist.json',
]) {
  assert.ok(existsSync(evidencePath), `readiness evidence file must exist: ${evidencePath}`)
}

console.log('[physical_split_readiness_contract] all checks passed')
