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

const stageId = 860
const anchorId = 'world_naval_harbor_inventory_open_fixture'
const evidenceDirectory = 'tmp/stage860_world_naval_harbor_inventory_open_gameplay_anchor'
const formalSmokeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --server-script start --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --click-action world_naval_harbor_inventory_open_fixture --evidence-dir tmp/stage860_world_naval_harbor_inventory_open_gameplay_anchor --window-width 1920 --window-height 1080'
const guardScript = 'test:godot:world-naval-harbor-inventory-open-stage860-gameplay-anchor-contract'
const guardCommand = 'tsx server/tests/godot_world_naval_harbor_inventory_open_stage860_gameplay_anchor_contract.test.ts'
const anchorDocPath = 'docs/GODOT_WORLD_NAVAL_HARBOR_INVENTORY_OPEN_GAMEPLAY_ANCHOR_CURRENT_2026_06_18.md'

const packageJson = readJson('package.json')
assert.equal(packageJson.scripts?.[guardScript], guardCommand, 'package.json must expose the Stage 860 gameplay anchor contract')

assert.ok(existsSync(anchorDocPath), `missing Stage 860 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot world naval harbor inventory open gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, formalSmokeCommand, 'anchor doc formal smoke command')
assertIncludes(anchorDoc, 'not hosted GitHub Actions evidence', 'anchor doc hosted CI non-claim')
assertIncludes(anchorDoc, 'not full fleet management UI', 'anchor doc scope non-claim')

const registry = readJson('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')
const registered = registry.registeredAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(registered, 'gameplay anchor registry must register Stage 860 as a current formal anchor')
assert.equal(registered.anchorClass, 'formal-gameplay-anchor')
assert.equal(registered.status, 'formal-green-world-naval-harbor-inventory-open')
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
    registered.serverReceiptOrReadModel.includes('openNavalHarborInventory'),
  'Stage 860 registry entry must name the sea route, shipyard build, and harbor inventory authorities',
)
assert.deepEqual(registered.releaseOpsImpact, {
  clientPackage: 'Godot smoke action now promotes the existing naval harbor inventory HUD path',
  serverArtifact: 'existing openNavalHarborInventory authority is consumed by Stage860 gameplay anchor and retained evidence metadata',
  aiSubject: 'AI reads approved naval harbor inventory and fleet readiness summaries only; no subject payload expansion',
  opsRecovery: 'no restore/recovery producer change',
})
for (const nonClaim of [
  'not hosted GitHub Actions evidence',
  'not full fleet management UI',
  'not full port economy UI',
  'not staging or production endpoint evidence',
  'not a physical source split claim',
]) {
  assert.ok(registered.nonClaims.includes(nonClaim), `Stage 860 registry entry must include non-claim: ${nonClaim}`)
}

const retention = readJson('ops/release-artifacts/local-dev.tmp-evidence-retention.json')
const retained = retention.retainedEvidence?.find((entry: any) => entry.stage === stageId && entry.path === evidenceDirectory)
assert.ok(retained, 'tmp evidence retention must retain Stage 860 evidence')
assert.equal(retained.retentionClass, 'formal-gameplay-anchor-evidence')
assert.deepEqual(retained.requiredEvidenceFiles, ['mainline_visual_smoke_summary.json', 'godot_visual_smoke_report.json'])
assert.equal(retained.deletionRequiresExplicitUserApproval, true)

const progress = readJson('ops/release-artifacts/local-dev.boundary-convergence-progress.json')
const completedStage = progress.completedStages?.find((entry: any) => entry.stageId === stageId)
assert.ok(completedStage, 'Stage826 progress must record Stage 860')
assert.equal(completedStage.status, 'formal-green-world-naval-harbor-inventory-open-gameplay-anchor')
assert.ok(completedStage.evidence.includes(`${evidenceDirectory}/`))
assert.ok(
  completedStage.evidence.includes(
    'server/tests/godot_world_naval_harbor_inventory_open_stage860_gameplay_anchor_contract.test.ts',
  ),
)
const progressAnchor = progress.gameplayAnchors?.find((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId)
assert.ok(progressAnchor, 'Stage826 gameplayAnchors must include Stage 860')
assert.equal(progressAnchor.smokeEvidence, `${evidenceDirectory}/`)
assert.ok(progress.mandatoryGuards?.includes('world_naval_harbor_inventory_open_stage860_gameplay_anchor_guard'))

const sweepManifest = readJson('ops/release-artifacts/local-dev.local-anchor-static-sweep.json')
assert.ok(sweepManifest.currentAnchorStages.includes(stageId), 'Stage856 sweep must include Stage 860')
assert.ok(
  sweepManifest.requiredAnchors?.some((entry: any) => entry.stageId === stageId && entry.anchorId === anchorId),
  'Stage856 sweep required anchors must include Stage 860',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, 'Stage 860 - world naval harbor inventory open gameplay anchor', 'CURRENT handoff Stage 860 title')
assertIncludes(currentHandoff, formalSmokeCommand, 'CURRENT handoff Stage 860 formal command')
assertIncludes(currentHandoff, 'worldNavalHarborInventoryOpenOk=true', 'CURRENT handoff Stage 860 acceptance field')
assertIncludes(currentHandoff, 'not hosted GitHub Actions evidence', 'CURRENT handoff Stage 860 non-claim')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 860 promotes `world_naval_harbor_inventory_open_fixture`', 'split target Stage 860 line')

const convergenceDoc = readUtf8('docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md')
assertIncludes(convergenceDoc, 'Stage 860 promotes `world_naval_harbor_inventory_open_fixture`', 'convergence doc Stage 860 line')

const plan = readUtf8('docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md')
assertIncludes(plan, evidenceDirectory, 'Stage860 plan evidence dir')
assertIncludes(plan, formalSmokeCommand, 'Stage860 plan command')

const visualSmokeRunner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(visualSmokeRunner, anchorId, 'visual smoke runner Stage 860 action')
assertIncludes(
  visualSmokeRunner,
  '_validate_world_naval_harbor_inventory_open_gameplay_anchor',
  'visual smoke runner Stage 860 validator',
)

const godotMain = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(godotMain, '"world_naval_harbor_inventory_open_fixture":', 'Godot Stage 860 dispatch')
assertIncludes(godotMain, 'post_world_action("openSeaRoute"', 'Godot Stage 860 must open sea route authority')
assertIncludes(godotMain, 'post_world_action("buildNavalWarshipAtHarbor"', 'Godot Stage 860 must build inventory fleet authority')
assertIncludes(godotMain, 'post_world_action("openNavalHarborInventory"', 'Godot Stage 860 must call harbor inventory authority')

assert.ok(existsSync(`${evidenceDirectory}/mainline_visual_smoke_summary.json`), 'Stage 860 smoke summary evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/godot_visual_smoke_report.json`), 'Stage 860 Godot report evidence must exist')
assert.ok(existsSync(`${evidenceDirectory}/01_after_${anchorId}.png`), 'Stage 860 final screenshot evidence must exist')

const summary = readJson(`${evidenceDirectory}/mainline_visual_smoke_summary.json`)
assert.equal(summary.ok, true, 'Stage 860 formal smoke summary must be green')
assert.equal(summary.clickAction, anchorId)
const clickActionResult = summary.godotReport?.clickActionResult ?? {}
assert.equal(clickActionResult.ok, true, 'Stage 860 click action result must be green')
assert.equal(clickActionResult.worldNavalHarborInventoryOpenOk, true)
assert.notEqual(clickActionResult.sourceShipyardOrderId, '')
assert.notEqual(clickActionResult.inventoryFleetId, '')
assert.equal(clickActionResult.harborId, 'east_han_coastal_dock_quanzhou')
assert.equal(clickActionResult.harborName, '泉州港')
assert.equal(clickActionResult.fleetCardVisible, true)
assert.equal(clickActionResult.harborSurfaceVisible, true)
assert.equal(clickActionResult.harborCopyAllowedOnlyOnHarborSurface, true)
assert.equal(clickActionResult.landSurfaceNavalCopyLeak, false)
assert.equal(clickActionResult.playerVisibleEngineeringCopyLeak, false)
assert.deepEqual(clickActionResult.visibleCopyForbiddenHits, [])
assert.equal(clickActionResult.worldNavalHarborInventoryScope, 'harbor_inventory_open_only_not_full_fleet_management')
assert.equal(clickActionResult.harborHudVisualSkinOk, true)
assert.equal(clickActionResult.harborActionHudUnifiedFamilyOk, true)
assert.equal(clickActionResult.harborActionHudCompactCopyOk, true)

console.log('[godot_world_naval_harbor_inventory_open_stage860_gameplay_anchor_contract] all checks passed')
