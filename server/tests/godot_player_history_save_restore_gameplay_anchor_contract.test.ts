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

const anchorDocPath = 'docs/GODOT_PLAYER_HISTORY_SAVE_RESTORE_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const packageJson = JSON.parse(readUtf8('package.json'))

assert.equal(
  packageJson.scripts?.['test:godot:player-history-save-restore-gameplay-anchor-contract'],
  'tsx server/tests/godot_player_history_save_restore_gameplay_anchor_contract.test.ts',
  'package.json must expose the player-history save-restore gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing player-history save-restore gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(
  anchorDoc,
  'Status: current Godot player-history save-restore gameplay anchor',
  'anchor doc status',
)
assertIncludes(anchorDoc, 'Stage 810', 'anchor doc stage marker')
assertIncludes(anchorDoc, 'through `/api/player-history.saveLoad`', 'anchor doc authority summary')
assertIncludes(anchorDoc, 'not a direct Godot runtime `/api/save-slots` consumer', 'anchor doc direct route boundary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot player-history save-restore gameplay anchor')
assert.equal(anchor.stage, 810)
assert.equal(anchor.anchorId, 'player_history_seeded_save_restore_panel_open')
assert.equal(anchor.clickAction, 'player_history_seeded_save_restore_panel_open')
assert.equal(anchor.playerVisibleSurface, 'player_history_save_load')
assert.equal(
  anchor.formalCommand,
  'npm.cmd run godot:mainline:visual-smoke -- --click-action player_history_seeded_save_restore_panel_open --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 260 --backend-timeout-sec 160 --evidence-dir tmp/stage810_player_history_save_restore_gameplay_anchor',
)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/ui/player_history_panel.gd',
  'godot-client/scripts/infra/http/backend_api_client.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/app.ts',
  'server/src/application/world/WorldService.ts',
  'server/src/routes/playerHistory.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/godot_player_history_save_restore_seed_auth_contract.test.ts',
  'server/tests/godot_player_history_save_restore_visual_smoke_contract.test.ts',
  'server/tests/godot_save_slots_direct_consumer_boundary_contract.test.ts',
  'server/tests/player_history_save_load_restore_apply_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredSeedField of [
  'sessionTokenPresent',
  'save',
  'historySaveSlotCount',
  'historyRestoreRiskLabel',
  'historyRestoreFeedbackLabel',
  'matchingSlot',
]) {
  assert.ok(anchor.requiredSeedFields.includes(requiredSeedField), `anchor seed fields must include ${requiredSeedField}`)
}

for (const requiredGodotField of [
  'saveRestorePrepared',
  'saveRestoreFocusScrolled',
  'saveRestoreSelectedSlotLabel',
  'saveRestoreSelectedSavedAtLabel',
  'saveRestoreSelectedRiskLabel',
  'saveRestoreSelectedPreviewLabel',
  'dedicatedReplayScreenOpen',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage810_player_history_save_restore_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage810_player_history_save_restore_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath:
    'tmp/stage810_player_history_save_restore_gameplay_anchor/01_after_player_history_seeded_save_restore_panel_open.png',
})

for (const command of [
  'npm.cmd run test:godot:player-history-save-restore-gameplay-anchor-contract',
  'npm.cmd run test:godot:player-history-save-restore-seed-auth-contract',
  'npm.cmd run test:godot:player-history-save-restore-visual-smoke-contract',
  'npm.cmd run test:godot:save-slots-direct-consumer-boundary-contract',
  'npm.cmd run test:world:player-history-save-load-restore-apply-contract',
  anchor.formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const saveRestoreWrapper = functionSource(
  mainSource,
  'func _press_mainline_visual_smoke_player_history_seeded_save_restore_open(panel_id: String) -> Dictionary:',
)
for (const requiredMainToken of [
  '_run_mainline_visual_smoke_player_history_save_restore_feedback()',
  '_scroll_mainline_visual_smoke_player_history_save_restore_into_view()',
  '"player_history_seeded_save_restore_visual_smoke_v1"',
  'saveRestoreFocusScrolled',
  'not bool(summary.get("dedicatedReplayScreenOpen", false))',
]) {
  assertIncludes(saveRestoreWrapper, requiredMainToken, 'Godot player-history save-restore wrapper')
}

const focusScroll = functionSource(
  mainSource,
  'func _scroll_mainline_visual_smoke_player_history_save_restore_into_view() -> Dictionary:',
)
for (const requiredFocusToken of [
  '_resolve_mainline_visual_smoke_panel_root("player_history")',
  '"PlayerHistoryScroll"',
  '"SaveSlotRestoreButton"',
  'scroll.scroll_vertical',
  'save_restore_focus_scrolled',
]) {
  assertIncludes(focusScroll, requiredFocusToken, 'Godot player-history save-restore focus scroll')
}

const runner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
const seedSource = runner.slice(runner.indexOf('def _seed_player_history_save_restore'))
for (const requiredSeedToken of [
  '"/api/session/join"',
  '"Authorization": f"Bearer {session_token}"',
  '"/api/save-slots/save"',
  'f"/api/player-history?factionId={urllib.parse.quote(faction_id)}',
  '"sessionTokenPresent": bool(session_token)',
  'history_data.get("saveLoad", {})',
]) {
  assertIncludes(seedSource, requiredSeedToken, 'visual smoke authenticated save-restore seed')
}

const backendApiClient = readUtf8('godot-client/scripts/infra/http/backend_api_client.gd')
assert.equal(
  backendApiClient.includes('/api/save-slots'),
  false,
  'BackendApiClient must not expose direct save-slots routes for this anchor',
)

const playerHistoryPanel = readUtf8('godot-client/scripts/ui/player_history_panel.gd')
const refreshFromBackend = functionSource(playerHistoryPanel, 'func refresh_from_backend(')
assert.equal(
  refreshFromBackend.includes('/api/save-slots'),
  false,
  'PlayerHistoryPanel refresh must keep save/load under player-history read model',
)
assertIncludes(
  playerHistoryPanel,
  '_rebuild_save_load(_coerce_dictionary(_read_model.get("saveLoad", {})))',
  'PlayerHistoryPanel save/load read-model rendering',
)

const directSaveSlotsBoundary = readUtf8('server/tests/godot_save_slots_direct_consumer_boundary_contract.test.ts')
assertIncludes(
  directSaveSlotsBoundary,
  'Godot player runtime scripts must not directly call /api/save-slots',
  'direct save-slots boundary test',
)

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredHandoffToken of [
  'Stage 810 - Godot Player History Save Restore Gameplay Anchor',
  'tmp/stage810_player_history_save_restore_gameplay_anchor/01_after_player_history_seeded_save_restore_panel_open.png',
  'npm.cmd run test:godot:player-history-save-restore-gameplay-anchor-contract',
]) {
  assertIncludes(currentHandoff, requiredHandoffToken, 'CURRENT handoff Stage 810')
}

console.log('[godot_player_history_save_restore_gameplay_anchor_contract] all checks passed')
