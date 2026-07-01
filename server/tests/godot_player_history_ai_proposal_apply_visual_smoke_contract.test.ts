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

const playerHistoryPanel = read('godot-client/scripts/ui/player_history_panel.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const runnerSource = read('godot-client/tools/run_mainline_visual_smoke.py')
const packageJson = read('package.json')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const productAuthority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const dynamicPromptSource = read('docs/SLG_DYNAMIC_FEEDBACK_PROMPTS_SOURCE_2026_06_13.md')

const recoveryKind = 'ai_proposal_apply'
const recoveryToken = 'player_history_ai_proposal_apply_recovery_v1'
const visualSmokeAction = 'player_history_ai_proposal_apply_panel_open'
const visualSmokeContract = 'player_history_ai_proposal_apply_recovery_visual_smoke_v1'
const playerFeedback = '已准备处理 AI 提案'

const proposalSmoke = functionSource(playerHistoryPanel, 'func run_ai_proposal_apply_timeline_recovery_smoke() -> Dictionary:')
const hostHandler = functionSource(mainSource, 'func _on_player_history_timeline_recovery_requested(recovery_kind: String) -> void:')
const surfaceResolver = functionSource(mainSource, 'func _resolve_player_history_timeline_recovery_surface(recovery_kind: String) -> String:')
const visualSmokeBridge = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_ai_proposal_apply(panel_id: String) -> Dictionary:')

assert.ok(
  dynamicPromptSource.includes('不要做散乱动画') &&
    dynamicPromptSource.includes('游戏事件') &&
    dynamicPromptSource.includes('表现时间轴') &&
    dynamicPromptSource.includes('不要按两千多万格全量播放动画'),
  'dynamic feedback prompt source must be copied as a traceable Stage D input.',
)

assert.ok(
  playerHistoryPanel.includes(`PLAYER_HISTORY_AI_PROPOSAL_APPLY_RECOVERY_TOKEN := "${recoveryToken}"`) &&
    proposalSmoke.includes(`_on_timeline_recovery_pressed(feedback_label, "${recoveryKind}"`) &&
    proposalSmoke.includes('AI 提案需要确认') &&
    proposalSmoke.includes('处理提案'),
  'PlayerHistoryPanel must keep the proposal/apply recovery helper and player-visible copy.',
)

assert.ok(
  hostHandler.includes(`resolved_kind == "${recoveryKind}"`) &&
    hostHandler.includes(`_player_history_timeline_recovery_host_feedback = "${playerFeedback}"`) &&
    surfaceResolver.includes(`"${recoveryKind}"`) &&
    surfaceResolver.includes('return "ai_hub"'),
  'main.gd must route proposal/apply recovery to the real AI hub with player-safe feedback.',
)

assert.ok(
  mainSource.includes(`"${visualSmokeAction}"`) &&
    visualSmokeBridge.includes('run_ai_proposal_apply_timeline_recovery_smoke') &&
    visualSmokeBridge.includes('aiProposalApplyRecoveryVisualSmokeContract') &&
    visualSmokeBridge.includes(visualSmokeContract) &&
    visualSmokeBridge.includes('ai_activity_opened_via_ai_hub') &&
    visualSmokeBridge.includes('expectedPanelId"] = "ai_hub"'),
  'main.gd must expose a dedicated proposal/apply visual smoke bridge that opens the AI hub.',
)

assert.ok(
  runnerSource.includes(`"${visualSmokeAction}"`) &&
    runnerSource.includes('PLAYER_HISTORY_AI_PROPOSAL_APPLY_SEEDED_ACTIONS') &&
    runnerSource.includes('_seed_player_history_ai_proposal_apply') &&
    runnerSource.includes('_validate_player_history_ai_proposal_apply_recovery_visual_smoke'),
  'visual smoke runner must register, seed, and validate the proposal/apply screenshot action.',
)

assert.ok(
  packageJson.includes('"test:godot:player-history-ai-proposal-apply-visual-smoke-contract"'),
  'package.json must expose the formal proposal/apply visual smoke contract command.',
)

assert.ok(
  handoff.includes('Stage 621') &&
    handoff.includes(visualSmokeAction) &&
    handoff.includes(visualSmokeContract) &&
    productAuthority.includes('Stage 621') &&
    productAuthority.includes(visualSmokeAction) &&
    productAuthority.includes(visualSmokeContract),
  'CURRENT handoff and product authority must record Stage 621 proposal/apply screenshot gate.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'debug', 'snake_case']) {
  assert.equal(playerFeedback.includes(forbidden), false, `proposal/apply visual feedback leaked engineering term: ${forbidden}`)
}

console.log('[godot_player_history_ai_proposal_apply_visual_smoke_contract] all checks passed')
