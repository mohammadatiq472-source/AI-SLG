import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function readJson(path: string): any {
  return JSON.parse(readUtf8(path))
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const stageId = 855
const anchorId = 'first_hour_land_loop_task_claim_prompt_gate'
const evidenceDirectory = 'tmp/stage855_first_hour_task_claim_prompt_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --window-width 1920 --window-height 1080 --click-action first_hour_land_loop_task_claim_prompt_gate --isolated-backend-state --seed-first-hour-task-claim-prompt-fixture --timeout-sec 320 --backend-timeout-sec 200 --evidence-dir tmp/stage855_first_hour_task_claim_prompt_gameplay_anchor'
const guardScript = 'test:godot:first-hour-task-claim-prompt-stage855-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_first_hour_task_claim_prompt_stage855_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_FIRST_HOUR_TASK_CLAIM_PROMPT_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 855 first-hour gameplay anchor guard')

assert.ok(existsSync(anchorDocPath), `missing Stage 855 first-hour gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Stage 855', 'anchor doc stage marker')
assertIncludes(anchorDoc, anchorId, 'anchor doc anchor id')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'current formal evidence refresh', 'anchor doc current-evidence boundary')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 855 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-first-hour-task-claim')
assert.equal(registered.clientInputOrClickAction, anchorId)
assert.equal(registered.formalSmokeCommand, formalSmokeCommand)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_${anchorId}.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assert.ok(
  registered.serverReceiptOrReadModel.includes('claimTaskReward') &&
    registered.serverReceiptOrReadModel.includes('/api/world/tasks') &&
    registered.serverReceiptOrReadModel.includes('current goals'),
  'Stage 855 registry entry must name claimTaskReward, world tasks readback, and current goals readback',
)
assert.ok(
  registered.nonClaims.includes('not hosted GitHub Actions evidence') &&
    registered.nonClaims.includes('not a Stage 208 historical replay claim') &&
    registered.nonClaims.includes('not staging or production endpoint evidence'),
  'Stage 855 registry entry must keep hosted/staging/history non-claims explicit',
)

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 855 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 855')
assert.equal(completedStage.status, 'formal-green-first-hour-task-claim-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(completedStage.evidence.includes('server/tests/godot_first_hour_task_claim_prompt_stage855_gameplay_anchor_contract.test.ts'))
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 855')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('first_hour_task_claim_prompt_stage855_gameplay_anchor_guard'))

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 855 - First-Hour Task Claim Prompt Gameplay Anchor', 'CURRENT handoff')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 855 formal command')
assertIncludes(currentHandoff, 'firstHourTaskClaimPromptOk=true', 'CURRENT handoff Stage 855 acceptance fields')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 855 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 855 refreshes the first-hour task claim prompt as a current local gameplay anchor', 'split target Stage 855 line')
assertIncludes(splitTarget, anchorId, 'split target Stage 855 anchor id')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 855 refreshes `first_hour_land_loop_task_claim_prompt_gate`', 'convergence doc Stage 855 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, 'Stage855 - First-Hour Land / Task Claim Anchor Refresh', 'plan Stage 855 section')
assertIncludes(plan, evidenceDirectory, 'plan Stage 855 current evidence directory')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, '_validate_first_hour_task_claim_prompt_contract', 'visual smoke runner Stage 855 validator')
assertIncludes(visualSmokeRunner, '--seed-first-hour-task-claim-prompt-fixture', 'visual smoke runner Stage 855 seed flag')
assertIncludes(visualSmokeRunner, 'taskClaimRewardResourcesAppliedOk', 'visual smoke runner Stage 855 reward readback field')
assertIncludes(visualSmokeRunner, 'currentGoalsReadModelOnly', 'visual smoke runner Stage 855 current-goals readback field')

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, 'firstHourTaskClaimPromptOk', 'Godot Stage 855 summary')
assertIncludes(godotMain, 'taskClaimRewardResourcesAppliedOk', 'Godot Stage 855 reward readback')
assertIncludes(godotMain, 'currentGoalsReadModelOnly', 'Godot Stage 855 current-goals boundary')

console.log('[godot_first_hour_task_claim_prompt_stage855_gameplay_anchor_contract] all checks passed')
