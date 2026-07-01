import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string) {
  assert.ok(source.includes(token), `${label} should include ${token}`)
}

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

const anchorDocPath = 'docs/GODOT_MAIN_CITY_TROOP_SUBMIT_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'

assert.equal(
  packageJson.scripts?.['test:godot:main-city-troop-submit-gameplay-anchor-contract'],
  'tsx server/tests/godot_main_city_troop_submit_gameplay_anchor_contract.test.ts',
  'package.json must expose the main-city troop-submit gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing main-city troop-submit gameplay anchor doc: ${anchorDocPath}`)

const anchorDoc = readUtf8(anchorDocPath)
assert.ok(
  anchorDoc.includes('Status: current Godot main-city troop submit gameplay anchor'),
  'anchor doc must identify itself as the current Godot main-city troop submit gameplay anchor',
)

const anchorMatch = anchorDoc.match(/```json\s*\n([\s\S]*?)\n```/)
assert.ok(anchorMatch, 'anchor doc must contain a machine-readable JSON block')

const anchor = JSON.parse(anchorMatch[1]) as {
  status: string
  stage: number
  anchorId: string
  clickAction: string
  playerVisibleSurface: string
  formalCommand: string
  ownership: {
    clientOwned: string[]
    serverOwned: string[]
    sharedContract: string[]
    aiRead: string[]
  }
  requiredReceiptFields: string[]
  requiredPageSummaryFields: string[]
  serverContracts: string[]
  evidencePolicy: {
    summaryPath: string
    godotReportPath: string
    screenshotPath: string
    committedEvidence: boolean
  }
}

assert.equal(anchor.status, 'current Godot main-city troop submit gameplay anchor')
assert.equal(anchor.stage, 809)
assert.equal(anchor.anchorId, 'main_city_troop_submit_player_formation')
assert.equal(anchor.clickAction, 'world_click_main_city_node_troop_submit_player_formation')
assert.equal(anchor.playerVisibleSurface, 'main_city_troop_formation')
assert.equal(
  anchor.formalCommand,
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_click_main_city_node_troop_submit_player_formation --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 260 --backend-timeout-sec 160 --evidence-dir tmp/stage809_main_city_troop_submit_gameplay_anchor',
)
assert.deepEqual(anchor.ownership.clientOwned, [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/main_city_hub_overlay.gd',
  'godot-client/scripts/app/adapters/slg_domain_action_adapter.gd',
  'godot-client/data/ui/main_city_troop_formation_read_model.json',
])
assert.deepEqual(anchor.ownership.serverOwned, [
  'server/src/application/world/WorldService.ts',
  'server/src/routes/world.ts',
  'server/src/application/world/mainCityTroopFormationReadModel.ts',
])
assert.deepEqual(anchor.ownership.sharedContract, [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/main_city_troop_formation_godot_contract.test.ts',
  'server/tests/main_city_troop_formation_read_model_http_contract.test.ts',
])
assert.deepEqual(anchor.ownership.aiRead, [
  'AI may observe formation facts only through approved subject/read-model packets; this anchor is a player command path and does not expose private sourceRefs, restore tokens, provider keys, or server persistence paths.',
])

for (const requiredField of [
  'success',
  'source_action',
  'hero_id',
  'co_hero_ids',
  'unit_id',
  'tile_id',
  'world_action_intent',
]) {
  assert.ok(anchor.requiredReceiptFields.includes(requiredField), `anchor missing receipt field: ${requiredField}`)
}

for (const requiredField of [
  'requestedPageId',
  'troopFormationSubmitMode',
  'troopFormationFormalSubmitAvailable',
  'troopFormationSubmitFormationOrder',
  'authorityTriggered',
  'templateOnly',
]) {
  assert.ok(anchor.requiredPageSummaryFields.includes(requiredField), `anchor missing page summary field: ${requiredField}`)
}

assert.deepEqual(anchor.serverContracts, [
  'npx.cmd tsx server/tests/main_city_troop_formation_godot_contract.test.ts',
  'npx.cmd tsx server/tests/main_city_troop_formation_read_model_http_contract.test.ts',
])
assert.deepEqual(anchor.evidencePolicy, {
  summaryPath: 'tmp/stage809_main_city_troop_submit_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage809_main_city_troop_submit_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath: 'tmp/stage809_main_city_troop_submit_gameplay_anchor/01_after_world_click_main_city_node_troop_submit_player_formation.png',
  committedEvidence: false,
})

const visualSmokeSource = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
assertIncludes(
  visualSmokeSource,
  '"world_click_main_city_node_troop_submit_player_formation"',
  'formal visual smoke runner',
)

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
for (const requiredMainToken of [
  'func _press_mainline_visual_smoke_main_city_troop_submit_player_formation() -> Dictionary:',
  '_runtime_action_receipt',
  'str(receipt.get("source_action", "")) == "deployReserveHero"',
  '["100031", "100013", "100017"]',
  '"troopFormationSubmitMode": str(before_submit_summary.get("troopFormationSubmitMode", ""))',
  '"troopFormationFormalSubmitAvailable": bool(before_submit_summary.get("troopFormationFormalSubmitAvailable", false))',
  '"troopFormationSubmitFormationOrder": str(before_submit_summary.get("troopFormationSubmitFormationOrder", ""))',
  '"authorityTriggered": submitted',
  '"templateOnly": false',
]) {
  assertIncludes(mainSource, requiredMainToken, 'Godot main troop-submit gameplay anchor')
}

const actionAdapter = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
for (const requiredAdapterToken of [
  'func request_deploy_general(hero_id: String, tile_id: String, co_hero_ids: Array = [], include_world: bool = true, options: Dictionary = {})',
  '"action_name": "deployReserveHero"',
  '"coHeroIds": normalized_co_hero_ids',
  'for optional_key in ["aiPlayerId", "teamId", "teamIndex"]',
]) {
  assertIncludes(actionAdapter, requiredAdapterToken, 'Godot deploy adapter')
}

const godotContract = readUtf8('server/tests/main_city_troop_formation_godot_contract.test.ts')
for (const requiredGodotContractToken of [
  'submit_selected_troop_formation_for_smoke',
  'request_deploy_general", hero_id, tile_id, co_hero_ids',
  '["100031", "100013", "100017"]',
  'main_city_troop_formation_submit_no_legacy_troop_panel_v1',
  'world_click_main_city_node_troop_submit_player_formation',
]) {
  assertIncludes(godotContract, requiredGodotContractToken, 'main-city troop Godot contract')
}

const readModelContract = readUtf8('server/tests/main_city_troop_formation_read_model_http_contract.test.ts')
for (const requiredReadModelToken of [
  "action: 'deployReserveHero'",
  "coHeroIds: ['100031', '100013']",
  '/api/world/main-city/troop-formation?factionId=',
  'read_model_authority_source',
  'backend_ai_player_main_city_state_v1',
]) {
  assertIncludes(readModelContract, requiredReadModelToken, 'main-city troop read-model HTTP contract')
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredHandoffToken of [
  'Stage 809 - Godot Main City Troop Submit Gameplay Anchor',
  'world_click_main_city_node_troop_submit_player_formation',
  'tmp/stage809_main_city_troop_submit_gameplay_anchor/01_after_world_click_main_city_node_troop_submit_player_formation.png',
]) {
  assertIncludes(currentHandoff, requiredHandoffToken, 'CURRENT handoff Stage 809')
}

console.log('[godot_main_city_troop_submit_gameplay_anchor_contract] all checks passed')
