import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function extractJsonBlock(source: string): any {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'anchor doc must include one fenced json block')
  return JSON.parse(match[1])
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const anchorDocPath = 'docs/GODOT_MAIN_CITY_FACILITY_UPGRADE_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const clickAction = 'world_click_main_city_node_facility_building_tree_submit_upgrade'
const formalCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_click_main_city_node_facility_building_tree_submit_upgrade --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --evidence-dir tmp/stage815_main_city_facility_upgrade_gameplay_anchor'

const packageJson = JSON.parse(readUtf8('package.json'))
assert.equal(
  packageJson.scripts?.['test:godot:main-city-facility-upgrade-gameplay-anchor-contract'],
  'tsx server/tests/godot_main_city_facility_upgrade_gameplay_anchor_contract.test.ts',
  'package.json must expose the main-city facility upgrade gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing main-city facility upgrade gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot main-city facility upgrade gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 815', 'anchor doc stage marker')
assertIncludes(anchorDoc, 'client-visible upgrade drawer is not server truth', 'anchor doc client authority boundary')
assertIncludes(anchorDoc, 'server receipt owns `promoteTroopFacilityBuilding`', 'anchor doc server authority summary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot main-city facility upgrade gameplay anchor')
assert.equal(anchor.stage, 815)
assert.equal(anchor.anchorId, 'main_city_facility_upgrade_submit')
assert.equal(anchor.clickAction, clickAction)
assert.equal(anchor.playerVisibleSurface, 'main_city_facility_tree_upgrade_drawer')
assert.equal(anchor.formalCommand, formalCommand)
assert.equal(anchor.serverAuthority.worldAction, 'promoteTroopFacilityBuilding')
assert.equal(anchor.serverAuthority.receiptRefreshEndpoint, '/api/world/main-city/facility-tree')
assert.equal(anchor.boundary.clientVisibleCacheIsTruth, false)
assert.equal(anchor.boundary.serverReceiptIsTruth, true)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/data/ui/main_city_facility_tree_read_model.json',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/routes/world.ts',
  'server/src/application/world/WorldService.ts',
  'server/src/app.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/main_city_facility_tree_upgrade_contract.test.ts',
  'server/tests/main_city_facility_tree_read_model_http_contract.test.ts',
  'server/tests/player_history_main_city_economy_receipt_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredGodotField of [
  'main_city_facility_tree_upgrade_submitted',
  'hasUpgradeSheet',
  'selectedBuildingId',
  'submittedStateVisible',
  'primaryButtonDisabled',
  'upgradeSheetSubmittedBadgeVisible',
  'upgradeSheetActionStateText',
  'facilityTreeReadonly',
  'facilityTreeUpgradableNodeCount',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage815_main_city_facility_upgrade_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage815_main_city_facility_upgrade_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath:
    'tmp/stage815_main_city_facility_upgrade_gameplay_anchor/01_after_world_click_main_city_node_facility_building_tree_submit_upgrade.png',
})

for (const command of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run test:godot:main-city-facility-upgrade-gameplay-anchor-contract',
  'npm.cmd run test:world:main-city-facility-tree-read-model-contract',
  'npm.cmd run test:world:main-city-facility-tree-upgrade-contract',
  'npm.cmd run test:world:player-history-main-city-economy-receipt-contract',
  formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(mainSource, `"${clickAction}":`, 'Godot click action dispatch')

const submitWrapper = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_main_city_facility_building_tree_submit_upgrade() -> Dictionary:',
)
for (const requiredMainToken of [
  'main_city_facility_tree_upgrade_submitted',
  'upgradeSheetActionStateText',
  '升级中',
  'primaryButtonDisabled',
  'upgradeSheetSubmittedBadgeVisible',
]) {
  assertIncludes(submitWrapper, requiredMainToken, 'Godot facility upgrade submit wrapper')
}

const hubExemptionIndex = mainSource.indexOf('hub_requirement_ok = true')
assert.ok(hubExemptionIndex >= 0, 'mainline visual smoke must keep an explicit hub requirement exemption block')
const hubExemptionBlock = mainSource.slice(Math.max(0, hubExemptionIndex - 1400), hubExemptionIndex + 140)
assertIncludes(
  hubExemptionBlock,
  'click_action.begins_with("world_click_main_city_node_facility_building_tree")',
  'facility upgrade gameplay anchor hub exemption',
)

const smokeRunnerSource = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
for (const requiredRunnerToken of [
  clickAction,
  'def _validate_main_city_facility_upgrade_gameplay_anchor(',
  'mainCityFacilityUpgradeGameplayAnchorOk',
  'main_city_facility_tree_upgrade_submitted',
  'upgradeSheetActionStateText',
  'screenshot_visibility_gate.get("ok", False)',
]) {
  assertIncludes(smokeRunnerSource, requiredRunnerToken, 'formal smoke runner facility upgrade anchor validator')
}

const worldRouteSource = readUtf8('server/src/routes/world.ts')
const worldServiceSource = readUtf8('server/src/application/world/WorldService.ts')
const worldSchemaSource = readUtf8('shared/schemas/worldAction.ts')
for (const [source, label] of [
  [worldRouteSource, 'world route'],
  [worldServiceSource, 'world service'],
  [worldSchemaSource, 'shared world action schema'],
] as const) {
  assertIncludes(source, 'promoteTroopFacilityBuilding', label)
}
assertIncludes(worldServiceSource, "endpoint: '/api/world/main-city/facility-tree'", 'facility upgrade read model refresh')

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredCurrentToken of [
  'Stage 815',
  anchorDocPath,
  'world_click_main_city_node_facility_building_tree_submit_upgrade',
  'ops:service-process-guard',
]) {
  assertIncludes(currentHandoff, requiredCurrentToken, 'CURRENT handoff Stage 815 record')
}

console.log('[godot_main_city_facility_upgrade_gameplay_anchor_contract] all checks passed')
