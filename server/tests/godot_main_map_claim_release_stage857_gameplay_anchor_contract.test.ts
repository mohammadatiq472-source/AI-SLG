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

const stageId = 857
const anchorId = 'world_main_map_claim_release_cell'
const evidenceDirectory = 'tmp/stage857_main_map_claim_release_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --server-script start --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --click-action world_main_map_claim_release_cell --evidence-dir tmp/stage857_main_map_claim_release_gameplay_anchor --window-width 1920 --window-height 1080'
const guardScript = 'test:godot:main-map-claim-release-stage857-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_main_map_claim_release_stage857_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_MAIN_MAP_CLAIM_RELEASE_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 857 gameplay anchor contract')

assert.ok(existsSync(anchorDocPath), `missing Stage 857 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot main-map claim/release gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')
assertIncludes(anchorDoc, 'not Stage 52 historical owner-delta evidence', 'anchor doc historical non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 857 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-main-map-claim-release')
assert.equal(registered.clientInputOrClickAction, anchorId)
assert.equal(registered.formalSmokeCommand, formalSmokeCommand)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_${anchorId}.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assert.ok(
  registered.serverReceiptOrReadModel.includes('claimMainMapCell') &&
    registered.serverReceiptOrReadModel.includes('releaseMainMapCell') &&
    registered.serverReceiptOrReadModel.includes('cell_override_layer'),
  'Stage 857 registry entry must name claim/release receipts and map-layout readback',
)
for (const nonClaim of [
  'not hosted GitHub Actions evidence',
  'not Stage 52 historical owner-delta evidence',
  'not staging or production endpoint evidence',
  'not a physical source split claim',
]) {
  assert.ok(registered.nonClaims.includes(nonClaim), `Stage 857 registry entry must include non-claim: ${nonClaim}`)
}

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 857 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 857')
assert.equal(completedStage.status, 'formal-green-main-map-claim-release-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(completedStage.evidence.includes('server/tests/godot_main_map_claim_release_stage857_gameplay_anchor_contract.test.ts'))
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 857')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('main_map_claim_release_stage857_gameplay_anchor_guard'))

const sweepManifest = readJson('ops/release-artifacts/local-dev.local-anchor-static-sweep.json')
assert.ok(sweepManifest.currentAnchorStages.includes(stageId), 'Stage856 sweep must include Stage 857')
assert.ok(
  sweepManifest.requiredAnchors?.some((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId),
  'Stage856 sweep required anchors must include Stage 857',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 857 - main-map claim/release gameplay anchor', 'CURRENT handoff Stage 857 title')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 857 formal command')
assertIncludes(currentHandoff, 'main_map_claim_release_verified', 'CURRENT handoff Stage 857 acceptance reason')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 857 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 857 promotes `world_main_map_claim_release_cell`', 'split target Stage 857 line')
assertIncludes(splitTarget, anchorId, 'split target Stage 857 anchor id')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 857 promotes `world_main_map_claim_release_cell`', 'convergence doc Stage 857 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, evidenceDirectory, 'Stage857 plan evidence dir')
assertIncludes(plan, formalSmokeCommand, 'Stage857 plan command')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, anchorId, 'visual smoke runner Stage 857 action')
assertIncludes(visualSmokeRunner, 'world_main_map_claim_release_cell', 'visual smoke runner Stage 857 action config')

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, 'main_map_claim_release_verified', 'Godot Stage 857 summary reason')
assertIncludes(godotMain, 'immunityReceiptOk', 'Godot Stage 857 immunity receipt field')
assertIncludes(godotMain, 'releasedOwnerOk', 'Godot Stage 857 release readback field')

assert.ok(existsSync(`${evidenceDirectory}/mainline_visual_smoke_summary.json`), 'Stage 857 smoke summary evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/godot_visual_smoke_report.json`), 'Stage 857 Godot report evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/01_after_${anchorId}.png`), 'Stage 857 final screenshot evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/00_claimed_main_map_cell.png`), 'Stage 857 claimed-cell screenshot evidence must exist')

const summary = readJson(`${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(summary.ok, true, 'Stage 857 formal smoke summary must be green')
assert.equal(summary.clickAction, anchorId)
const clickActionResult = summary.godotReport?.clickActionResult ?? {}
assert.equal(clickActionResult.ok, true, 'Stage 857 click action result must be green')
assert.equal(clickActionResult.reason, 'main_map_claim_release_verified')
assert.equal(clickActionResult.claimedOwnerOk, true)
assert.equal(clickActionResult.releaseButtonEnabledClaimed, true)
assert.equal(clickActionResult.immunityReceiptOk, true)
assert.equal(clickActionResult.immunityDeltaApplied, true)
assert.equal(clickActionResult.returnedOwnerOk, true)
assert.equal(clickActionResult.releasedOwnerOk, true)
assert.ok(Number(clickActionResult.claimedStreamingSummary?.mainMapOwnerOverrideDrawCount ?? 0) > 0)
assert.ok(Number(clickActionResult.claimedStreamingSummary?.mainMapImmunityBorderDrawCount ?? 0) > 0)

console.log('[godot_main_map_claim_release_stage857_gameplay_anchor_contract] all checks passed')
