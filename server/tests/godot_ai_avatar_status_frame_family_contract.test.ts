import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const readJson = (relativePath: string): any =>
  JSON.parse(readSource(relativePath));

const functionSource = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const next = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, next > start ? next : source.length);
};

const readPngSize = (relativePath: string): [number, number] => {
  const buffer = fs.readFileSync(path.join(repoRoot, relativePath));
  assert.equal(buffer.toString('ascii', 1, 4), 'PNG', `${relativePath} must be a PNG asset`);
  return [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];
};

const avatarFamilyContract = 'ai_avatar_status_frame_family_v1';
const manifestRelativePath =
  'godot-client/assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_family_manifest_v1.json';
const activeFrameAsset =
  'godot-client/assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_active_v1.png';
const queuedFrameAsset =
  'godot-client/assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_queued_v1.png';
const failedFrameAsset =
  'godot-client/assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_failed_v1.png';
const combatIntentBadgeAsset =
  'godot-client/assets/themes/slgclient/current/ui/avatars/ai_avatar_intent_badge_combat_v1.png';

assert.ok(fs.existsSync(path.join(repoRoot, manifestRelativePath)), 'shared AI avatar status frame family manifest must exist.');
const manifest = readJson(manifestRelativePath);
assert.equal(manifest.contractId, avatarFamilyContract);
assert.equal(manifest.styleDirection, 'ai_player_living_world_avatar_status_identity');
assert.equal(manifest.assets?.activeFrame?.path, `res://assets/themes/slgclient/current/ui/avatars/${path.basename(activeFrameAsset)}`);
assert.equal(manifest.assets?.queuedFrame?.path, `res://assets/themes/slgclient/current/ui/avatars/${path.basename(queuedFrameAsset)}`);
assert.equal(manifest.assets?.failedFrame?.path, `res://assets/themes/slgclient/current/ui/avatars/${path.basename(failedFrameAsset)}`);
assert.equal(manifest.assets?.combatIntentBadge?.path, `res://assets/themes/slgclient/current/ui/avatars/${path.basename(combatIntentBadgeAsset)}`);

assert.deepEqual(readPngSize(activeFrameAsset), [72, 72]);
assert.deepEqual(readPngSize(queuedFrameAsset), [72, 72]);
assert.deepEqual(readPngSize(failedFrameAsset), [72, 72]);
assert.deepEqual(readPngSize(combatIntentBadgeAsset), [36, 28]);

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const battleReportDetailSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

assert.ok(
  factorySource.includes('const AI_AVATAR_STATUS_FRAME_FAMILY_CONTRACT := "ai_avatar_status_frame_family_v1"') &&
    factorySource.includes('const AI_AVATAR_STATUS_FRAME_ACTIVE_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_active_v1.png"') &&
    factorySource.includes('const AI_AVATAR_STATUS_FRAME_QUEUED_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_queued_v1.png"') &&
    factorySource.includes('const AI_AVATAR_STATUS_FRAME_FAILED_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_status_frame_failed_v1.png"') &&
    factorySource.includes('const AI_AVATAR_INTENT_BADGE_COMBAT_ASSET_PATH := "res://assets/themes/slgclient/current/ui/avatars/ai_avatar_intent_badge_combat_v1.png"') &&
    factorySource.includes('static func ai_avatar_status_frame_family_contract() -> String:') &&
    factorySource.includes('static func resolve_ai_avatar_status_frame_asset_path(status_dot: String) -> String:') &&
    factorySource.includes('static func ai_avatar_intent_badge_combat_asset_path() -> String:') &&
    factorySource.includes('static func apply_ai_avatar_status_frame_family_summary('),
  'SlgUiComponentFactory must own the shared AI avatar status frame asset family.',
);

const ensureCardSource = functionSource(mainSource, 'func _ensure_ai_activity_card() -> void:');
const openCardSource = functionSource(mainSource, 'func _open_ai_activity_card_from_execution_trace(open_source: String) -> Dictionary:');
const cardSummarySource = functionSource(mainSource, 'func _read_mainline_visual_smoke_ai_activity_card_summary() -> Dictionary:');

assert.ok(
  mainSource.includes('var _ai_activity_card_avatar_status_frame_texture: TextureRect') &&
    mainSource.includes('var _ai_activity_card_avatar_intent_badge_texture: TextureRect') &&
    mainSource.includes('var _ai_activity_card_avatar_status_frame_asset_path: String') &&
    ensureCardSource.includes('AIActivityCardAvatarStatusFrameTexture') &&
    ensureCardSource.includes('AIActivityCardAvatarIntentBadgeTexture') &&
    openCardSource.includes('SlgUiComponentFactoryScript.resolve_ai_avatar_status_frame_asset_path(_ai_activity_card_status_dot_value)') &&
    openCardSource.includes('SlgUiComponentFactoryScript.ai_avatar_intent_badge_combat_asset_path()') &&
    cardSummarySource.includes('"aiActivityCardAvatarStatusFrameFamilyContract": SlgUiComponentFactoryScript.ai_avatar_status_frame_family_contract()') &&
    cardSummarySource.includes('"aiActivityCardAvatarStatusFrameVisible"') &&
    cardSummarySource.includes('"aiActivityCardAvatarStatusFrameAssetPath"') &&
    cardSummarySource.includes('"aiActivityCardAvatarIntentBadgeVisible"'),
  'AI activity card must render and summarize the shared avatar status frame and intent badge.',
);

const battleIdentitySource = functionSource(battleReportDetailSource, 'func _build_ai_living_identity_row(block_payload: Dictionary) -> Control:');
const battleSummarySource = functionSource(battleReportDetailSource, 'func get_mainline_visual_smoke_detail_summary()');

assert.ok(
  battleIdentitySource.includes('BattleReportAiLivingAvatarStatusFrameTexture') &&
    battleIdentitySource.includes('BattleReportAiLivingAvatarIntentBadgeTexture') &&
    battleIdentitySource.includes('BATTLE_REPORT_UI_COMPONENT_FACTORY.resolve_ai_avatar_status_frame_asset_path(status_dot_value)') &&
    battleIdentitySource.includes('BATTLE_REPORT_UI_COMPONENT_FACTORY.ai_avatar_intent_badge_combat_asset_path()') &&
    battleSummarySource.includes('"battleReportDetailAiActivityAvatarStatusFrameFamilyContract"') &&
    battleSummarySource.includes('"battleReportDetailAiActivityAvatarStatusFrameVisible"') &&
    battleSummarySource.includes('"battleReportDetailAiActivityAvatarIntentBadgeVisible"'),
  'battle report detail AI identity row must reuse the same avatar status frame family.',
);

for (const requiredVisualField of [
  'aiActivityCardAvatarStatusFrameFamilyContract',
  'aiActivityCardAvatarStatusFrameVisible',
  'aiActivityCardAvatarIntentBadgeVisible',
  'battleReportDetailAiActivityAvatarStatusFrameFamilyContract',
  'battleReportDetailAiActivityAvatarStatusFrameVisible',
  'battleReportDetailAiActivityAvatarIntentBadgeVisible',
]) {
  assert.ok(visualSmokeSource.includes(requiredVisualField), `visual smoke required fields are missing ${requiredVisualField}`);
}

for (const closureNeedle of [
  'AI_AVATAR_STATUS_FRAME_FAMILY_TOKEN = "ai_avatar_status_frame_family_v1"',
  'aiActivityCardAvatarStatusFrameFamilyContract!=ai_avatar_status_frame_family_v1',
  'aiActivityCardAvatarStatusFrameVisible!=true',
  'aiActivityCardAvatarIntentBadgeVisible!=true',
  'battleReportDetailAiActivityAvatarStatusFrameFamilyContract!=ai_avatar_status_frame_family_v1',
  'battleReportDetailAiActivityAvatarStatusFrameVisible!=true',
  'battleReportDetailAiActivityAvatarIntentBadgeVisible!=true',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_ai_avatar_status_frame_family_contract] all checks passed');
