import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

const nativeShellSource = readSource('godot-client/scripts/ui/native_slg_shell.gd');
const mainSource = readSource('godot-client/scripts/app/main.gd');
const closureBatchSource = readSource('godot-client/tools/run_mainline_ui_closure_batch.py');

const traceCommandChromeToken = 'ai_switch_trace_command_chrome_v1';

assert.ok(
  nativeShellSource.includes(`AI_SWITCH_TRACE_COMMAND_CHROME_TOKEN := "${traceCommandChromeToken}"`) &&
    nativeShellSource.includes('func _refresh_ai_switch_trace_command_chrome() -> void:'),
  'native shell must own a stable trace-aware AI switch command chrome token and refresh helper.',
);

assert.ok(
  nativeShellSource.includes('_ai_switch_button.set_meta("ai_switch_trace_command_chrome_token", AI_SWITCH_TRACE_COMMAND_CHROME_TOKEN)') &&
    nativeShellSource.includes('_ai_switch_button.set_meta("ai_switch_trace_command_chrome_active", trace_active)') &&
    nativeShellSource.includes('_ai_switch_button.set_meta("ai_switch_trace_command_current_task", _ai_activity_status_badge_current_task)'),
  'AiSwitchButton must expose trace-aware command chrome metadata for the formal bottom-nav summary.',
);

assert.ok(
  nativeShellSource.includes('AI玩家正在行动：%s" % _ai_activity_status_badge_current_task') &&
    nativeShellSource.includes('ai_switch_trace_command_chrome_v1'),
  'AiSwitchButton tooltip/chrome must surface the current execution-trace task without changing the stable button label.',
);

assert.ok(
  mainSource.includes('"shellNavAiSwitchTraceCommandChromeToken": ai_switch_trace_command_chrome_token') &&
    mainSource.includes('"shellNavAiSwitchTraceCommandChromeActive": ai_switch_trace_command_chrome_active') &&
    mainSource.includes('"shellNavAiSwitchTraceCommandCurrentTask": ai_switch_trace_command_current_task') &&
    mainSource.includes('"shellNavAiSwitchTraceCommandTooltip": ai_switch_trace_command_tooltip'),
  'main shell nav summary must expose the AI switch trace-aware command chrome fields.',
);

assert.ok(
  mainSource.includes('"shellNavAiSwitchTraceCommandChromeToken": str(shell_nav_summary.get("shellNavAiSwitchTraceCommandChromeToken", "")).strip_edges()') &&
    mainSource.includes('"shellNavAiSwitchTraceCommandChromeActive": bool(shell_nav_summary.get("shellNavAiSwitchTraceCommandChromeActive", false))') &&
    mainSource.includes('"shellNavAiSwitchTraceCommandCurrentTask": str(shell_nav_summary.get("shellNavAiSwitchTraceCommandCurrentTask", "")).strip_edges()'),
  'world_shell_ai_activity_badge_fixture must return trace-aware AI switch command chrome fields.',
);

assert.ok(
  closureBatchSource.includes('shellNavAiSwitchTraceCommandChromeToken!=ai_switch_trace_command_chrome_v1') &&
    closureBatchSource.includes('shellNavAiSwitchTraceCommandChromeActive!=true') &&
    closureBatchSource.includes('shellNavAiSwitchTraceCommandCurrentTask=empty'),
  'closure batch must validate the trace-aware AI switch command chrome through the formal shell fixture.',
);

console.log('[godot_shell_ai_switch_trace_command_chrome_contract] all checks passed');
