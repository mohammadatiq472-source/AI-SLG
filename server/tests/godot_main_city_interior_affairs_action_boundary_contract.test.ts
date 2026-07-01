import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function assertNotIncludes(source: string, token: string, label: string): void {
  assert.ok(!source.includes(token), `${label} must not include ${token}`)
}

function extractJsonBlock(source: string): any {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'boundary doc must include one fenced json block')
  return JSON.parse(match[1])
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const next = source.indexOf('\nfunc ', start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const docPath = 'docs/GODOT_MAIN_CITY_INTERIOR_AFFAIRS_ACTION_BOUNDARY_CURRENT_2026_06_17.md'
const clickAction = 'world_open_main_city_interior_affairs_press_first_action'
const probeCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_open_main_city_interior_affairs_press_first_action --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --evidence-dir tmp/stage816_interior_affairs_action_probe'

const packageJson = JSON.parse(readUtf8('package.json'))
assert.equal(
  packageJson.scripts?.['test:godot:main-city-interior-affairs-action-boundary-contract'],
  'tsx server/tests/godot_main_city_interior_affairs_action_boundary_contract.test.ts',
  'package.json must expose the Stage 816 interior affairs boundary contract',
)

assert.ok(existsSync(docPath), `missing Stage 816 interior affairs boundary doc: ${docPath}`)
const boundaryDoc = readUtf8(docPath)
assertIncludes(boundaryDoc, 'Status: current Stage 816 boundary proof', 'boundary doc status')
assertIncludes(boundaryDoc, 'not a server-authoritative gameplay anchor yet', 'boundary doc no-false-claim phrase')

const boundary = extractJsonBlock(boundaryDoc)
assert.equal(boundary.status, 'current Stage 816 boundary proof')
assert.equal(boundary.stage, 816)
assert.equal(boundary.anchorId, 'main_city_interior_affairs_work_order_action')
assert.equal(boundary.clickAction, clickAction)
assert.equal(boundary.serverAuthority.status, 'blocked_missing_server_world_action')
assert.equal(boundary.serverAuthority.serverAuthorityGreen, false)
assert.equal(boundary.serverAuthority.requiredBeforeGreen, 'implement_server_world_action_and_receipt_for_interiorWorkOrderAction')
assert.equal(boundary.localReceipt.sourceAction, 'interiorWorkOrderAction')
assert.equal(boundary.localReceipt.remoteAttempted, false)
assert.equal(boundary.localReceipt.remoteApplied, false)
assert.equal(boundary.evidence.probeCommand, probeCommand)
assert.equal(boundary.evidence.summaryPath, 'tmp/stage816_interior_affairs_action_probe/mainline_visual_smoke_summary.json')
assert.equal(boundary.evidence.screenshotPath, 'tmp/stage816_interior_affairs_action_probe/01_after_world_open_main_city_interior_affairs_press_first_action.png')

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/interior_panel.gd',
  'godot-client/scripts/app/adapters/slg_domain_action_adapter.gd',
  'godot-client/scripts/app/overlay_runtime_helper.gd',
]) {
  assert.ok(boundary.ownership.clientOwned.includes(clientFile), `boundary client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/app.ts',
  'server/src/application/world/mainCityInteriorReadModel.ts',
  'server/tests/main_city_interior_read_model_http_contract.test.ts',
]) {
  assert.ok(boundary.ownership.serverOwnedReadOnly.includes(serverFile), `boundary server read ownership must include ${serverFile}`)
}

for (const requiredField of [
  'interiorAffairsWorkOrderActionClickVerified',
  'interiorAffairsWorkOrderActionReceiptSource',
  'interiorAffairsWorkOrderActionClickedQueueItemId',
  'interiorAffairsWorkOrderActionClickedActionId',
  'interiorAffairsWorkOrderActionClickedLabel',
  'interiorAffairsWorkOrderActionClickedToken',
  'interiorAffairsWorkOrderActionClickedLiveTextContract',
]) {
  assert.ok(boundary.requiredGodotFields.includes(requiredField), `boundary Godot fields must include ${requiredField}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(mainSource, `"${clickAction}":`, 'Godot click action dispatch')
const firstWorkOrderWrapper = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_main_city_interior_first_work_order_action() -> Dictionary:',
)
for (const requiredToken of [
  'trigger_first_work_order_action_for_visual_smoke',
  'receipt_source == "interiorWorkOrderAction"',
  'interiorAffairsWorkOrderActionClickVerified',
  'interior_work_order_action_adapter_verified',
]) {
  assertIncludes(firstWorkOrderWrapper, requiredToken, 'Godot interior affairs first work order wrapper')
}

const interiorPanelSource = readUtf8('godot-client/scripts/ui/interior_panel.gd')
for (const requiredToken of [
  'signal work_order_action_requested(action_id: String, queue_item_id: String)',
  'INTERIOR_WORK_ORDER_ACTION_BUTTON_TOKEN := "interior_work_order_action_button_v1"',
  'INTERIOR_WORK_ORDER_ACTION_LIVE_TEXT_CONTRACT := "interior_work_order_action_live_text_v1"',
  'trigger_first_work_order_action_for_visual_smoke',
  'work_order_action_requested.emit(action_id, queue_item_id)',
]) {
  assertIncludes(interiorPanelSource, requiredToken, 'Godot interior panel work order action UI')
}

const overlayHelperSource = readUtf8('godot-client/scripts/app/overlay_runtime_helper.gd')
assertIncludes(overlayHelperSource, '"request_interior_work_order_action"', 'overlay helper interior work order binding')

const adapterSource = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
const adapterFunction = functionSource(
  adapterSource,
  'func request_interior_work_order_action(city_id: String, action_id: String, queue_item_id: String) -> Dictionary:',
)
for (const requiredAdapterToken of [
  '_build_local_only_intent("interior_work_order_action"',
  'world_action_intent["action_name"] = "interiorWorkOrderAction"',
  '"remote_attempted": false',
  '"remote_applied": false',
  '"worldAction": "interiorWorkOrderAction"',
]) {
  assertIncludes(adapterFunction, requiredAdapterToken, 'Godot interior work order adapter local-only receipt')
}

const serverRouteSource = readUtf8('server/src/routes/world.ts')
const worldServiceSource = readUtf8('server/src/application/world/WorldService.ts')
const worldActionSchemaSource = readUtf8('shared/schemas/worldAction.ts')
for (const [source, label] of [
  [serverRouteSource, 'server world route'],
  [worldServiceSource, 'world service'],
  [worldActionSchemaSource, 'shared world action schema'],
] as const) {
  assertNotIncludes(source, 'interiorWorkOrderAction', label)
}

const appSource = readUtf8('server/src/app.ts')
assertIncludes(appSource, "'/api/world/main-city/interior'", 'server read endpoint for interior read model')

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 816',
  docPath,
  'not a server-authoritative gameplay anchor yet',
  'world_open_main_city_interior_affairs_press_first_action',
]) {
  assertIncludes(currentHandoff, token, 'CURRENT handoff Stage 816 boundary record')
}

console.log('[godot_main_city_interior_affairs_action_boundary_contract] all checks passed')
