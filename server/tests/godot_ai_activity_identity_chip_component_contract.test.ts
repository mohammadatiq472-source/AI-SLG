import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const sliceFunction = (source: string, signature: string): string => {
  const start = source.indexOf(signature);
  if (start < 0) {
    return '';
  }
  const end = source.indexOf('\nfunc ', start + signature.length);
  return source.slice(start, end > start ? end : source.length);
};

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const snapshotSectionSource = readSource('godot-client/scripts/ui/slg_snapshot_section_page.gd');
const aiPanelPresenterSource = readSource('godot-client/scripts/ui/presenters/ai_panel_presenter.gd');
const aiPanelSource = readSource('godot-client/scripts/ui/ai_panel.gd');
const battleDetailSource = readSource('godot-client/scripts/ui/battle_report_detail_page.gd');
const chatSource = readSource('godot-client/scripts/ui/main_chat_overlay.gd');

const snapshotStateCardSource = sliceFunction(
  snapshotSectionSource,
  'func _build_state_card(shared_state: Dictionary, raw_card: Variant) -> Control:',
);
const aiExecutionTraceCardsSource = sliceFunction(
  aiPanelPresenterSource,
  'func _build_ai_execution_trace_cards(execution_trace_items: Array) -> Array:',
);
const aiPanelSummarySource = sliceFunction(
  aiPanelSource,
  'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:',
);
const battleIdentityRowSource = sliceFunction(
  battleDetailSource,
  'func _build_ai_living_identity_row(block_payload: Dictionary) -> Control:',
);
const battleSummarySource = sliceFunction(
  battleDetailSource,
  'func get_mainline_visual_smoke_detail_summary() -> Dictionary:',
);
const chatStripSource = sliceFunction(
  chatSource,
  'func _build_chat_ai_activity_continuity_strip(message: Dictionary) -> Control:',
);
const chatSummarySource = sliceFunction(
  chatSource,
  'func get_chat_message_visual_smoke_summary() -> Dictionary:',
);

assert.ok(
  factorySource.includes('const AI_ACTIVITY_IDENTITY_CHIP_TOKEN := "ai_activity_identity_chip_v1"') &&
    factorySource.includes('static func ai_activity_identity_chip_token() -> String:') &&
    factorySource.includes('static func build_ai_activity_identity_chip(activity: Dictionary) -> Control:') &&
    factorySource.includes('static func apply_ai_activity_identity_chip_summary(summary: Dictionary, prefix: String, visible_count: int) -> void:'),
  'slg_ui_component_factory.gd must own the shared AI activity identity chip token, builder, and summary helper.',
);

assert.ok(
  snapshotStateCardSource.includes('"ai_activity_identity_chip"') &&
    snapshotStateCardSource.includes('UI_COMPONENT_FACTORY.build_ai_activity_identity_chip('),
  'snapshot state cards must be able to render the shared AI activity identity chip from presenter payloads.',
);

assert.ok(
  aiPanelPresenterSource.includes('const UI_COMPONENT_FACTORY := preload("res://scripts/ui/slg_ui_component_factory.gd")') &&
    aiExecutionTraceCardsSource.includes('"ai_activity_identity_chip"') &&
    aiExecutionTraceCardsSource.includes('UI_COMPONENT_FACTORY.ai_activity_identity_chip_token()') &&
    aiExecutionTraceCardsSource.includes('"surface": "ai_panel"') &&
    aiExecutionTraceCardsSource.includes('"trace_id": str(trace.get("traceId"'),
  'AI panel execution trace cards must carry the shared identity chip payload.',
);

assert.ok(
  aiPanelSummarySource.includes('aiPanelAiActivityIdentityChipToken') &&
    aiPanelSummarySource.includes('UI_COMPONENT_FACTORY.apply_ai_activity_identity_chip_summary(') &&
    aiPanelSummarySource.includes('_ai_visual_smoke_count_visible_meta("ai_activity_identity_chip_token"'),
  'AI panel visual summary must prove the shared identity chip is rendered.',
);

assert.ok(
  battleIdentityRowSource.includes('BATTLE_REPORT_UI_COMPONENT_FACTORY.build_ai_activity_identity_chip(') &&
    battleIdentityRowSource.includes('"surface": "battle_report"') &&
    battleSummarySource.includes('battleReportDetailAiActivityIdentityChipToken') &&
    battleSummarySource.includes('_count_visible_nodes_by_meta(self, "ai_activity_identity_chip_token"'),
  'battle report AI identity row must use and summarize the shared identity chip.',
);

assert.ok(
  chatStripSource.includes('UI_COMPONENT_FACTORY.build_ai_activity_identity_chip(') &&
    chatStripSource.includes('"surface": "chat"') &&
    chatSummarySource.includes('chatAiActivityIdentityChipToken') &&
    chatSummarySource.includes('_count_descendants_with_meta(_message_list, "ai_activity_identity_chip_token"'),
  'chat AI activity strip must use and summarize the shared identity chip.',
);

console.log('[godot_ai_activity_identity_chip_component_contract] all checks passed');
