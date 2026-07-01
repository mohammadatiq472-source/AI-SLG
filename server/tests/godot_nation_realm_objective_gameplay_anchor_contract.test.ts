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

const anchorDocPath = 'docs/GODOT_NATION_REALM_OBJECTIVE_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const packageJson = JSON.parse(readUtf8('package.json'))

assert.equal(
  packageJson.scripts?.['test:godot:nation-realm-objective-gameplay-anchor-contract'],
  'tsx server/tests/godot_nation_realm_objective_gameplay_anchor_contract.test.ts',
  'package.json must expose the nation realm objective gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing nation realm objective gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot nation realm objective gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 811', 'anchor doc stage marker')
assertIncludes(anchorDoc, 'recordNationMidgameRealmObjectiveBridge', 'anchor doc server action')
assertIncludes(anchorDoc, 'not a full kingdom or empire creation proof', 'anchor doc scope boundary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot nation realm objective gameplay anchor')
assert.equal(anchor.stage, 811)
assert.equal(anchor.anchorId, 'nation_midgame_realm_objective_bridge')
assert.equal(anchor.clickAction, 'world_open_main_city_organization_nation_midgame_realm_objective_bridge')
assert.equal(anchor.playerVisibleSurface, 'nation_midgame_realm_objective_hud')
assert.equal(
  anchor.formalCommand,
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_open_main_city_organization_nation_midgame_realm_objective_bridge --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --evidence-dir tmp/stage811_nation_realm_objective_gameplay_anchor',
)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/alliance_panel.gd',
  'godot-client/scripts/ui/presenters/alliance_presenter.gd',
  'godot-client/scripts/infra/http/backend_api_client.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/application/world/WorldService.ts',
  'shared/contracts/game/world.ts',
  'server/src/routes/playerHistory.ts',
  'shared/domain/playerHistory.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/godot_nation_midgame_realm_objective_bridge_fixture_contract.test.ts',
  'server/tests/world_nation_midgame_realm_objective_bridge_contract.test.ts',
  'server/tests/player_history_organization_nation_realm_objective_producer_contract.test.ts',
  'server/tests/nation_war_objective_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredGodotField of [
  'nationMidgameRealmObjectiveBridgeOk',
  'sourceControlAuthorityId',
  'sourceLuoyangControlProgressId',
  'realmObjectiveProgressId',
  'kingdomObjectivePrerequisiteVisible',
  'empireObjectivePrerequisiteVisible',
  'feedbackVisible',
  'playerVisibleEngineeringCopyLeak',
  'nationMidgameHudVisualSkinOk',
  'nationMidgameHudRealButtonNodeNames',
  'nationMidgameLegacyActionPanelHidden',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

for (const requiredReceiptField of [
  'sourceControlAuthorityId',
  'sourceLuoyangControlProgressId',
  'realmObjectiveProgressId',
  'kingdomObjectivePrerequisiteProgress',
  'empireObjectivePrerequisiteProgress',
  'usesOrganizationNationSurface',
  'playerOrganizationResult',
]) {
  assert.ok(anchor.requiredServerReceiptFields.includes(requiredReceiptField), `anchor receipt fields must include ${requiredReceiptField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage811_nation_realm_objective_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage811_nation_realm_objective_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath:
    'tmp/stage811_nation_realm_objective_gameplay_anchor/01_after_world_open_main_city_organization_nation_midgame_realm_objective_bridge.png',
})

for (const command of [
  'npm.cmd run test:godot:nation-realm-objective-gameplay-anchor-contract',
  'npx.cmd tsx server/tests/godot_nation_midgame_realm_objective_bridge_fixture_contract.test.ts',
  'npx.cmd tsx server/tests/world_nation_midgame_realm_objective_bridge_contract.test.ts',
  'npm.cmd run test:world:player-history-organization-nation-realm-objective-producer-contract',
  'npx.cmd tsx server/tests/nation_war_objective_contract.test.ts',
  anchor.formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const dispatchSource = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
assertIncludes(
  dispatchSource,
  '"world_open_main_city_organization_nation_midgame_realm_objective_bridge":',
  'Godot click-action dispatch',
)
assertIncludes(
  dispatchSource,
  'return await _press_mainline_visual_smoke_nation_midgame_realm_objective_bridge()',
  'Godot click-action dispatch',
)

const bridgeWrapper = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_nation_midgame_realm_objective_bridge() -> Dictionary:',
)
for (const requiredMainToken of [
  '_press_mainline_visual_smoke_nation_midgame_luoyang_control_authority()',
  'recordNationMidgameRealmObjectiveBridge',
  '_show_nation_midgame_realm_objective_hud',
  'realmObjectiveProgressId',
  'nationMidgameRealmObjectiveBridgeOk',
  'nationMidgameHudVisualSkinOk',
  'playerVisibleEngineeringCopyLeak',
  'realm_objective_bridge_only_not_full_kingdom_empire_creation',
]) {
  assertIncludes(bridgeWrapper, requiredMainToken, 'Godot nation realm objective bridge wrapper')
}

const runner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
for (const requiredRunnerToken of [
  '"world_open_main_city_organization_nation_midgame_realm_objective_bridge"',
  '"nationMidgameRealmObjectiveBridgeOk"',
  '"realmObjectiveProgressId"',
  '"kingdomObjectivePrerequisiteVisible"',
  '"empireObjectivePrerequisiteVisible"',
  '"nationMidgameHudVisualSkinOk"',
]) {
  assertIncludes(runner, requiredRunnerToken, 'visual smoke runner realm objective gate')
}

const worldService = readUtf8('server/src/application/world/WorldService.ts')
for (const requiredServerToken of [
  'recordNationMidgameRealmObjectiveBridge',
  'realmObjectiveProgressId',
  "action: 'record_nation_midgame_realm_objective_bridge'",
  "nationMidgameRealmObjectiveBridgeScope: 'realm_objective_bridge_only_not_full_kingdom_empire_creation'",
]) {
  assertIncludes(worldService, requiredServerToken, 'server realm objective authority')
}

const worldContract = readUtf8('shared/contracts/game/world.ts')
for (const requiredContractToken of [
  'realmObjectiveProgressId?: string',
  "nationMidgameRealmObjectiveBridgeScope?: 'realm_objective_bridge_only_not_full_kingdom_empire_creation'",
]) {
  assertIncludes(worldContract, requiredContractToken, 'shared world receipt contract')
}

const playerHistoryProducer = readUtf8('server/tests/player_history_organization_nation_realm_objective_producer_contract.test.ts')
for (const requiredProducerToken of [
  'record_nation_midgame_realm_objective_bridge',
  'player history should expose realm objective bridge as an organization/nation card',
  'sourceControlAuthorityId',
  'sourceLuoyangControlProgressId',
  'realmObjectiveProgressId',
  'visible copy leaked implementation term',
]) {
  assertIncludes(playerHistoryProducer, requiredProducerToken, 'player-history organization/nation producer gate')
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredHandoffToken of [
  'Stage 811 - Godot Nation Realm Objective Gameplay Anchor',
  'tmp/stage811_nation_realm_objective_gameplay_anchor/01_after_world_open_main_city_organization_nation_midgame_realm_objective_bridge.png',
  'npm.cmd run test:godot:nation-realm-objective-gameplay-anchor-contract',
]) {
  assertIncludes(currentHandoff, requiredHandoffToken, 'CURRENT handoff Stage 811')
}

console.log('[godot_nation_realm_objective_gameplay_anchor_contract] all checks passed')
