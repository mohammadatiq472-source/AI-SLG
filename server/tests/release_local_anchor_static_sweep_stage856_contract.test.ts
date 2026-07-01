import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  buildReleaseSoloLocalStaticSuiteSteps,
  shellLineForReleaseSoloLocalStaticSuiteStep,
} from '../../scripts/run_release_solo_local_static_suite'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function readJson(path: string): any {
  return JSON.parse(readUtf8(path))
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const stageId = 856
const guardId = 'local_anchor_static_sweep_guard'
const sweepCommand = 'npm.cmd run release:local-anchor-static-sweep:check -- --profile local-dev'
const sweepScript = 'scripts/validate_release_local_anchor_static_sweep.ts'
const sweepManifestPath = 'ops/release-artifacts/local-dev.local-anchor-static-sweep.json'
const expectedCurrentAnchorStages = [849, 851, 854, 855, 857, 858, 859, 860, 861]
const expectedAnchorIds = [
  'world_ai_switch_open_home_city',
  'world_open_main_city_interior_tax',
  'world_open_main_city_interior_affairs_press_first_action',
  'first_hour_land_loop_task_claim_prompt_gate',
  'world_main_map_claim_release_cell',
  'shell_chat_unified_inbox_claim_reward_settlement',
  'world_tile_expedition_minimal_settlement_fixture',
  'world_naval_harbor_inventory_open_fixture',
  'world_naval_harbor_deployment_readiness_fixture',
]

const packageJson = readJson('package.json')
assert.equal(
  packageJson.scripts?.['release:local-anchor-static-sweep:check'],
  'tsx scripts/validate_release_local_anchor_static_sweep.ts',
  'package.json must expose the Stage 856 local anchor static sweep command',
)
assert.equal(
  packageJson.scripts?.['test:release-local-anchor-static-sweep-stage856-contract'],
  'tsx server/tests/release_local_anchor_static_sweep_stage856_contract.test.ts',
  'package.json must expose the Stage 856 local anchor static sweep contract',
)

assert.ok(existsSync(sweepScript), `missing Stage 856 sweep script: ${sweepScript}`)
const sweepSource = readUtf8(sweepScript)
for (const token of [
  'validateReleaseLocalAnchorStaticSweep',
  'registeredAnchors',
  'retainedEvidence',
  'completedStages',
  'mandatoryGuards',
  'not hosted GitHub Actions evidence',
  'Stage 846 local replay',
]) {
  assertIncludes(sweepSource, token, 'Stage 856 sweep script')
}

assert.ok(existsSync(sweepManifestPath), `missing Stage 856 sweep manifest: ${sweepManifestPath}`)
const sweepManifest = readJson(sweepManifestPath)
assert.equal(sweepManifest.status, 'current Stage 856 local anchor static sweep')
assert.equal(sweepManifest.profileId, 'local-dev')
assert.equal(sweepManifest.sweepCommand, sweepCommand)
assert.equal(sweepManifest.nonStarting, true)
assert.deepEqual(sweepManifest.currentAnchorStages, expectedCurrentAnchorStages)
assert.deepEqual(
  sweepManifest.requiredAnchors.map((anchor: any) => anchor.anchorId),
  expectedAnchorIds,
)
for (const anchor of sweepManifest.requiredAnchors) {
  assert.equal(anchor.requiresRegistry, true, `${anchor.anchorId} must require registry coverage`)
  assert.equal(anchor.requiresStage826, true, `${anchor.anchorId} must require Stage826 coverage`)
  assert.equal(anchor.requiresTmpRetention, true, `${anchor.anchorId} must require tmp retention coverage`)
  assert.equal(anchor.requiresCurrentHandoff, true, `${anchor.anchorId} must require CURRENT handoff coverage`)
  assert.equal(anchor.requiresEvidenceFiles, true, `${anchor.anchorId} must require evidence files`)
}
for (const nonClaim of [
  'does not claim hosted GitHub Actions run evidence',
  'does not treat Stage 846 local replay as hosted evidence',
  'does not start server:dev or tsx watch',
  'does not run Godot export',
  'does not invent staging/prod endpoints',
]) {
  assert.ok(sweepManifest.nonClaims.includes(nonClaim), `Stage 856 manifest missing non-claim: ${nonClaim}`)
}

const suiteSteps = buildReleaseSoloLocalStaticSuiteSteps('local-dev')
const sweepStep = suiteSteps.find((step) => step.gateId === 'local_anchor_static_sweep')
assert.ok(sweepStep, 'Stage 848 solo/local static suite must include the Stage 856 local anchor static sweep')
assert.deepEqual(sweepStep, {
  gateId: 'local_anchor_static_sweep',
  command: 'npm',
  args: ['run', 'release:local-anchor-static-sweep:check', '--', '--profile', 'local-dev'],
  startsService: false,
  requiresHostedEvidence: false,
  requiresStagingProdEndpoint: false,
})
assertIncludes(
  shellLineForReleaseSoloLocalStaticSuiteStep(sweepStep),
  'release:local-anchor-static-sweep:check',
  'Stage 848 suite shell line',
)
const registryIndex = suiteSteps.findIndex((step) => step.gateId === 'local_anchor_static_sweep')
const replayIndex = suiteSteps.findIndex((step) => step.gateId === 'release_github_actions_summary_local_replay')
assert.ok(registryIndex >= 0 && registryIndex < replayIndex, 'local anchor static sweep must run before GitHub local replay summary checks')

const suiteManifest = readJson('ops/release-artifacts/local-dev.solo-local-static-suite.json')
assert.ok(
  suiteManifest.steps.some((step: any) => step.gateId === 'local_anchor_static_sweep' && step.command === sweepCommand),
  'Stage 848 suite manifest must list the Stage 856 command',
)

const mandatoryChecklist = readJson('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
assert.ok(
  mandatoryChecklist.artifacts?.some(
    (artifact: any) => artifact.artifactId === 'local_anchor_static_sweep' && artifact.path === sweepManifestPath,
  ),
  'mandatory artifact checklist must include the Stage 856 local anchor static sweep manifest',
)
const artifactCoverage = readJson('ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json')
assert.ok(
  artifactCoverage.artifacts?.some(
    (artifact: any) =>
      artifact.path === sweepManifestPath &&
      artifact.mandatoryChecklistRequired === true &&
      artifact.githubArchiveRequired === true &&
      artifact.stage826Required === true,
  ),
  'artifact coverage manifest must classify the Stage 856 sweep as mandatory, archived, and Stage826-recorded',
)
const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, sweepManifestPath, 'GitHub Actions archive doc Stage 856 artifact path')
assertIncludes(archiveDoc, 'Stage 856 local anchor static sweep', 'GitHub Actions archive doc Stage 856 meaning')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const [index, stage] of expectedCurrentAnchorStages.entries()) {
  const anchorId = expectedAnchorIds[index]
  const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stage && entry.anchorId === anchorId)
  assert.ok(registered, `Stage ${stage} must be registered as ${anchorId}`)
  assert.equal(registered.anchorClass, 'formal-gameplay-anchor', `Stage ${stage} must be formal-gameplay-anchor`)
  assert.ok(registered.evidenceDirectory?.startsWith(`tmp/stage${stage}`), `Stage ${stage} must use a stage-scoped evidence dir`)
  assert.ok(existsSync(registered.summaryJsonPath), `Stage ${stage} summary evidence missing`)
  assert.ok(existsSync(registered.godotReportJsonPath), `Stage ${stage} Godot report evidence missing`)
  assert.ok(existsSync(registered.screenshotEvidencePath), `Stage ${stage} screenshot evidence missing`)
  assert.ok(
    registered.nonClaims?.includes('not hosted GitHub Actions evidence') ||
      registered.nonClaims?.includes('not an AI direct-control or automation proof'),
    `Stage ${stage} must keep non-hosted/non-automation boundary explicit`,
  )

  const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stage && entry.path === registered.evidenceDirectory)
  assert.ok(retained, `Stage ${stage} evidence must be retained`)
  assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])

  const completed = progress.completedStages?.find((entry: any) => entry.stageId === stage)
  assert.ok(completed, `Stage ${stage} must be recorded in Stage826 completedStages`)
  assert.ok(completed.evidence?.some((entry: string) => entry.includes(registered.evidenceDirectory)), `Stage ${stage} completed evidence must include evidence dir`)
  const gameplayAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stage && entry.anchorId === anchorId)
  assert.ok(gameplayAnchor, `Stage ${stage} must be recorded in Stage826 gameplayAnchors`)
  assertIncludes(currentHandoff, `Stage ${stage}`, `CURRENT handoff Stage ${stage}`)
  assertIncludes(currentHandoff, registered.evidenceDirectory, `CURRENT handoff Stage ${stage} evidence dir`)
}

const stage856 = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(stage856, 'Stage826 progress must record Stage 856')
assert.equal(stage856.status, 'formal-green-static-local-anchor-sweep')
assert.ok(stage856.evidence.includes(sweepManifestPath))
assert.ok(stage856.evidence.includes(sweepScript))
assert.ok(stage856.evidence.includes('server/tests/release_local_anchor_static_sweep_stage856_contract.test.ts'))
assert.ok(progress.mandatoryGuards?.includes(guardId), 'Stage826 must require the Stage 856 guard')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(current, 'Stage 856 - Local Anchor Static Sweep Guard', 'CURRENT handoff')
assertIncludes(current, sweepCommand, 'CURRENT handoff Stage 856 command')
assertIncludes(current, 'does not claim hosted GitHub Actions run evidence', 'CURRENT handoff Stage 856 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 856 adds the local anchor static sweep', 'split target Stage 856')
assertIncludes(splitTarget, guardId, 'split target Stage 856 guard')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 856 adds `local_anchor_static_sweep_guard`', 'convergence Stage 856')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, sweepManifestPath, 'Stage856 plan')
assertIncludes(plan, sweepCommand, 'Stage856 plan command')

console.log('[release_local_anchor_static_sweep_stage856_contract] all checks passed')
