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
  const nextFunc = source.indexOf('\nfunc ', start + signature.length);
  const nextStaticFunc = source.indexOf('\nstatic func ', start + signature.length);
  const candidates = [nextFunc, nextStaticFunc].filter((index) => index > start);
  const end = candidates.length > 0 ? Math.min(...candidates) : source.length;
  return source.slice(start, end);
};

const generatedTroopSourceId = 'generated_troops_illustration_v1';
const carryingTroopsChipContract = 'ai_activity_carrying_troops_chip_v1';
const generatedTroopAssetRoot =
  'godot-client/assets/themes/slgclient/current/units/generated_troops/illustrations/foreground';
const expectedGeneratedTroopAssets = [
  'infantry_unit_fg.png',
  'cavalry_unit_fg.png',
  'archer_unit_fg.png',
  'xianzhenying_unit_fg.png',
];

const troopReadModel = readJson('godot-client/data/ui/main_city_troop_formation_read_model.json');
const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const ensureCardSource = functionSource(mainSource, 'func _ensure_ai_activity_card() -> void:');
const openCardSource = functionSource(mainSource, 'func _open_ai_activity_card_from_execution_trace(open_source: String) -> Dictionary:');
const summarySource = functionSource(mainSource, 'func _read_mainline_visual_smoke_ai_activity_card_summary() -> Dictionary:');
const carryingSlotsSource = functionSource(mainSource, 'func _resolve_ai_activity_card_carrying_troop_slots(ai_player_id: String) -> Array:');
const chipApplySource = functionSource(mainSource, 'func _apply_ai_activity_card_carrying_troop_slots(slots: Array) -> void:');

for (const assetName of expectedGeneratedTroopAssets) {
  assert.ok(
    fs.existsSync(path.join(repoRoot, generatedTroopAssetRoot, assetName)),
    `generated troop foreground asset must exist: ${assetName}`,
  );
}

assert.equal(troopReadModel.schema_version, 'main_city_troop_formation_read_model_v4');
const aiTeams = (troopReadModel.teams ?? []).filter(
  (team: any) => team?.owner_type === 'ai' || String(team?.ai_player_id ?? '').trim().length > 0,
);
assert.ok(aiTeams.length >= 2, 'formation read model must contain AI-owned teams.');
const primaryAiTeam = aiTeams.find((team: any) => team?.ai_player_id === 'ai_player_jihan_vanguard');
assert.ok(primaryAiTeam, 'read model must keep the Jihan vanguard AI team used by current context smoke.');
const primarySlots = Array.isArray(primaryAiTeam.slots) ? primaryAiTeam.slots : [];
assert.equal(primarySlots.length, 3, 'AI carrying troops chip requires exactly three formation slots.');
assert.deepEqual(
  primarySlots.map((slot: any) => String(slot?.troop_type ?? '').trim()),
  ['步兵', '骑兵', '枪兵'],
  'AI team must expose the three carried troop types from the formation read model.',
);
assert.deepEqual(
  primarySlots.map((slot: any) => String(slot?.general_name ?? '').trim()),
  ['刘备', '关羽', '张飞'],
  'AI team must expose the three carrying generals from the formation read model.',
);

assert.ok(
  factorySource.includes(`const AI_ACTIVITY_CARRYING_TROOPS_CHIP_CONTRACT := "${carryingTroopsChipContract}"`) &&
    factorySource.includes(`const GENERATED_TROOPS_ILLUSTRATION_SOURCE := "${generatedTroopSourceId}"`) &&
    factorySource.includes('static func ai_activity_carrying_troops_chip_contract() -> String:') &&
    factorySource.includes('static func generated_troops_illustration_source() -> String:') &&
    factorySource.includes('static func generated_troop_illustration_for_label(troop_label: String) -> String:') &&
    factorySource.includes('static func apply_ai_activity_carrying_troops_chip_summary('),
  'SlgUiComponentFactory must own the AI carrying troops chip contract and generated_troops asset mapping.',
);

for (const assetPath of [
  'res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/infantry_unit_fg.png',
  'res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/cavalry_unit_fg.png',
  'res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/archer_unit_fg.png',
  'res://assets/themes/slgclient/current/units/generated_troops/illustrations/foreground/xianzhenying_unit_fg.png',
]) {
  assert.ok(factorySource.includes(assetPath), `factory generated troop mapping is missing ${assetPath}`);
}

for (const requiredStateVar of [
  'var _ai_activity_card_carrying_troops_row: HBoxContainer',
  'var _ai_activity_card_carrying_troops_slot_count: int',
  'var _ai_activity_card_carrying_troops_texture_count: int',
  'var _ai_activity_card_carrying_troops_labels: Array[String]',
  'var _ai_activity_card_carrying_troops_asset_paths: Array[String]',
]) {
  assert.ok(mainSource.includes(requiredStateVar), `main.gd is missing carrying troops state var: ${requiredStateVar}`);
}

assert.ok(
  ensureCardSource.includes('AIActivityCardCarryingTroopsChipRow') &&
    ensureCardSource.includes('AIActivityCardCarryingTroopsChip_') &&
    ensureCardSource.includes('AIActivityCardCarryingTroopsTexture_') &&
    ensureCardSource.includes('ai_activity_carrying_troops_chip_contract'),
  'AI activity card must render a dedicated carrying-troops chip row with three troop textures.',
);

assert.ok(
  carryingSlotsSource.includes('main_city_troop_formation_read_model.json') &&
    carryingSlotsSource.includes('ai_player_jihan_vanguard') &&
    carryingSlotsSource.includes('owner_type') &&
    carryingSlotsSource.includes('troop_type') &&
    carryingSlotsSource.includes('general_name') &&
    carryingSlotsSource.includes('generated_troop_illustration_for_label'),
  'AI activity card must resolve carried troops from the formation read model, not from static UI copy.',
);

assert.ok(
  chipApplySource.includes('_ai_activity_card_carrying_troops_row') &&
    chipApplySource.includes('AIActivityCardCarryingTroopsTexture_') &&
    chipApplySource.includes('generated_troops_illustration_source') &&
    chipApplySource.includes('ai_activity_carrying_troops_chip_contract'),
  'opening the AI activity card must bind troop chips to generated_troops texture assets.',
);

assert.ok(
  openCardSource.includes('_resolve_ai_activity_card_carrying_troop_slots') &&
    openCardSource.includes('_apply_ai_activity_card_carrying_troop_slots'),
  'opening the AI activity card must refresh carrying troops from the AI formation slots.',
);

assert.ok(
  summarySource.includes('apply_ai_activity_carrying_troops_chip_summary') &&
    summarySource.includes('_ai_activity_card_carrying_troops_slot_count') &&
    summarySource.includes('_ai_activity_card_carrying_troops_texture_count') &&
    summarySource.includes('_ai_activity_card_carrying_troops_labels') &&
    summarySource.includes('_ai_activity_card_carrying_troops_asset_paths'),
  'activity-card summary must delegate carrying-troops fields to the shared component factory.',
);

for (const requiredFactorySummaryField of [
  '%sCarryingTroopsChipContract',
  '%sCarryingTroopsGeneratedAssetSource',
  '%sCarryingTroopsChipVisible',
  '%sCarryingTroopsSlotCount',
  '%sCarryingTroopsTextureCount',
  '%sCarryingTroopsLabels',
  '%sCarryingTroopsAssetPaths',
]) {
  assert.ok(factorySource.includes(requiredFactorySummaryField), `factory summary is missing ${requiredFactorySummaryField}`);
}

for (const requiredVisualField of [
  'aiActivityCardCarryingTroopsChipContract',
  'aiActivityCardCarryingTroopsGeneratedAssetSource',
  'aiActivityCardCarryingTroopsChipVisible',
  'aiActivityCardCarryingTroopsSlotCount',
  'aiActivityCardCarryingTroopsTextureCount',
  'aiActivityCardCarryingTroopsLabels',
]) {
  assert.ok(visualSmokeSource.includes(requiredVisualField), `visual smoke required fields are missing ${requiredVisualField}`);
}

for (const closureNeedle of [
  'AI_ACTIVITY_CARRYING_TROOPS_CHIP_TOKEN = "ai_activity_carrying_troops_chip_v1"',
  'GENERATED_TROOPS_ILLUSTRATION_SOURCE = "generated_troops_illustration_v1"',
  'aiActivityCardCarryingTroopsChipContract!=ai_activity_carrying_troops_chip_v1',
  'aiActivityCardCarryingTroopsGeneratedAssetSource!=generated_troops_illustration_v1',
  'aiActivityCardCarryingTroopsChipVisible!=true',
  'aiActivityCardCarryingTroopsSlotCount!=3',
  'aiActivityCardCarryingTroopsTextureCount!=3',
  'aiActivityCardCarryingTroopsLabels=empty',
]) {
  assert.ok(closureBatchSource.includes(closureNeedle), `closure batch is missing ${closureNeedle}`);
}

console.log('[godot_ai_activity_carrying_troops_chip_contract] all checks passed');
