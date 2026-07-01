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
  assert.ok(match, 'foundation doc must include one fenced json block')
  return JSON.parse(match[1])
}

const foundationDocPath = 'docs/GODOT_INTERIOR_AFFAIRS_SERVER_AUTHORITY_FOUNDATION_CURRENT_2026_06_18.md'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const pursuitPlanPath = 'docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md'
const stage853Guard = 'interior_affairs_server_authority_foundation_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:world:main-city-interior-work-order-action-contract'],
  'tsx server/tests/main_city_interior_work_order_action_http_contract.test.ts',
  'package.json must expose the interior work-order action HTTP contract',
)
assert.equal(
  packageJson.scripts?.['test:godot:interior-affairs-server-authority-foundation-stage853-contract'],
  'tsx server/tests/godot_interior_affairs_server_authority_foundation_stage853_contract.test.ts',
  'package.json must expose the Stage 853 foundation contract',
)

assert.ok(existsSync(foundationDocPath), `missing Stage 853 foundation doc: ${foundationDocPath}`)
const foundationDoc = readUtf8(foundationDocPath)
const foundation = extractJsonBlock(foundationDoc)
assert.equal(foundation.stage, 853)
assert.equal(foundation.foundationId, 'interior_affairs_work_order_action_server_authority_foundation')
assert.equal(foundation.route, 'POST /api/world/main-city/interior/work-orders/:queueItemId/actions/:actionId')
assert.equal(foundation.worldAction, 'interiorWorkOrderAction')
assert.equal(foundation.receiptSource, 'server_interior_work_order_action')
assert.equal(foundation.readbackSchema, 'main_city_interior_work_order_action_readback_v1')
assert.equal(foundation.readModelField, 'work_order_action_receipts')
assert.ok(foundation.nonClaims.includes('not yet a Godot gameplay anchor'))
assert.ok(foundation.nonClaims.includes('Godot adapter still needs to consume the server receipt'))

const appSource = readUtf8('server/src/app.ts')
assertIncludes(appSource, 'interiorWorkOrderActionMatch', 'server app route dispatch')
assertIncludes(appSource, '/api/world/main-city/interior/work-orders', 'server app route dispatch')
assertIncludes(appSource, 'handleMainCityInteriorWorkOrderActionRoute', 'server app route dispatch')

const routesSource = readUtf8('server/src/routes/world.ts')
assertIncludes(routesSource, 'handleMainCityInteriorWorkOrderActionRoute', 'world route handler')
assertIncludes(routesSource, 'handleMainCityInteriorWorkOrderAction({', 'world route handler')
assertIncludes(routesSource, 'playerId', 'world route handler')
assertIncludes(routesSource, 'cityStateId', 'world route handler')

const producerSource = readUtf8('server/src/application/world/mainCityInteriorReadModel.ts')
for (const token of [
  'MainCityInteriorWorkOrderActionReceipt',
  'workOrderActionReceiptsByScope',
  'handleMainCityInteriorWorkOrderAction',
  "worldAction: 'interiorWorkOrderAction'",
  "receiptSource: 'server_interior_work_order_action'",
  "schemaVersion: 'main_city_interior_work_order_action_readback_v1'",
  'work_order_action_receipts',
]) {
  assertIncludes(producerSource, token, 'main-city interior action producer')
}

const httpContract = readUtf8('server/tests/main_city_interior_work_order_action_http_contract.test.ts')
for (const token of [
  '/api/world/main-city/interior/work-orders/',
  'interiorWorkOrderAction',
  'server_interior_work_order_action',
  'main_city_interior_work_order_action_readback_v1',
  'work_order_action_receipts',
  'interior_work_order_action_mismatch',
]) {
  assertIncludes(httpContract, token, 'HTTP contract')
}

const godotAdapter = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
assertIncludes(godotAdapter, 'post_main_city_interior_work_order_action(', 'Godot adapter Stage 854 promotion')
assertIncludes(godotAdapter, '"mode": "backend_main_city_interior_work_order_action"', 'Godot adapter Stage 854 promotion')

const progress = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  gameplayAnchors?: Array<{ stageId: number | string }>
  mandatoryGuards?: string[]
}
const stage853 = progress.completedStages?.find((stage) => stage.stageId === 853)
assert.ok(stage853, 'Stage 826 progress manifest must record Stage 853')
assert.equal(stage853.status, 'formal-green-server-authority-foundation')
assert.ok(stage853.evidence.includes(foundationDocPath))
assert.ok(stage853.evidence.includes('server/tests/main_city_interior_work_order_action_http_contract.test.ts'))
assert.equal(progress.gameplayAnchors?.some((anchor) => anchor.stageId === 853), false, 'Stage 853 foundation must not be listed as a gameplay anchor')
assert.ok(progress.mandatoryGuards?.includes(stage853Guard), 'Stage 826 must require Stage 853 guard')

for (const [path, label] of [
  [currentPath, 'CURRENT handoff'],
  [splitTargetPath, 'split target'],
  [megaPlanPath, 'mega plan'],
  [pursuitPlanPath, 'local gameplay anchor pursuit plan'],
] as const) {
  const source = readUtf8(path)
  assertIncludes(source, 'Stage 853', label)
  assertIncludes(source, 'interior_affairs_work_order_action_server_authority_foundation', label)
  assertIncludes(source, 'server_interior_work_order_action', label)
  assertIncludes(source, 'not yet a Godot gameplay anchor', label)
}

console.log('[godot_interior_affairs_server_authority_foundation_stage853_contract] all checks passed')
