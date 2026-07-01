import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

function functionSource(source: string, signature: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing function ${signature}`)
  const nextFunc = source.indexOf('\nfunc ', start + signature.length)
  const end = nextFunc > start ? nextFunc : source.length
  return source.slice(start, end)
}

const mainSource = read('godot-client/scripts/app/main.gd')
const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const packageJson = read('package.json')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

assert.ok(
  packageJson.includes('"test:godot:player-history-timeline-recovery-replay-identity-bridge-contract"'),
  'package.json must expose the Godot timeline recovery replay identity bridge contract',
)

assert.ok(
  authority.includes('Stage 523 Godot timeline recovery replay identity bridge status') &&
    authority.includes('`npm.cmd run test:godot:player-history-timeline-recovery-replay-identity-bridge-contract`'),
  'authority must record the replay identity bridge gate',
)

const sanitizer = functionSource(playerHistoryPanel, 'func _sanitize_timeline_card_for_visible_copy(card: Dictionary) -> Dictionary:')
const registerInternalToken = functionSource(playerHistoryPanel, 'func _register_timeline_recovery_internal_token(recovery_kind: String, source_refs: Dictionary) -> void:')
const tokenGetter = functionSource(playerHistoryPanel, 'func get_timeline_recovery_internal_token(recovery_kind: String) -> String:')
const panelSummary = functionSource(playerHistoryPanel, 'func get_player_history_visual_smoke_summary() -> Dictionary:')

assert.ok(
  sanitizer.includes('_register_timeline_recovery_internal_token(recovery_kind, source_refs)') &&
    sanitizer.includes('"recoveryActionKind": recovery_kind'),
  'sanitizer must register internal recovery identity while returning only safe recovery kind',
)

for (const internalField of [
  'source_refs.get("replayRequestId"',
  'source_refs.get("battleReportId"',
  'source_refs.get("saveSlotId"',
  'source_refs.get("civilMemoryId"',
  'source_refs.get("worldEventId"',
]) {
  assert.ok(registerInternalToken.includes(internalField), `internal token bridge should read ${internalField}`)
}

assert.ok(
  tokenGetter.includes('_timeline_recovery_internal_tokens_by_kind.get') &&
    tokenGetter.includes('recovery_kind.strip_edges()'),
  'panel must expose only a method-scoped internal token lookup',
)

for (const forbiddenPublicField of [
  'replayRequestId',
  'battleReportId',
  'saveSlotId',
  'civilMemoryId',
  'worldEventId',
  'sourceRefs',
]) {
  assert.equal(panelSummary.includes(forbiddenPublicField), false, `panel summary must not expose ${forbiddenPublicField}`)
}

const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const identityResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_internal_identity(recovery_kind: String) -> String:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
const hostSmoke = functionSource(mainSource, 'func _run_mainline_visual_smoke_player_history_timeline_recovery_host_navigation() -> Dictionary:')
const panelOpenSmoke = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_panel_open(panel_id: String) -> Dictionary:')
const hostSummary = functionSource(mainSource, 'func _read_mainline_visual_smoke_player_history_summary() -> Dictionary:')

assert.ok(
  hostHandler.includes('_resolve_player_history_timeline_recovery_internal_identity(resolved_kind)') &&
    hostHandler.includes('_player_history_timeline_recovery_identity_resolved = _player_history_timeline_recovery_internal_identity.strip_edges() != ""'),
  'host handler must resolve an internal replay identity without adding it to the signal payload',
)

assert.ok(
  identityResolver.includes('"get_timeline_recovery_internal_token"') &&
    identityResolver.includes('panel_node.call("get_timeline_recovery_internal_token", recovery_kind.strip_edges())'),
  'host must request the internal token from the owning PlayerHistoryPanel',
)

for (const requiredSurfaceFact of [
  '"replayUnavailableCopyVisible": not _player_history_timeline_recovery_identity_resolved',
  'await panel_node.call("refresh_from_backend", 80, _player_history_timeline_recovery_internal_identity)',
  '_player_history_timeline_recovery_surface_open_reason = "dedicated_replay_identity_opened" if _player_history_timeline_recovery_identity_resolved else "dedicated_replay_unavailable_opened"',
  '"战况回放" if _player_history_timeline_recovery_identity_resolved else "回放已不可用"',
]) {
  assert.ok(surfaceOpen.includes(requiredSurfaceFact), `surface open should include identity branch fact: ${requiredSurfaceFact}`)
}

for (const requiredSmokeFact of [
  '"timelineRecoveryReplayIdentityResolved"',
  'bool(opened_summary.get("timelineRecoveryReplayIdentityResolved", false))',
  'bool(opened_summary.get("replayFrameLoaded", false))',
]) {
  assert.ok(hostSmoke.includes(requiredSmokeFact), `host smoke should verify identity-loaded replay fact: ${requiredSmokeFact}`)
}

for (const requiredPanelOpenFact of [
  'bool(summary.get("timelineRecoveryReplayIdentityResolved", false))',
  'str(summary.get("timelineRecoverySurfaceOpenReason", "")) == "dedicated_replay_identity_opened"',
  'bool(summary.get("replayFrameLoaded", false))',
]) {
  assert.ok(panelOpenSmoke.includes(requiredPanelOpenFact), `player-history smoke should accept identity-loaded replay fact: ${requiredPanelOpenFact}`)
}

assert.ok(
  hostSummary.includes('"timelineRecoveryReplayIdentityResolved"') &&
    !hostSummary.includes('"timelineRecoveryReplayIdentity"') &&
    !hostSummary.includes('_player_history_timeline_recovery_internal_identity,'),
  'host summary may expose only identity resolution status, not the internal identity value',
)

for (const forbiddenRawId of [
  'replayRequestId',
  'worldEventId',
  'saveSlotId',
  'civilMemoryId',
  'battleReportId',
  'sourceRefs',
]) {
  assert.equal(hostHandler.includes(forbiddenRawId), false, `host handler must not expose raw id ${forbiddenRawId}`)
  assert.equal(identityResolver.includes(forbiddenRawId), false, `identity resolver must not expose raw id ${forbiddenRawId}`)
  assert.equal(surfaceOpen.includes(forbiddenRawId), false, `surface open must not expose raw id ${forbiddenRawId}`)
  assert.equal(hostSmoke.includes(forbiddenRawId), false, `host smoke must not expose raw id ${forbiddenRawId}`)
}

console.log('[godot_player_history_timeline_recovery_replay_identity_bridge_contract] all checks passed')
