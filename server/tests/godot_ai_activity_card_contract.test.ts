import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const mainSource = readSource('godot-client/scripts/app/main.gd');
const nativeShellSource = readSource('godot-client/scripts/ui/native_slg_shell.gd');
const unitViewLayerSource = readSource('godot-client/scripts/map/unit_view_layer.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const activityCardStart = mainSource.indexOf('func _ensure_ai_activity_card()');
const activityCardEnd = mainSource.indexOf('\nfunc ', activityCardStart + 1);
const activityCardSource =
  activityCardStart >= 0 && activityCardEnd > activityCardStart
    ? mainSource.slice(activityCardStart, activityCardEnd)
    : '';

const cardSummaryStart = mainSource.indexOf('func _read_mainline_visual_smoke_ai_activity_card_summary(');
const cardSummaryEnd = mainSource.indexOf('\nfunc ', cardSummaryStart + 1);
const cardSummarySource =
  cardSummaryStart >= 0 && cardSummaryEnd > cardSummaryStart
    ? mainSource.slice(cardSummaryStart, cardSummaryEnd)
    : '';

assert.ok(
  mainSource.includes('const AI_ACTIVITY_CARD_CONTRACT := "ai_activity_card_v1"'),
  'main.gd must expose a stable AI activity card contract token.',
);

assert.ok(
  mainSource.includes('var _ai_activity_card: PanelContainer') &&
    mainSource.includes('var _ai_activity_card_open_source: String'),
  'main.gd must keep a single lightweight AI activity card instance and open-source state.',
);

assert.ok(
  mainSource.includes('func _open_ai_activity_card_from_execution_trace(open_source: String) -> Dictionary:') &&
    mainSource.includes('func _build_ai_activity_card_payload_from_trace(trace_items: Array, open_source: String) -> Dictionary:') &&
    cardSummarySource.includes('"aiActivityCardContract": AI_ACTIVITY_CARD_CONTRACT') &&
    cardSummarySource.includes('"aiActivityCardUsesExecutionTrace"') &&
    cardSummarySource.includes('"aiActivityCardForbiddenCopyHits"'),
  'main.gd must build, open, and summarize the card from backend-fed execution trace data.',
);

for (const forbiddenToken of [
  'proposalId',
  'relatedProposalId',
  'worldAction',
  'worldActionPayload',
  'receipt',
  'plannerDecision',
  'observation',
]) {
  assert.ok(
    !activityCardSource.includes(forbiddenToken),
    `AI activity card builder must not depend on legacy/internal token ${forbiddenToken}.`,
  );
}

assert.ok(
  nativeShellSource.includes('signal ai_activity_badge_requested') &&
    nativeShellSource.includes('func _on_ai_activity_status_badge_gui_input(event: InputEvent) -> void:') &&
    nativeShellSource.includes('ai_activity_badge_requested.emit()') &&
    nativeShellSource.includes('MOUSE_FILTER_STOP'),
  'native shell badge must be a click target that requests the AI activity card without hijacking AiSwitchButton.',
);

assert.ok(
  unitViewLayerSource.includes('signal ai_living_activity_marker_requested(payload: Dictionary)') &&
    unitViewLayerSource.includes('func _unhandled_input(event: InputEvent) -> void:') &&
    unitViewLayerSource.includes('func _try_emit_ai_living_activity_marker_requested(screen_position: Vector2) -> bool:') &&
    unitViewLayerSource.includes('ai_living_activity_marker_requested.emit(payload)') &&
    unitViewLayerSource.includes('ai_activity_card_marker_entry_v1'),
  'UnitViewLayer must let visible living-activity markers open the same AI activity card.',
);

assert.ok(
  mainSource.includes('ai_activity_badge_requested.connect') &&
    (mainSource.includes('ai_living_activity_marker_requested.connect') ||
      mainSource.includes('connect("ai_living_activity_marker_requested", marker_callback)')) &&
    mainSource.includes('func _on_shell_ai_activity_badge_requested() -> void:') &&
    mainSource.includes('func _on_ai_living_activity_marker_requested(_payload: Dictionary) -> void:'),
  'main.gd must wire both badge and marker signals to the AI activity card.',
);

assert.ok(
  mainSource.includes('"world_ai_activity_card_from_badge_fixture":') &&
    mainSource.includes('"world_ai_activity_card_from_marker_fixture":') &&
    mainSource.includes('func _press_mainline_visual_smoke_world_ai_activity_card_from_badge_fixture() -> Dictionary:') &&
    mainSource.includes('func _press_mainline_visual_smoke_world_ai_activity_card_from_marker_fixture() -> Dictionary:'),
  'main visual smoke must expose formal badge and marker AI activity-card fixtures.',
);

assert.ok(
  visualSmokeSource.includes('"world_ai_activity_card_from_badge_fixture"') &&
    visualSmokeSource.includes('"world_ai_activity_card_from_marker_fixture"') &&
    visualSmokeSource.includes('"world_ai_activity_card_from_badge_fixture": {') &&
    visualSmokeSource.includes('"world_ai_activity_card_from_marker_fixture": {'),
  'visual smoke runner must register both AI activity-card formal actions.',
);

assert.ok(
  closureBatchSource.includes('AI_ACTIVITY_CARD_ACTIONS = {') &&
    closureBatchSource.includes('"world_ai_activity_card_from_badge_fixture"') &&
    closureBatchSource.includes('"world_ai_activity_card_from_marker_fixture"') &&
    closureBatchSource.includes('aiActivityCardContract!=ai_activity_card_v1') &&
    closureBatchSource.includes('aiActivityCardUsesExecutionTrace!=true') &&
    closureBatchSource.includes('aiActivityCardForbiddenCopyHitsNotEmpty'),
  'closure batch must validate activity-card contract, execution-trace source, and legacy-copy absence.',
);

console.log('[godot_ai_activity_card_contract] all checks passed');
