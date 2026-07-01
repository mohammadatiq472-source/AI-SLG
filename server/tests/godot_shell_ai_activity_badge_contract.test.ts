import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const nativeShellSource = readSource('godot-client/scripts/ui/native_slg_shell.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

assert.ok(
  nativeShellSource.includes('AI_ACTIVITY_STATUS_BADGE_CONTRACT := "ai_activity_status_badge_v1"') &&
    nativeShellSource.includes('AI_ACTIVITY_STATUS_BADGE_NODE_NAME := "AiActivityStatusBadge"'),
  'native shell must expose a stable AI activity badge contract and node name',
);

assert.ok(
  nativeShellSource.includes('func set_ai_activity_status_badge(trace_items: Array) -> void:') &&
    nativeShellSource.includes('func get_ai_activity_status_badge_summary() -> Dictionary:') &&
    nativeShellSource.includes('_ensure_ai_activity_status_badge()') &&
    nativeShellSource.includes('_ai_switch_button.add_child(_ai_activity_status_badge)'),
  'native shell must render the activity badge as a child of the formal AiSwitchButton',
);

assert.ok(
  nativeShellSource.includes('_ai_activity_status_badge.set_meta("ai_activity_status_badge_contract", AI_ACTIVITY_STATUS_BADGE_CONTRACT)') &&
    nativeShellSource.includes('currentTaskText') &&
    nativeShellSource.includes('AI_ACTIVITY_STATUS_BADGE_SOURCE_EXECUTION_TRACE'),
  'AI activity badge must carry contract metadata and summarize execution trace current-task copy',
);

assert.ok(
  mainSource.includes('func _sync_shell_ai_activity_status_badge_from_world_state() -> Dictionary:') &&
    mainSource.includes('WorldStore.get_ai_state(_target_faction_id)') &&
    mainSource.includes('playerRuntimeExecutionTraceItems') &&
    mainSource.includes('_native_shell.call("set_ai_activity_status_badge", trace_items)'),
  'main controller must sync shell badge from backend-fed AI execution trace state',
);

assert.ok(
  mainSource.includes('"shellNavAiActivityBadgeContract": ai_activity_badge_contract') &&
    mainSource.includes('"shellNavAiActivityBadgeVisible": ai_activity_badge_visible') &&
    mainSource.includes('"shellNavAiActivityBadgeTraceCount": ai_activity_badge_trace_count') &&
    mainSource.includes('"shellNavAiActivityBadgeUsesExecutionTrace": ai_activity_badge_uses_execution_trace') &&
    mainSource.includes('"shellNavAiActivityBadgeFallbackUsed": ai_activity_badge_fallback_used'),
  'shell nav visual summary must expose AI activity badge contract, visibility, trace count, and source',
);

assert.ok(
  mainSource.includes('"world_shell_ai_activity_badge_fixture":') &&
    mainSource.includes('func _press_mainline_visual_smoke_world_shell_ai_activity_badge_fixture() -> Dictionary:') &&
    mainSource.includes('"reason": "world_shell_ai_activity_badge_fixture_ok" if ok else "world_shell_ai_activity_badge_fixture_not_verified"') &&
    mainSource.includes('"shellNavAiActivityBadgeSummary": shell_nav_summary'),
  'main visual smoke must expose a formal world shell AI activity badge fixture',
);

assert.ok(
  visualSmokeSource.includes('"world_shell_ai_activity_badge_fixture"') &&
    visualSmokeSource.includes('"world_shell_ai_activity_badge_fixture": {') &&
    visualSmokeSource.includes('"panel_required": False'),
  'visual smoke runner must register the world_shell_ai_activity_badge_fixture formal action',
);

assert.ok(
  closureBatchSource.includes('AI_ACTIVITY_STATUS_BADGE_ACTIONS = {') &&
    closureBatchSource.includes('"world_shell_ai_activity_badge_fixture"') &&
    closureBatchSource.includes('shellNavAiActivityBadgeContract!=ai_activity_status_badge_v1') &&
    closureBatchSource.includes('shellNavAiActivityBadgeUsesExecutionTrace!=true') &&
    closureBatchSource.includes('shellNavAiActivityBadgeFallbackUsed!=false'),
  'closure batch must validate AI activity badge contract and execution-trace source',
);

console.log('[godot_shell_ai_activity_badge_contract] all checks passed');
