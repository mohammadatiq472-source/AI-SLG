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

const anchorDocPath = 'docs/GODOT_INBOX_LIVE_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const packageJson = JSON.parse(readUtf8('package.json'))

assert.equal(
  packageJson.scripts?.['test:godot:inbox-live-gameplay-anchor-contract'],
  'tsx server/tests/godot_inbox_live_gameplay_anchor_contract.test.ts',
  'package.json must expose the inbox live gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing inbox live gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot inbox live gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 812', 'anchor doc stage marker')
assertIncludes(anchorDoc, '/api/inbox', 'anchor doc server route')
assertIncludes(anchorDoc, 'not a full reward-claim settlement proof', 'anchor doc scope boundary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot inbox live gameplay anchor')
assert.equal(anchor.stage, 812)
assert.equal(anchor.anchorId, 'inbox_live_mail_readback')
assert.equal(anchor.clickAction, 'world_open_main_city_mail_live_inbox_proof')
assert.equal(anchor.playerVisibleSurface, 'mail_live_inbox')
assert.equal(
  anchor.formalCommand,
  'npm.cmd run godot:mainline:visual-smoke -- --click-action world_open_main_city_mail_live_inbox_proof --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 260 --backend-timeout-sec 160 --evidence-dir tmp/stage812_inbox_live_gameplay_anchor',
)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/mail_panel.gd',
  'godot-client/scripts/ui/presenters/mail_presenter.gd',
  'godot-client/scripts/ui/slg_snapshot_section_page.gd',
  'godot-client/scripts/infra/http/backend_api_client.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/routes/inbox.ts',
  'server/src/application/inbox/UnifiedInboxService.ts',
  'shared/contracts/inbox.ts',
  'shared/schemas/inbox.ts',
  'server/src/application/world/WorldService.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/godot_inbox_mail_live_screenshot_proof_contract.test.ts',
  'server/tests/world_unified_inbox_http_contract.test.ts',
  'server/tests/world_governor_resource_inbox_http_contract.test.ts',
  'server/tests/godot_unified_inbox_cache_invalidation_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredGodotField of [
  'inboxMailLiveScreenshotProofOk',
  'liveInboxRoute',
  'liveInboxReadbackOk',
  'liveInboxSeededForProof',
  'mailPanelLiveInboxWired',
  'mailPanelLiveInboxVisibleItemCount',
  'mailPanelLiveInboxRowButtonClicked',
  'visualAcceptanceClaimedSurfaces',
  'playerVisibleEngineeringCopyLeak',
  'styleOwner',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

for (const requiredRouteField of [
  'ok',
  'factionId',
  'governorPlayerId',
  'items',
  'count',
  'countsByKind',
  'itemId',
  'kind',
  'claimAction',
  'claimPayload',
]) {
  assert.ok(anchor.requiredServerRouteFields.includes(requiredRouteField), `anchor server route fields must include ${requiredRouteField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage812_inbox_live_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage812_inbox_live_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath: 'tmp/stage812_inbox_live_gameplay_anchor/01_after_world_open_main_city_mail_live_inbox_proof.png',
})

for (const command of [
  'npm.cmd run test:godot:inbox-live-gameplay-anchor-contract',
  'npx.cmd tsx server/tests/godot_inbox_mail_live_screenshot_proof_contract.test.ts',
  'npm.cmd run test:world:unified-inbox-http-contract',
  'npm.cmd run test:world:governor-resource-inbox-http-contract',
  'npm.cmd run test:godot:unified-inbox-cache-invalidation-contract',
  anchor.formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const dispatchSource = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
assertIncludes(dispatchSource, '"world_open_main_city_mail_live_inbox_proof":', 'Godot click-action dispatch')
assertIncludes(
  dispatchSource,
  'return await _press_mainline_visual_smoke_mail_live_inbox_proof(panel_id)',
  'Godot click-action dispatch',
)

const liveInboxWrapper = functionSource(mainSource, 'func _press_mainline_visual_smoke_mail_live_inbox_proof(panel_id: String) -> Dictionary:')
for (const requiredMainToken of [
  '_request_mainline_visual_smoke_mail_live_inbox_readback()',
  'build_live_inbox_overlay_payload',
  'mailPanelLiveInboxRowButtonClicked',
  'inboxMailLiveScreenshotProofOk',
  'playerVisibleEngineeringCopyLeak',
  'MailPresenter + MailPanel + SlgSnapshotSectionPage mail row Button',
]) {
  assertIncludes(liveInboxWrapper, requiredMainToken, 'Godot inbox live proof wrapper')
}

const liveInboxReadback = functionSource(mainSource, 'func _request_mainline_visual_smoke_mail_live_inbox_readback() -> Dictionary:')
for (const requiredReadbackToken of [
  'get_unified_inbox',
  '"/api/inbox/daily-welfare"',
  '"liveInboxCount"',
  '"seededForProof"',
]) {
  assertIncludes(liveInboxReadback, requiredReadbackToken, 'Godot live inbox readback')
}

const runner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
for (const requiredRunnerToken of [
  '"world_open_main_city_mail_live_inbox_proof"',
  '_validate_inbox_mail_live_screenshot_contract',
  '"inboxMailLiveScreenshotProofOk"',
  '"liveInboxRoute"',
  '"visualAcceptanceClaimedSurfaces"',
  'liveInboxRoute!=/api/inbox',
]) {
  assertIncludes(runner, requiredRunnerToken, 'visual smoke runner inbox gate')
}

const backendApiClient = readUtf8('godot-client/scripts/infra/http/backend_api_client.gd')
for (const requiredClientBoundaryToken of [
  'func get_unified_inbox',
  'return await request_json("GET", "/api/inbox%s" % query)',
  'if request_path.begins_with("/api/inbox")',
  'boundary["readPacketKind"] = "unified_inbox_read_model"',
  'boundary["cacheInvalidationRule"] = "reject_out_of_order_mailbox_refresh"',
]) {
  assertIncludes(backendApiClient, requiredClientBoundaryToken, 'BackendApiClient inbox route/cache boundary')
}

const presenter = readUtf8('godot-client/scripts/ui/presenters/mail_presenter.gd')
const panel = readUtf8('godot-client/scripts/ui/mail_panel.gd')
const sectionPage = readUtf8('godot-client/scripts/ui/slg_snapshot_section_page.gd')
for (const requiredUiToken of [
  'build_live_inbox_overlay_payload',
  'live_unified_inbox_route',
  'live_route_readback_player_visible_copy_translated',
  'mailPanelRowSelectButtonVisibleCount',
  'mailPanelRowSelectActionIds',
  'MailInboxItemButton_',
]) {
  assert.ok(
    presenter.includes(requiredUiToken) || panel.includes(requiredUiToken) || sectionPage.includes(requiredUiToken),
    `mail UI owner must include ${requiredUiToken}`,
  )
}

const inboxRoutes = readUtf8('server/src/routes/inbox.ts')
for (const requiredRouteToken of [
  "pathname === '/api/inbox'",
  'listUnifiedInbox({ factionId, governorPlayerId })',
  "pathname === '/api/inbox/claim'",
  "pathname === '/api/inbox/daily-welfare'",
  "pathname === '/api/inbox/event-reward'",
]) {
  assertIncludes(inboxRoutes, requiredRouteToken, 'server inbox routes')
}

const inboxService = readUtf8('server/src/application/inbox/UnifiedInboxService.ts')
for (const requiredServiceToken of [
  'export function listUnifiedInbox',
  'export function claimUnifiedInboxItem',
  'export function issueDailyWelfare',
  'recordUnifiedInboxClaimInChat',
  "claimAction: 'claimGovernorResourceInbox'",
]) {
  assertIncludes(inboxService, requiredServiceToken, 'server unified inbox authority')
}

const inboxContract = readUtf8('shared/contracts/inbox.ts')
for (const requiredContractToken of [
  'export type UnifiedInboxItem',
  'export type UnifiedInboxListResponse',
  'items: UnifiedInboxItem[]',
  'count: number',
  'countsByKind: Record<UnifiedInboxItemKind, number>',
  'claimPayload: Record<string, unknown>',
]) {
  assertIncludes(inboxContract, requiredContractToken, 'shared inbox contract')
}

const aiSubjectReadModel = readUtf8('server/src/application/ai/aiPlayerSubjectReadModel.ts')
for (const requiredAiReadToken of [
  'governorResourceInboxes',
  'pendingTransfers',
]) {
  assertIncludes(aiSubjectReadModel, requiredAiReadToken, 'AI subject approved inbox read model')
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredHandoffToken of [
  'Stage 812 - Godot Inbox Live Gameplay Anchor',
  'tmp/stage812_inbox_live_gameplay_anchor/01_after_world_open_main_city_mail_live_inbox_proof.png',
  'npm.cmd run test:godot:inbox-live-gameplay-anchor-contract',
]) {
  assertIncludes(currentHandoff, requiredHandoffToken, 'CURRENT handoff Stage 812')
}

for (const docPath of [
  'docs/CLIENT_SERVER_AI_AUTHORITY_INVENTORY_CURRENT_2026_06_15.md',
  'docs/CLIENT_SERVER_AI_AUTHORITY_BOUNDARY_PLAN_CURRENT_2026_06_15.md',
  'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md',
  'docs/superpowers/plans/2026-06-16-client-server-ai-ops-release-lane-roadmap.md',
]) {
  const source = readUtf8(docPath)
  assertIncludes(source, 'Stage 812', `${docPath} Stage 812 record`)
  assertIncludes(source, anchorDocPath, `${docPath} anchor doc link`)
}

console.log('[godot_inbox_live_gameplay_anchor_contract] all checks passed')
