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

const docPath = 'docs/GODOT_RECRUIT_DRAW_RESULT_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const clickAction = 'world_open_main_city_recruit_single'
const formalCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_open_main_city_recruit_single --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --evidence-dir tmp/stage817_recruit_draw_result_gameplay_anchor'

const packageJson = JSON.parse(readUtf8('package.json'))
assert.equal(
  packageJson.scripts?.['test:godot:recruit-draw-result-gameplay-anchor-contract'],
  'tsx server/tests/godot_recruit_draw_result_gameplay_anchor_contract.test.ts',
  'package.json must expose the Stage 817 recruit draw result gameplay anchor contract',
)

assert.ok(existsSync(docPath), `missing Stage 817 recruit draw result gameplay anchor doc: ${docPath}`)
const anchorDoc = readUtf8(docPath)
assertIncludes(anchorDoc, 'Status: current Godot recruit draw result gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'server receipt owns `recruitProspectHero`', 'server authority phrase')
assertIncludes(anchorDoc, 'result-only page open is not enough', 'result-only boundary phrase')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot recruit draw result gameplay anchor')
assert.equal(anchor.stage, 817)
assert.equal(anchor.anchorId, 'recruit_draw_single_result')
assert.equal(anchor.clickAction, clickAction)
assert.equal(anchor.resultOnlyClickAction, 'world_open_main_city_recruit_result')
assert.equal(anchor.formalCommand, formalCommand)
assert.equal(anchor.serverAuthority.worldAction, 'recruitProspectHero')
assert.equal(anchor.serverAuthority.serverAuthorityGreen, true)
assert.equal(anchor.boundary.resultOnlyPageOpenIsServerTruth, false)
assert.equal(anchor.boundary.serverReceiptIsTruth, true)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/recruit_panel.gd',
  'godot-client/scripts/app/adapters/slg_domain_action_adapter.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/routes/world.ts',
  'server/src/application/world/WorldService.ts',
  'shared/schemas/worldAction.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/ai_player_http_recruit_contract.test.ts',
  'server/tests/godot_recruit_draw_reveal_motion_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredField of [
  'recruitDrawActionClickVerified',
  'recruitDrawActionReceiptSource',
  'recruitDrawActionRemoteAttempted',
  'recruitDrawActionRemoteApplied',
  'recruitDrawActionReceiptHeroId',
  'recruitDrawActionReceiptPoolId',
  'recruitDrawActionClickedActionId',
  'drawPreviewMode',
  'drawPreviewVisibleCount',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredField), `anchor Godot fields must include ${requiredField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage817_recruit_draw_result_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage817_recruit_draw_result_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath: 'tmp/stage817_recruit_draw_result_gameplay_anchor/01_after_world_open_main_city_recruit_single.png',
})

for (const command of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run test:godot:recruit-draw-result-gameplay-anchor-contract',
  'npm.cmd run test:ai:player-http-recruit-contract',
  formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const recruitDrawWrapper = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_recruit_draw_action(action_id: String, expected_page_id: String, close_after_open: bool) -> Dictionary:',
)
for (const requiredToken of [
  '_runtime_action_receipt = {}',
  'recruitDrawActionReceiptSource',
  'recruitDrawActionRemoteAttempted',
  'recruitDrawActionRemoteApplied',
  'recruitDrawActionReceiptHeroId',
  'recruitDrawActionReceiptPoolId',
  '"actionReceipt": action_receipt',
]) {
  assertIncludes(recruitDrawWrapper, requiredToken, 'Godot recruit draw result wrapper')
}

const extractReceipt = functionSource(mainSource, 'func _extract_overlay_action_receipt(outcome: Dictionary) -> Dictionary:')
for (const requiredReceiptToken of [
  '"remote_attempted": bool(action_result.get("remote_attempted", false))',
  '"remote_applied": bool(action_result.get("remote_applied", false))',
  '"world_action_intent": world_action_intent',
]) {
  assertIncludes(extractReceipt, requiredReceiptToken, 'generic overlay action receipt extraction')
}

const adapterSource = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
const recruitDrawAdapter = functionSource(adapterSource, 'func request_recruit_draw(draw_mode: String, pool_id: String) -> Dictionary:')
for (const requiredAdapterToken of [
  '"mode": "backend_world_action"',
  '"bridge_strategy": "direct_backend_action"',
  '"action_name": "recruitProspectHero"',
  '"remote_attempted": true',
  '"remote_applied": remote_applied',
]) {
  assertIncludes(recruitDrawAdapter, requiredAdapterToken, 'Godot recruit draw backend adapter')
}

const worldRouteSource = readUtf8('server/src/routes/world.ts')
const worldServiceSource = readUtf8('server/src/application/world/WorldService.ts')
const worldActionSchemaSource = readUtf8('shared/schemas/worldAction.ts')
for (const [source, label] of [
  [worldRouteSource, 'server world route'],
  [worldServiceSource, 'world service'],
  [worldActionSchemaSource, 'shared world action schema'],
] as const) {
  assertIncludes(source, 'recruitProspectHero', label)
}
assertIncludes(worldServiceSource, "const receipt: WorldActionReceipt", 'world service recruit receipt')
assertIncludes(worldServiceSource, "heroIds: result.heroIds", 'world service recruit hero ids receipt')

const aiRecruitContract = readUtf8('server/tests/ai_player_http_recruit_contract.test.ts')
for (const token of [
  "assertSuccessfulReceipt('recruit_commander', recruitSuccess.receipt, 'recruitProspectHero')",
  "recruitBodyChangeItems.find((item) => item.action === 'recruit_commander')",
  'visibleToAi',
]) {
  assertIncludes(aiRecruitContract, token, 'AI recruit subject receipt contract')
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 817',
  docPath,
  'world_open_main_city_recruit_single',
  'recruitProspectHero',
]) {
  assertIncludes(currentHandoff, token, 'CURRENT handoff Stage 817 record')
}

console.log('[godot_recruit_draw_result_gameplay_anchor_contract] all checks passed')
