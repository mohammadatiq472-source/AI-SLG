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
  assert.ok(match, 'anchor doc must include one fenced json block')
  return JSON.parse(match[1])
}

function blockSource(source: string, signature: string, nextMarker: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing block ${signature}`)
  const next = source.indexOf(nextMarker, start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const anchorDocPath = 'docs/GODOT_WORLD_AFFAIRS_CLAIM_REWARD_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const clickAction = 'world_affairs_claim_reward'
const formalCommand =
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_affairs_claim_reward --window-width 1920 --window-height 1080 --isolated-backend-state --seed-world-affairs-claimable-node --timeout-sec 280 --backend-timeout-sec 180 --evidence-dir tmp/stage818_world_affairs_claim_reward_gameplay_anchor'

const packageJson = JSON.parse(readUtf8('package.json'))
assert.equal(
  packageJson.scripts?.['test:godot:world-affairs-claim-reward-gameplay-anchor-contract'],
  'tsx server/tests/godot_world_affairs_claim_reward_gameplay_anchor_contract.test.ts',
  'package.json must expose the Stage 818 world-affairs claim reward gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing Stage 818 world-affairs claim reward gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot world-affairs claim reward gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 818', 'anchor doc stage marker')
assertIncludes(anchorDoc, 'client-visible world-affairs cache is not server truth', 'anchor doc client authority boundary')
assertIncludes(anchorDoc, 'server receipt owns `claimWorldAffairsNodeReward`', 'anchor doc server authority summary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot world-affairs claim reward gameplay anchor')
assert.equal(anchor.stage, 818)
assert.equal(anchor.anchorId, 'world_affairs_claim_reward')
assert.equal(anchor.clickAction, clickAction)
assert.equal(anchor.playerVisibleSurface, 'world_affairs_claimable_node_reward')
assert.equal(anchor.formalCommand, formalCommand)
assert.equal(anchor.serverAuthority.seedWorldAction, 'achieveWorldAffairsNode')
assert.equal(anchor.serverAuthority.claimWorldAction, 'claimWorldAffairsNodeReward')
assert.equal(anchor.serverAuthority.receiptRefreshEndpoint, '/api/world/world-affairs')
assert.equal(anchor.boundary.clientVisibleCacheIsTruth, false)
assert.equal(anchor.boundary.serverReceiptIsTruth, true)
assert.equal(anchor.boundary.aiReadsGodotCache, false)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/world_event_activity_panel.gd',
  'godot-client/scripts/ui/presenters/world_event_activity_presenter.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/routes/world.ts',
  'server/src/application/world/WorldService.ts',
  'shared/schemas/worldAction.ts',
  'shared/domain/rules.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/world_affairs_read_model_http_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredAiReadBoundary of [
  'AI-read only through approved server subject/input packets',
  'no Godot cache authority',
  'no private sourceRefs',
  'no provider key',
  'no restore token',
  'no persistence path',
]) {
  assert.ok(anchor.ownership.aiRead.includes(requiredAiReadBoundary), `anchor AI-read boundary must include ${requiredAiReadBoundary}`)
}

for (const requiredGodotField of [
  'worldAffairsClaimRewardGameplayAnchorOk',
  'worldAffairsClaimRewardRemoteApplied',
  'worldAffairsClaimRewardReadModelRefreshed',
  'worldAffairsClaimRewardClaimedNodeId',
  'worldAffairsClaimRewardTriggerMode',
  'worldAffairsClaimRewardAfterClaimState',
  'worldAffairsClaimRewardCanClaimAfter',
  'worldAffairsClaimRewardForbiddenCopyClear',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage818_world_affairs_claim_reward_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage818_world_affairs_claim_reward_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath: 'tmp/stage818_world_affairs_claim_reward_gameplay_anchor/01_after_world_affairs_claim_reward.png',
})

for (const command of [
  'npm.cmd run ops:service-process-guard',
  'npm.cmd run test:godot:world-affairs-claim-reward-gameplay-anchor-contract',
  'npx.cmd tsx server/tests/world_affairs_read_model_http_contract.test.ts',
  formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const presenterSource = readUtf8('godot-client/scripts/ui/presenters/world_event_activity_presenter.gd')
const worldAffairsPageBuilder = blockSource(
  presenterSource,
  'func _build_world_affairs_page_from_read_model(read_model: Dictionary) -> Dictionary:',
  '\nfunc ',
)
for (const forbiddenVisibleCopy of [
  '后端 read model',
  'GET /api',
  '/api/world/world-affairs',
  'read model',
  'backend',
  'authority',
  'contract id',
]) {
  assertNotIncludes(worldAffairsPageBuilder, forbiddenVisibleCopy, 'Godot world-affairs player visible read-model page')
}
for (const requiredPlayerCopy of ['天下大势', '大势进展', '奖励预览', '可领取']) {
  assertIncludes(worldAffairsPageBuilder, requiredPlayerCopy, 'Godot world-affairs player visible copy')
}

const panelSource = readUtf8('godot-client/scripts/ui/world_event_activity_panel.gd')
const claimHelper = blockSource(panelSource, 'func _claim_world_affairs_node_reward(node_id: String) -> void:', '\nfunc ')
for (const requiredPanelToken of [
  'WORLD_AFFAIRS_ACTION_PATH',
  '"claimWorldAffairsNodeReward"',
  'WorldStore.set_world',
  'await _fetch_world_affairs_read_model()',
]) {
  assertIncludes(claimHelper, requiredPanelToken, 'Godot world-affairs claim helper')
}
const claimPayload = blockSource(panelSource, 'func _build_world_affairs_claim_payload(node_id: String) -> Dictionary:', '\nfunc ')
for (const requiredPayloadToken of ['"factionId": "player"', '"scenarioId": scenario_id', '"scenarioVersion": scenario_version', '"seasonRunId": season_run_id', '"nodeId": normalized_node_id']) {
  assertIncludes(claimPayload, requiredPayloadToken, 'Godot world-affairs claim payload')
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const dispatchSource = blockSource(
  mainSource,
  'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:',
  '\nfunc ',
)
assertIncludes(dispatchSource, `"${clickAction}":`, 'Godot world-affairs claim click action dispatch')
const claimWrapper = blockSource(mainSource, 'func _press_mainline_visual_smoke_world_affairs_claim_reward(panel_id: String) -> Dictionary:', '\nfunc ')
for (const requiredMainToken of [
  'WorldAffairsClaimButton',
  'world_affairs_claim:',
  '"claimed"',
  'worldAffairsClaimRewardGameplayAnchorOk',
  'worldAffairsClaimRewardRemoteApplied',
  'worldAffairsClaimRewardReadModelRefreshed',
  'worldAffairsClaimRewardClaimedNodeId',
  'worldAffairsClaimRewardTriggerMode',
  'worldAffairsClaimRewardAfterClaimState',
  'worldAffairsClaimRewardCanClaimAfter',
  'worldAffairsClaimRewardForbiddenCopyClear',
]) {
  assertIncludes(claimWrapper, requiredMainToken, 'Godot world-affairs claim wrapper')
}

const smokeRunnerSource = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
for (const requiredRunnerToken of [
  clickAction,
  '--seed-world-affairs-claimable-node',
  '_seed_world_affairs_claimable_node_fixture',
  '"achieveWorldAffairsNode"',
  'seed_world_affairs_claimable_node_fixture',
  '_validate_world_affairs_claim_reward_gameplay_anchor',
  'worldAffairsClaimRewardGameplayAnchorOk',
  'worldAffairsClaimRewardRemoteApplied',
  'worldAffairsClaimRewardReadModelRefreshed',
  'worldAffairsClaimRewardTriggerMode',
]) {
  assertIncludes(smokeRunnerSource, requiredRunnerToken, 'Godot visual smoke world-affairs claim runner')
}

const worldServiceSource = readUtf8('server/src/application/world/WorldService.ts')
const worldServiceClaim = blockSource(worldServiceSource, 'export function claimWorldAffairsNodeRewardAction(', '\nexport function ')
for (const requiredServiceToken of [
  'claimWorldAffairsNodeReward',
  'commitWorldState(result.world)',
  'appendWorldEvent',
  'claim_world_affairs_node_reward',
  'rewardTotals',
]) {
  assertIncludes(worldServiceClaim, requiredServiceToken, 'server world-affairs claim authority')
}

const backendContract = readUtf8('server/tests/world_affairs_read_model_http_contract.test.ts')
for (const requiredBackendToken of [
  "action: 'achieveWorldAffairsNode'",
  "action: 'claimWorldAffairsNodeReward'",
  "claimState, 'claimable'",
  "claimState, 'claimed'",
  'factionAfterClaim.food, factionBeforeClaim.food + 1200',
  'world_affairs_node_already_claimed',
]) {
  assertIncludes(backendContract, requiredBackendToken, 'server world-affairs read model HTTP contract')
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
assertIncludes(currentHandoff, '## Stage 818 - Godot World-Affairs Claim Reward Gameplay Anchor', 'CURRENT Stage 818 section')
assertIncludes(currentHandoff, formalCommand, 'CURRENT Stage 818 formal command')
assertIncludes(currentHandoff, 'client-visible world-affairs cache is not server truth', 'CURRENT Stage 818 boundary')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 818 adds the world-affairs claim reward gameplay anchor', 'split target Stage 818 record')
assertIncludes(splitTarget, 'claimWorldAffairsNodeReward', 'split target Stage 818 server action')
