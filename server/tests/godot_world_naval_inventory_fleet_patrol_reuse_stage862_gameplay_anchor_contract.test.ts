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

const stageId = 862
const anchorId = 'world_naval_inventory_fleet_patrol_reuse_fixture'
const evidenceDirectory = 'tmp/stage862_world_naval_inventory_fleet_patrol_reuse_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --server-script start --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --click-action world_naval_inventory_fleet_patrol_reuse_fixture --evidence-dir tmp/stage862_world_naval_inventory_fleet_patrol_reuse_gameplay_anchor --window-width 1920 --window-height 1080'
const guardScript = 'test:godot:world-naval-inventory-fleet-patrol-reuse-stage862-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_world_naval_inventory_fleet_patrol_reuse_stage862_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_WORLD_NAVAL_INVENTORY_FLEET_PATROL_REUSE_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 862 gameplay anchor contract')

assert.ok(existsSync(anchorDocPath), `missing Stage 862 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot world naval inventory fleet patrol reuse gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')
assertIncludes(anchorDoc, 'not full fleet inventory UI', 'anchor doc scope non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 862 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-world-naval-inventory-fleet-patrol-reuse')
assert.equal(registered.clientInputOrClickAction, anchorId)
assert.equal(registered.formalSmokeCommand, formalSmokeCommand)
assert.equal(registered.evidenceDirectory, evidenceDirectory)
assert.equal(registered.summaryJsonPath, `${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(registered.godotReportJsonPath, `${evidenceDirectory}/godot_visual_smoke_report.json`)
assert.equal(registered.screenshotEvidencePath, `${evidenceDirectory}/01_after_${anchorId}.png`)
assert.equal(registered.tmpEvidenceRetentionClassification, 'formal-gameplay-anchor-evidence')
assert.ok(
  registered.serverReceiptOrReadModel.includes('openSeaRoute') &&
    registered.serverReceiptOrReadModel.includes('buildNavalWarshipAtHarbor') &&
    registered.serverReceiptOrReadModel.includes('seaPatrolScout') &&
    registered.serverReceiptOrReadModel.includes('seaPatrolIntercept'),
  'Stage 862 registry entry must name route, shipyard, patrol, and intercept authorities',
)
assert.deepEqual(registered.releaseOpsImpact, {
  clientPackage: 'Godot smoke action now promotes the existing naval inventory fleet patrol reuse path',
  serverArtifact: 'existing seaPatrolScout and seaPatrolIntercept inventory-fleet reuse authority is consumed by Stage862 gameplay anchor and retained evidence metadata',
  aiSubject: 'AI reads approved naval inventory fleet reuse summaries only; no subject payload expansion',
  opsRecovery: 'no restore/recovery producer change',
})
for (const nonClaim of [
  'not hosted GitHub Actions evidence',
  'not full fleet inventory UI',
  'not full fleet management UI',
  'not staging or production endpoint evidence',
  'not a physical source split claim',
]) {
  assert.ok(registered.nonClaims.includes(nonClaim), `Stage 862 registry entry must include non-claim: ${nonClaim}`)
}

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 862 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 862')
assert.equal(completedStage.status, 'formal-green-world-naval-inventory-fleet-patrol-reuse-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(
  completedStage.evidence.includes(
    'server/tests/godot_world_naval_inventory_fleet_patrol_reuse_stage862_gameplay_anchor_contract.test.ts',
  ),
)
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 862')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('world_naval_inventory_fleet_patrol_reuse_stage862_gameplay_anchor_guard'))

const sweepManifest = readJson('ops/release-artifacts/local-dev.local-anchor-static-sweep.json')
assert.ok(sweepManifest.currentAnchorStages.includes(stageId), 'Stage856 sweep must include Stage 862')
assert.ok(
  sweepManifest.requiredAnchors?.some((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId),
  'Stage856 sweep required anchors must include Stage 862',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 862 - world naval inventory fleet patrol reuse gameplay anchor', 'CURRENT handoff Stage 862 title')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 862 formal command')
assertIncludes(currentHandoff, 'worldNavalInventoryFleetPatrolReuseOk=true', 'CURRENT handoff Stage 862 acceptance field')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 862 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 862 promotes `world_naval_inventory_fleet_patrol_reuse_fixture`', 'split target Stage 862 line')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 862 promotes `world_naval_inventory_fleet_patrol_reuse_fixture`', 'convergence doc Stage 862 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, evidenceDirectory, 'Stage862 plan evidence dir')
assertIncludes(plan, formalSmokeCommand, 'Stage862 plan command')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, anchorId, 'visual smoke runner Stage 862 action')
assertIncludes(
  visualSmokeRunner,
  '_validate_world_naval_inventory_fleet_patrol_reuse_gameplay_anchor',
  'visual smoke runner Stage 862 validator',
)

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, '"world_naval_inventory_fleet_patrol_reuse_fixture":', 'Godot Stage 862 dispatch')
assertIncludes(godotMain, 'post_world_action("seaPatrolScout"', 'Godot Stage 862 must call seaPatrolScout authority')
assertIncludes(godotMain, 'post_world_action("seaPatrolIntercept"', 'Godot Stage 862 must call seaPatrolIntercept authority')
assertIncludes(godotMain, 'worldNavalReuseDoesNotUseUnitMarker', 'Godot Stage 862 must prove no land UnitMarker usage')

assert.ok(existsSync(`${evidenceDirectory}/mainline_visual_smoke_summary.json`), 'Stage 862 smoke summary evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/godot_visual_smoke_report.json`), 'Stage 862 Godot report evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/01_after_${anchorId}.png`), 'Stage 862 final screenshot evidence must exist')

const summary = readJson(`${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(summary.ok, true, 'Stage 862 formal smoke summary must be green')
assert.equal(summary.clickAction, anchorId)
const clickActionResult = summary.godotReport?.clickActionResult ?? {}
assert.equal(clickActionResult.ok, true, 'Stage 862 click action result must be green')
assert.equal(clickActionResult.worldNavalInventoryFleetPatrolReuseOk, true)
assert.notEqual(clickActionResult.sourceShipyardOrderId, '')
assert.notEqual(clickActionResult.inventoryFleetId, '')
assert.equal(clickActionResult.reusedFleetId, clickActionResult.inventoryFleetId)
assert.equal(clickActionResult.harborId, 'east_han_coastal_dock_quanzhou')
assert.equal(clickActionResult.seaRouteId, 'east_han_coastal_dock_to_wa_contact')
assert.notEqual(clickActionResult.patrolId, '')
assert.notEqual(clickActionResult.interceptReportId, '')
assert.equal(clickActionResult.reuseStatus, 'route_patrol_intercept_reused')
assert.equal(clickActionResult.worldNavalReuseUsesExistingSeaRuntime, true)
assert.equal(clickActionResult.worldNavalReuseDoesNotUseUnitMarker, true)
assert.equal(clickActionResult.feedbackVisible, true)
assert.equal(clickActionResult.fleetReadbackOk, true)
assert.equal(clickActionResult.playerVisibleEngineeringCopyLeak, false)
assert.deepEqual(clickActionResult.visibleCopyForbiddenHits, [])
assert.equal(clickActionResult.worldNavalReuseScope, 'shipyard_inventory_reuse_only_not_full_fleet_inventory_ui')

console.log('[godot_world_naval_inventory_fleet_patrol_reuse_stage862_gameplay_anchor_contract] all checks passed')
