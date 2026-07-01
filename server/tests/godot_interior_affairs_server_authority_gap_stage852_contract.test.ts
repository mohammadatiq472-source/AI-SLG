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
  assert.ok(match, 'gap doc must include one fenced json block')
  return JSON.parse(match[1])
}

const gapDocPath = 'docs/GODOT_INTERIOR_AFFAIRS_SERVER_AUTHORITY_GAP_CURRENT_2026_06_18.md'
const stage816DocPath = 'docs/GODOT_MAIN_CITY_INTERIOR_AFFAIRS_ACTION_BOUNDARY_CURRENT_2026_06_17.md'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const registryPath = 'ops/release-artifacts/local-dev.gameplay-anchor-registry.json'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const splitTargetPath = 'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const pursuitPlanPath = 'docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md'
const stage852Guard = 'interior_affairs_server_authority_gap_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:godot:interior-affairs-server-authority-gap-stage852-contract'],
  'tsx server/tests/godot_interior_affairs_server_authority_gap_stage852_contract.test.ts',
  'package.json must expose the Stage 852 interior affairs server-authority gap contract',
)

assert.ok(existsSync(gapDocPath), `missing Stage 852 gap doc: ${gapDocPath}`)
const gapDoc = readUtf8(gapDocPath)
assertIncludes(gapDoc, 'Status: current Stage 852 server-authority gap guard', 'gap doc status')
assertIncludes(gapDoc, 'does not prove a server mutation or server receipt', 'gap doc non-claim')
const gap = extractJsonBlock(gapDoc)
assert.equal(gap.status, 'current Stage 852 server-authority gap guard')
assert.equal(gap.stage, 852)
assert.equal(gap.gapId, 'interior_affairs_work_order_action_server_authority_gap')
assert.equal(gap.currentBoundaryAnchor, 'world_open_main_city_interior_affairs_press_first_action')
assert.equal(gap.currentBoundaryStage, 816)
assert.equal(gap.currentStatus, 'boundary-green-not-server-authoritative')
assert.equal(gap.blockedPromotion, 'formal-gameplay-anchor')
assert.equal(gap.requiredBeforePromotion.serverRoute, 'POST /api/world/main-city/interior/work-orders/:queueItemId/actions/:actionId')
assert.equal(gap.requiredBeforePromotion.godotSummary, 'interiorAffairsWorkOrderServerAuthorityOk=true')
assert.equal(gap.currentEvidence.adapterMode, 'local_only_intent')
for (const nonClaim of [
  'not a server-authoritative gameplay anchor',
  'not a server mutation proof',
  'not a server receipt proof',
  'not hosted GitHub Actions evidence',
]) {
  assert.ok(gap.nonClaims.includes(nonClaim), `gap doc non-claims must include ${nonClaim}`)
}

const stage816Doc = readUtf8(stage816DocPath)
assertIncludes(stage816Doc, 'not a server-authoritative gameplay anchor yet', 'Stage 816 boundary doc')
assertIncludes(stage816Doc, 'implement_server_world_action_and_receipt_for_interiorWorkOrderAction', 'Stage 816 required-before-green')
assertIncludes(stage816Doc, 'interiorWorkOrderAction', 'Stage 816 local receipt source')

const appSource = readUtf8('godot-client/scripts/app/main.gd')
assertIncludes(appSource, '"world_open_main_city_interior_affairs_press_first_action":', 'Godot dispatch')
assertIncludes(appSource, 'receipt_source == "interiorWorkOrderAction"', 'Godot local receipt check')
assertIncludes(appSource, 'interiorAffairsWorkOrderActionClickVerified', 'Godot local boundary summary')
assertIncludes(appSource, 'interiorAffairsWorkOrderServerAuthorityOk', 'Godot Stage 854 server-authority summary')

const interiorPanelSource = readUtf8('godot-client/scripts/ui/interior_panel.gd')
assertIncludes(interiorPanelSource, 'work_order_action_requested.emit(action_id, queue_item_id)', 'InteriorPanel action signal')
assertIncludes(interiorPanelSource, 'trigger_first_work_order_action_for_visual_smoke', 'InteriorPanel visual-smoke trigger')

const adapterSource = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
assertIncludes(adapterSource, 'func request_interior_work_order_action(city_id: String, action_id: String, queue_item_id: String) -> Dictionary:', 'Godot adapter function')
assertIncludes(adapterSource, 'post_main_city_interior_work_order_action(', 'Godot adapter Stage 854 server route call')
assertIncludes(adapterSource, 'world_action_intent["action_name"] = "interiorWorkOrderAction"', 'Godot adapter action name')

const foundationDoc = readUtf8('docs/GODOT_INTERIOR_AFFAIRS_SERVER_AUTHORITY_FOUNDATION_CURRENT_2026_06_18.md')
assertIncludes(foundationDoc, 'interior_affairs_work_order_action_server_authority_foundation', 'Stage 853 foundation doc')
assertIncludes(foundationDoc, 'not yet a Godot gameplay anchor', 'Stage 853 foundation doc')

const registry = JSON.parse(readUtf8(registryPath)) as {
  registeredAnchors?: Array<{ stageId: number | string; anchorId: string; anchorClass: string; status: string; nonClaims: string[] }>
}
const stage816 = registry.registeredAnchors?.find((entry) => entry.stageId === 816)
assert.ok(stage816, 'registry must keep Stage 816 visible')
assert.equal(stage816.anchorId, 'world_open_main_city_interior_affairs_press_first_action')
assert.equal(stage816.anchorClass, 'boundary-proof-anchor')
assert.equal(stage816.status, 'boundary-green-not-server-authoritative')
assert.ok(stage816.nonClaims.includes('not a server-authoritative gameplay anchor'), 'Stage 816 registry non-claim must remain narrow')
const stage854 = registry.registeredAnchors?.find((entry) => entry.stageId === 854)
assert.ok(stage854, 'registry must record Stage 854 as the formal promotion')
assert.equal(stage854.anchorId, 'world_open_main_city_interior_affairs_press_first_action')
assert.equal(stage854.status, 'formal-green-server-authoritative')
assert.equal(
  registry.registeredAnchors?.some((entry) => entry.stageId === 852 || entry.anchorId === 'interior_affairs_work_order_action_server_authority'),
  false,
  'Stage 852 gap guard must not register a fake gameplay anchor',
)

const progress = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  gameplayAnchors?: Array<{ stageId: number | string; anchorId: string }>
  mandatoryGuards?: string[]
}
const stage852 = progress.completedStages?.find((stage) => stage.stageId === 852)
assert.ok(stage852, 'Stage 826 progress manifest must record Stage 852')
assert.equal(stage852.status, 'formal-green-static-server-authority-gap')
assert.ok(stage852.evidence.includes(gapDocPath), 'Stage 852 evidence must include the gap doc')
assert.ok(stage852.evidence.includes('server/tests/godot_interior_affairs_server_authority_gap_stage852_contract.test.ts'))
assert.equal(progress.gameplayAnchors?.some((anchor) => anchor.stageId === 852), false, 'Stage 852 must not be listed as a gameplay anchor')
assert.ok(progress.mandatoryGuards?.includes(stage852Guard), 'Stage 826 must require Stage 852 guard')

for (const [path, label] of [
  [currentPath, 'CURRENT handoff'],
  [splitTargetPath, 'split target'],
  [megaPlanPath, 'mega plan'],
  [pursuitPlanPath, 'local gameplay anchor pursuit plan'],
] as const) {
  const source = readUtf8(path)
  assertIncludes(source, 'Stage 852', label)
  assertIncludes(source, 'interior_affairs_work_order_action_server_authority_gap', label)
  assertIncludes(source, 'world_open_main_city_interior_affairs_press_first_action', label)
  assertIncludes(source, 'not a server-authoritative gameplay anchor', label)
}

console.log('[godot_interior_affairs_server_authority_gap_stage852_contract] all checks passed')
