import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const end = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, end > start ? end : source.length);
};

const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const ensureCardSource = functionSource(mainSource, 'func _ensure_ai_activity_card() -> void:');
const payloadSource = functionSource(
  mainSource,
  'func _build_ai_activity_card_payload_from_trace(trace_items: Array, open_source: String) -> Dictionary:',
);
const openCardSource = functionSource(
  mainSource,
  'func _open_ai_activity_card_from_execution_trace(open_source: String) -> Dictionary:',
);
const summarySource = functionSource(
  mainSource,
  'func _read_mainline_visual_smoke_ai_activity_card_summary() -> Dictionary:',
);
const fixtureSource = functionSource(
  mainSource,
  'func _build_mainline_visual_smoke_ai_living_world_runtime(ai_player_id: String) -> Dictionary:',
);

assert.ok(
  mainSource.includes('const AI_ACTIVITY_CARD_AVATAR_STATUS_CONTRACT := "ai_activity_card_avatar_status_v1"'),
  'main.gd must expose a stable avatar/status contract token for the AI activity card.',
);

assert.ok(
  mainSource.includes('const AI_ACTIVITY_CARD_AI_CHAT_PORTRAIT_MANIFEST := "res://data/ai_chat_portraits.json"') &&
    mainSource.includes('const AI_ACTIVITY_CARD_FALLBACK_AVATAR_PATH := "res://assets/portraits/ai_chat/'),
  'AI activity card must resolve player avatars through the shared AI chat portrait manifest with an explicit fallback asset.',
);

for (const requiredVar of [
  'var _ai_activity_card_identity_row: HBoxContainer',
  'var _ai_activity_card_avatar_frame: PanelContainer',
  'var _ai_activity_card_avatar_texture: TextureRect',
  'var _ai_activity_card_status_dot: Panel',
  'var _ai_activity_card_status_label: Label',
  'var _ai_activity_card_avatar_image_path: String',
  'var _ai_activity_card_avatar_source: String',
  'var _ai_activity_card_status_dot_value: String',
  'var _ai_activity_card_status_reason: String',
]) {
  assert.ok(mainSource.includes(requiredVar), `main.gd is missing activity-card state var: ${requiredVar}`);
}

assert.ok(
  ensureCardSource.includes('AIActivityCardIdentityRow') &&
    ensureCardSource.includes('AIActivityCardAvatarFrame') &&
    ensureCardSource.includes('AIActivityCardAvatarTexture') &&
    ensureCardSource.includes('AIActivityCardStatusDot') &&
    ensureCardSource.includes('AIActivityCardStatusLabel') &&
    ensureCardSource.includes('AIActivityCardIdentityTextColumn') &&
    ensureCardSource.includes('_ai_activity_card_identity_row.custom_minimum_size = Vector2(0.0, 74.0)') &&
    ensureCardSource.includes('identity_text_column.custom_minimum_size = Vector2(348.0, 70.0)') &&
    ensureCardSource.includes('_make_ai_activity_card_avatar_frame_style()'),
  'activity card must render a dedicated identity row with avatar texture, visible status dot, and non-collapsed text column.',
);

assert.ok(
  mainSource.includes('label.custom_minimum_size = Vector2(0.0, float(font_size + 7))') &&
    mainSource.includes('label.size_flags_vertical = Control.SIZE_SHRINK_BEGIN'),
  'activity card body labels must keep stable vertical dimensions so visible text cannot collapse inside the card.',
);

assert.ok(
  mainSource.includes('func _resolve_ai_activity_card_runtime_item(ai_state: Dictionary, ai_player_id: String) -> Dictionary:') &&
    mainSource.includes('func _resolve_ai_activity_card_avatar_path(runtime_item: Dictionary) -> Dictionary:') &&
    mainSource.includes('func _load_ai_activity_card_portrait_manifest_path(avatar_id: String) -> String:') &&
    payloadSource.includes('_resolve_ai_activity_card_runtime_item(ai_state, ai_player_id)') &&
    payloadSource.includes('runtime_item.get("listCard", {})') &&
    payloadSource.includes('"avatarId"') &&
    payloadSource.includes('"avatarImagePath"') &&
    payloadSource.includes('"avatarSource"') &&
    payloadSource.includes('"statusDot"') &&
    payloadSource.includes('"statusReason"'),
  'activity-card payload must read avatar/status from playerRuntimeList.listCard rather than from internal action payloads.',
);

assert.ok(
  openCardSource.includes('_load_ai_activity_card_avatar_texture') &&
    openCardSource.includes('_ai_activity_card_avatar_texture.texture') &&
    openCardSource.includes('_make_ai_activity_card_status_dot_style') &&
    openCardSource.includes('ai_activity_card_avatar_status_contract') &&
    openCardSource.includes('_ai_activity_card_status_label.text'),
  'opening the AI activity card must load the avatar texture, style the status dot, and expose avatar/status metadata.',
);

for (const requiredSummaryField of [
  '"aiActivityCardAvatarStatusContract": AI_ACTIVITY_CARD_AVATAR_STATUS_CONTRACT',
  '"aiActivityCardIdentityRowVisible"',
  '"aiActivityCardAvatarVisible"',
  '"aiActivityCardAvatarImagePath"',
  '"aiActivityCardAvatarSource"',
  '"aiActivityCardStatusDotVisible"',
  '"aiActivityCardStatusDot"',
  '"aiActivityCardStatusReason"',
]) {
  assert.ok(summarySource.includes(requiredSummaryField), `summary is missing ${requiredSummaryField}`);
}

assert.ok(
  fixtureSource.includes('"avatarImagePath": "res://assets/portraits/ai_chat/') &&
    fixtureSource.includes('"statusDot": "green"') &&
    fixtureSource.includes('"statusReason": "execution_trace_active"'),
  'formal activity-card fixture must seed a real avatar image path and list-card status data.',
);

const fixtureImageMatch = fixtureSource.match(/"avatarImagePath": "res:\/\/assets\/portraits\/ai_chat\/([^"]+)"/);
assert.ok(fixtureImageMatch, 'fixture avatarImagePath must be a res:// AI chat portrait.');
assert.ok(
  fs.existsSync(path.join(repoRoot, 'godot-client/assets/portraits/ai_chat', fixtureImageMatch[1])),
  'fixture avatarImagePath must point to a real checked-in portrait asset.',
);

assert.ok(
  visualSmokeSource.includes('"world_ai_activity_card_from_badge_fixture"') &&
    visualSmokeSource.includes('"world_ai_activity_card_from_marker_fixture"') &&
    visualSmokeSource.includes('aiActivityCardAvatarStatusContract') &&
    visualSmokeSource.includes('aiActivityCardAvatarVisible') &&
    visualSmokeSource.includes('aiActivityCardStatusDotVisible'),
  'visual smoke runner must persist avatar/status fields for the formal AI activity-card screenshots.',
);

for (const closureNeedle of [
  'aiActivityCardAvatarStatusContract!=ai_activity_card_avatar_status_v1',
  'aiActivityCardAvatarVisible!=true',
  'aiActivityCardAvatarImagePath=empty',
  'aiActivityCardStatusDotVisible!=true',
  'aiActivityCardStatusDot=empty',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_ai_activity_card_avatar_status_contract] all checks passed');
