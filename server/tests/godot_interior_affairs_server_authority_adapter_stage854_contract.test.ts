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

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:godot:interior-affairs-server-authority-adapter-stage854-contract'],
  'tsx server/tests/godot_interior_affairs_server_authority_adapter_stage854_contract.test.ts',
  'package.json must expose the Stage 854 adapter contract',
)

const backendApiClient = readUtf8('godot-client/scripts/infra/http/backend_api_client.gd')
assertIncludes(backendApiClient, 'func post_main_city_interior_work_order_action(', 'BackendApiClient')
assertIncludes(backendApiClient, '/api/world/main-city/interior/work-orders/%s/actions/%s', 'BackendApiClient')
assertIncludes(backendApiClient, '"playerId": player_id.strip_edges()', 'BackendApiClient')
assertIncludes(backendApiClient, '"cityStateId": city_state_id.strip_edges()', 'BackendApiClient')

const godotAdapter = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
assertIncludes(godotAdapter, 'func request_interior_work_order_action(city_id: String, action_id: String, queue_item_id: String) -> Dictionary:', 'Godot adapter')
assertIncludes(godotAdapter, 'post_main_city_interior_work_order_action(', 'Godot adapter')
assertIncludes(godotAdapter, '"mode": "backend_main_city_interior_work_order_action"', 'Godot adapter')
assertIncludes(godotAdapter, '"backend_capable": true', 'Godot adapter')
assertIncludes(godotAdapter, '"receiptSource": "server_interior_work_order_action"', 'Godot adapter')
assertIncludes(godotAdapter, '"readbackSchema": "main_city_interior_work_order_action_readback_v1"', 'Godot adapter')
assertIncludes(godotAdapter, '"readModelField": "work_order_action_receipts"', 'Godot adapter')
assertNotIncludes(godotAdapter, '_build_local_only_intent("interior_work_order_action"', 'Godot adapter promoted path')

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
for (const token of [
  'interiorAffairsWorkOrderServerAuthorityOk',
  'interiorAffairsWorkOrderServerReceiptSource',
  'interiorAffairsWorkOrderServerReadbackSchema',
  'interiorAffairsWorkOrderServerReadbackReceiptId',
]) {
  assertIncludes(mainSource, token, 'Godot main smoke summary')
}

const visualSmoke = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
for (const token of [
  '"interiorAffairsWorkOrderServerAuthorityOk"',
  '"interiorAffairsWorkOrderServerReceiptSource"',
  '"interiorAffairsWorkOrderServerReadbackSchema"',
  '_validate_interior_affairs_work_order_server_authority_anchor',
  'server_interior_work_order_action',
  'main_city_interior_work_order_action_readback_v1',
]) {
  assertIncludes(visualSmoke, token, 'visual smoke Stage 854 guard')
}

const registry = JSON.parse(readUtf8('ops/release-artifacts/local-dev.gameplay-anchor-registry.json')) as {
  registeredAnchors?: Array<{ stageId: number | string; anchorId: string; status: string }>
}
const stage854Anchor = registry.registeredAnchors?.find((entry) => entry.stageId === 854)
assert.ok(stage854Anchor, 'gameplay registry must include Stage 854')
assert.equal(stage854Anchor.anchorId, 'world_open_main_city_interior_affairs_press_first_action')
assert.equal(stage854Anchor.status, 'formal-green-server-authoritative')

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  gameplayAnchors?: Array<{ stageId: number | string; anchorId: string }>
  mandatoryGuards?: string[]
}
const stage854 = progress.completedStages?.find((stage) => stage.stageId === 854)
assert.ok(stage854, 'Stage 826 progress manifest must record Stage 854')
assert.equal(stage854.status, 'formal-green-server-authoritative-gameplay-anchor')
assert.ok(stage854.evidence.includes('tmp/stage854_interior_affairs_server_authority_gameplay_anchor/'))
assert.ok(
  progress.gameplayAnchors?.some(
    (anchor) => anchor.stageId === 854 && anchor.anchorId === 'world_open_main_city_interior_affairs_press_first_action',
  ),
  'Stage 854 must be listed as a gameplay anchor',
)
assert.ok(
  progress.mandatoryGuards?.includes('interior_affairs_server_authority_adapter_guard'),
  'Stage 826 must require Stage 854 guard',
)

for (const path of [
  'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
  'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md',
  'docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md',
  'docs/CLIENT_SERVER_AI_OPS_BOUNDARY_CONVERGENCE_PROGRESS_CURRENT_2026_06_17.md',
]) {
  assert.ok(existsSync(path), `missing documentation path: ${path}`)
  const source = readUtf8(path)
  assertIncludes(source, 'Stage 854', path)
  assertIncludes(source, 'interior_affairs_server_authority_adapter_guard', path)
  assertIncludes(source, 'tmp/stage854_interior_affairs_server_authority_gameplay_anchor/', path)
  assertIncludes(source, 'does not use hosted GitHub Actions evidence', path)
}

console.log('[godot_interior_affairs_server_authority_adapter_stage854_contract] all checks passed')
