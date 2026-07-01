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
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length);
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const carryingTroopsChipContract = 'ai_activity_carrying_troops_chip_v1';
const generatedTroopSource = 'generated_troops_illustration_v1';

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const detailPageSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');
const troopReadModel = readSource('godot-client/data/ui/main_city_troop_formation_read_model.json');

const aiIdentityRowSource = functionSource(
  detailPageSource,
  'func _build_ai_living_identity_row(block_payload: Dictionary) -> Control:',
);
const resolveSlotsSource = functionSource(
  detailPageSource,
  'func _resolve_battle_report_ai_activity_carrying_troop_slots(block_payload: Dictionary) -> Array:',
);
const buildChipRowSource = functionSource(
  detailPageSource,
  'func _build_battle_report_ai_activity_carrying_troops_chip_row(block_payload: Dictionary) -> Control:',
);
const summarySource = functionSource(
  detailPageSource,
  'func get_mainline_visual_smoke_detail_summary() -> Dictionary:',
);

assert.ok(
  factorySource.includes(`const AI_ACTIVITY_CARRYING_TROOPS_CHIP_CONTRACT := "${carryingTroopsChipContract}"`) &&
    factorySource.includes(`const GENERATED_TROOPS_ILLUSTRATION_SOURCE := "${generatedTroopSource}"`) &&
    factorySource.includes('static func generated_troop_illustration_for_label(troop_label: String) -> String:') &&
    factorySource.includes('static func apply_ai_activity_carrying_troops_chip_summary('),
  'battle report detail must reuse the Stage 49 component factory carrying-troops chip contract.',
);

assert.ok(
  troopReadModel.includes('"ai_player_id": "ai_player_jihan_vanguard"') &&
    troopReadModel.includes('"troop_type": "步兵"') &&
    troopReadModel.includes('"troop_type": "骑兵"') &&
    troopReadModel.includes('"troop_type": "枪兵"'),
  'battle report detail carrying troops chip must have a stable AI-owned formation read-model source.',
);

assert.ok(
  aiIdentityRowSource.includes('_build_battle_report_ai_activity_carrying_troops_chip_row(block_payload)') &&
    aiIdentityRowSource.includes('BattleReportAiLivingIdentityTextColumn'),
  'battle report detail AI identity row must place the carrying troops chip with the existing AI living identity content.',
);

assert.ok(
  resolveSlotsSource.includes('main_city_troop_formation_read_model.json') &&
    resolveSlotsSource.includes('ai_player_jihan_vanguard') &&
    resolveSlotsSource.includes('owner_type') &&
    resolveSlotsSource.includes('troop_type') &&
    resolveSlotsSource.includes('general_name') &&
    resolveSlotsSource.includes('generated_troop_illustration_for_label'),
  'battle report detail must resolve carrying troops from the AI-owned formation read model, not from static UI copy.',
);

assert.ok(
  buildChipRowSource.includes('BattleReportAiLivingCarryingTroopsChipRow') &&
    buildChipRowSource.includes('BattleReportAiLivingCarryingTroopsChip_') &&
    buildChipRowSource.includes('BattleReportAiLivingCarryingTroopsTexture_') &&
    buildChipRowSource.includes('ai_activity_carrying_troops_chip_contract') &&
    buildChipRowSource.includes('generated_troops_illustration_source') &&
    buildChipRowSource.includes('_load_ai_living_avatar_texture'),
  'battle report detail must render three generated_troops texture chips inside the AI living card.',
);

assert.ok(
  summarySource.includes('apply_ai_activity_carrying_troops_chip_summary') &&
    summarySource.includes('"battleReportDetailAiActivity"') &&
    summarySource.includes('BattleReportAiLivingCarryingTroopsChipRow') &&
    summarySource.includes('BattleReportAiLivingCarryingTroopsTexture_') &&
    summarySource.includes('battle_report_detail_ai_activity_carrying_troops_label') &&
    summarySource.includes('battle_report_detail_ai_activity_carrying_troops_asset_path'),
  'battle report detail summary must expose carrying troops chip count, texture count, labels, and asset paths.',
);

for (const requiredVisualField of [
  'battleReportDetailAiActivityCarryingTroopsChipContract',
  'battleReportDetailAiActivityCarryingTroopsGeneratedAssetSource',
  'battleReportDetailAiActivityCarryingTroopsChipVisible',
  'battleReportDetailAiActivityCarryingTroopsSlotCount',
  'battleReportDetailAiActivityCarryingTroopsTextureCount',
  'battleReportDetailAiActivityCarryingTroopsLabels',
]) {
  assert.ok(visualSmokeSource.includes(requiredVisualField), `visual smoke required fields are missing ${requiredVisualField}`);
}

for (const closureNeedle of [
  'battleReportDetailAiActivityCarryingTroopsChipContract!=ai_activity_carrying_troops_chip_v1',
  'battleReportDetailAiActivityCarryingTroopsGeneratedAssetSource!=generated_troops_illustration_v1',
  'battleReportDetailAiActivityCarryingTroopsChipVisible!=true',
  'battleReportDetailAiActivityCarryingTroopsSlotCount!=3',
  'battleReportDetailAiActivityCarryingTroopsTextureCount!=3',
  'battleReportDetailAiActivityCarryingTroopsLabels=empty',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_battle_report_detail_carrying_troops_chip_contract] all checks passed');
