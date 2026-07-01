import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const factorySource = readSource('godot-client/scripts/ui/slg_ui_component_factory.gd');
const mainChatSource = readSource('godot-client/scripts/ui/main_chat_overlay.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const visualSmokeSource = readSource('godot-client/tools/run_mainline_visual_smoke.py');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const bubbleBuilderStart = mainChatSource.indexOf('func _build_message_bubble_panel(');
const bubbleBuilderEnd = mainChatSource.indexOf('\nfunc ', bubbleBuilderStart + 1);
const bubbleBuilderSource =
  bubbleBuilderStart >= 0 && bubbleBuilderEnd > bubbleBuilderStart
    ? mainChatSource.slice(bubbleBuilderStart, bubbleBuilderEnd)
    : '';

const activityResolverStart = mainChatSource.indexOf('func _resolve_chat_ai_activity_continuity(');
const activityResolverEnd = mainChatSource.indexOf('\nfunc ', activityResolverStart + 1);
const activityResolverSource =
  activityResolverStart >= 0 && activityResolverEnd > activityResolverStart
    ? mainChatSource.slice(activityResolverStart, activityResolverEnd)
    : '';

const visualSummaryStart = mainChatSource.indexOf('func get_chat_message_visual_smoke_summary()');
const visualSummaryEnd = mainChatSource.indexOf('\nfunc ', visualSummaryStart + 1);
const visualSummarySource =
  visualSummaryStart >= 0 && visualSummaryEnd > visualSummaryStart
    ? mainChatSource.slice(visualSummaryStart, visualSummaryEnd)
    : '';

assert.ok(
  factorySource.includes('const CHAT_AI_ACTIVITY_CONTINUITY_TOKEN := "chat_ai_activity_continuity_v1"') &&
    factorySource.includes('static func chat_ai_activity_continuity_token() -> String:'),
  'factory must expose a stable chat AI activity continuity token.',
);

assert.ok(
  mainChatSource.includes('var _runtime_panel_context: Dictionary = {}') &&
    mainChatSource.includes('func set_runtime_panel_context(runtime_context: Dictionary) -> void:'),
  'MainChatOverlay must accept the same runtime panel context used by AI panel and battle report surfaces.',
);

assert.ok(
  activityResolverSource.includes('playerRuntimeExecutionTraceItems') &&
    activityResolverSource.includes('playerRuntimeExecutionTraceReadModel') &&
    activityResolverSource.indexOf('playerRuntimeExecutionTraceItems') <
      activityResolverSource.indexOf('playerRuntimeExecutionTraceReadModel'),
  'Chat AI activity continuity must prefer playerRuntimeExecutionTraceItems before read-model fallback.',
);

assert.ok(
  activityResolverSource.includes('"uses_execution_trace": true') &&
    activityResolverSource.includes('"fallback_used": false'),
  'Chat AI activity continuity must expose execution-trace source and reject fabricated fallback as the primary proof.',
);

assert.ok(
  bubbleBuilderSource.includes('_build_chat_ai_activity_continuity_strip(message)') &&
    bubbleBuilderSource.indexOf('_build_chat_ai_activity_continuity_strip(message)') <
      bubbleBuilderSource.indexOf('var body_text := str(message.get("body", ""))'),
  'AI chat message bubbles must render the activity strip before the body text.',
);

for (const requiredNodeName of [
  'ChatAiActivityContinuityStrip',
  'ChatAiActivityStatusDot',
  'ChatAiActivityStatusLabel',
  'ChatAiActivityTaskLabel',
  'ChatAiActivityTraceCountLabel',
]) {
  assert.ok(
    mainChatSource.includes(requiredNodeName),
    `chat AI activity continuity strip must render ${requiredNodeName}.`,
  );
}

for (const requiredSummaryField of [
  '"chatAiActivityContinuityToken"',
  '"chatAiActivityContinuityVisible"',
  '"chatAiActivityUsesExecutionTrace"',
  '"chatAiActivityFallbackUsed"',
  '"chatAiActivityTraceCount"',
  '"chatAiActivityCurrentTaskText"',
  '"chatAiActivityForbiddenCopyOk"',
]) {
  assert.ok(
    visualSummarySource.includes(requiredSummaryField),
    `chat visual summary must expose ${requiredSummaryField}.`,
  );
}

assert.ok(
  mainSource.includes('set_runtime_panel_context') &&
    mainSource.includes('_main_chat_overlay.call("set_runtime_panel_context", _build_runtime_panel_context())'),
  'main.gd must inject runtime panel context into MainChatOverlay before opening chat.',
);

assert.ok(
  mainSource.includes('"shell_open_chat_ai_activity_continuity_fixture"') &&
    mainSource.includes('func _press_mainline_visual_smoke_shell_open_chat_ai_activity_continuity_fixture(') &&
    mainSource.includes('_seed_mainline_visual_smoke_chat_ai_activity_continuity_fixture('),
  'main.gd must provide a formal chat AI activity continuity visual-smoke fixture.',
);

assert.ok(
  visualSmokeSource.includes('"shell_open_chat_ai_activity_continuity_fixture"') &&
    visualSmokeSource.includes('"chatAiActivityContinuityToken"') &&
    visualSmokeSource.includes('"chatAiActivityContinuityVisible"') &&
    visualSmokeSource.includes('"chatAiActivityUsesExecutionTrace"') &&
    visualSmokeSource.includes('"chatAiActivityFallbackUsed"') &&
    visualSmokeSource.includes('"chatAiActivityTraceCount"') &&
    visualSmokeSource.includes('"chatAiActivityStripCount"') &&
    visualSmokeSource.includes('"chatAiActivityStatusDotCount"') &&
    visualSmokeSource.includes('"chatAiActivityTaskLabelCount"') &&
    visualSmokeSource.includes('"chatAiActivityCurrentTaskText"') &&
    visualSmokeSource.includes('"chatAiActivitySource"') &&
    visualSmokeSource.includes('"chatAiActivityForbiddenCopyOk"'),
  'run_mainline_visual_smoke.py must allow the chat continuity action and require its full summary field set.',
);

assert.ok(
  closureBatchSource.includes('CHAT_AI_ACTIVITY_CONTINUITY_TOKEN = "chat_ai_activity_continuity_v1"') &&
    closureBatchSource.includes('chatAiActivityContinuityToken!=chat_ai_activity_continuity_v1') &&
    closureBatchSource.includes('chatAiActivityContinuityVisible!=true') &&
    closureBatchSource.includes('chatAiActivityUsesExecutionTrace!=true') &&
    closureBatchSource.includes('chatAiActivityFallbackUsed!=false') &&
    closureBatchSource.includes('chatAiActivityTraceCount<1') &&
    closureBatchSource.includes('chatAiActivitySource!=playerRuntimeExecutionTraceItems') &&
    closureBatchSource.includes('chatAiActivityForbiddenCopyOk!=true'),
  'closure batch must reject chat screens missing AI activity continuity.',
);

console.log('[godot_chat_ai_activity_continuity_contract] all checks passed');
