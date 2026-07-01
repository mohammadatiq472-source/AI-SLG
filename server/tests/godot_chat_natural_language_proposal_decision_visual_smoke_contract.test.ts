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

const mainSource = read('godot-client/scripts/app/main.gd')
const chatOverlay = read('godot-client/scripts/ui/main_chat_overlay.gd')
const apiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')
const service = read('server/src/application/ai/aiPlayerChatCommandService.ts')
const httpContract = read('server/tests/ai_player_http_chat_command_contract.test.ts')
const packageJson = read('package.json')

const approveAction = 'shell_chat_natural_language_proposal_approve'
const rejectAction = 'shell_chat_natural_language_proposal_reject'
const decisionContract = 'chat_natural_language_proposal_decision_visual_smoke_v1'
const decisionSource = 'chat_natural_language_proposal_decision'

const clickDispatcher = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
const smokeHelper = functionSource(mainSource, 'func _press_mainline_visual_smoke_shell_chat_natural_language_proposal_decision(decision: String) -> Dictionary:')
const overlaySmokeHelper = functionSource(chatOverlay, 'func run_mainline_visual_smoke_natural_language_decision(command_text: String) -> Dictionary:')
const overlaySummary = functionSource(chatOverlay, 'func get_chat_message_visual_smoke_summary() -> Dictionary:')
const runnerValidator = functionSource(runner, 'def _validate_chat_natural_language_proposal_decision_visual_smoke(')

assert.ok(
  packageJson.includes('"test:godot:chat-natural-language-proposal-decision-visual-smoke-contract"'),
  'package.json must expose the chat natural-language proposal decision visual smoke contract.',
)

assert.ok(
  runner.includes(`"${approveAction}"`) &&
    runner.includes(`"${rejectAction}"`) &&
    runner.includes('PLAYER_HISTORY_AI_PROPOSAL_APPLY_SEEDED_ACTIONS') &&
    runner.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID') &&
    runnerValidator.includes(decisionContract) &&
    runnerValidator.includes('chatNaturalLanguageProposalDecisionRemoteStatus'),
  'runner must register approve/reject chat decision actions, seed a real pending proposal, pass it to Godot, and validate remote status.',
)

assert.ok(
  clickDispatcher.includes(`"${approveAction}"`) &&
    clickDispatcher.includes(`"${rejectAction}"`) &&
    clickDispatcher.includes('_press_mainline_visual_smoke_shell_chat_natural_language_proposal_decision("approve")') &&
    clickDispatcher.includes('_press_mainline_visual_smoke_shell_chat_natural_language_proposal_decision("reject")'),
  'main.gd must dispatch formal chat natural-language approve/reject smoke actions.',
)

assert.ok(
  smokeHelper.includes('open_ai_player_channel') &&
    smokeHelper.includes('run_mainline_visual_smoke_natural_language_decision') &&
    smokeHelper.includes('get_ai_player_proposal') &&
    smokeHelper.includes(decisionContract) &&
    smokeHelper.includes('chatNaturalLanguageProposalDecisionForbiddenCopyClear'),
  'main.gd smoke helper must use the real chat channel, real backend proposal readback, and visible-copy governance.',
)

assert.ok(
  overlaySmokeHelper.includes('_send_current_input') &&
    overlaySmokeHelper.includes(decisionSource) &&
    overlaySummary.includes('chatLatestAiDecisionSource') &&
    overlaySummary.includes('chatLatestAiDecisionStatus'),
  'MainChatOverlay must drive the existing send path and expose decision metadata in visual smoke summary.',
)

assert.ok(
  apiClient.includes('func send_ai_player_chat_message(') &&
    apiClient.includes('func get_ai_player_proposal('),
  'BackendApiClient must expose real chat send and proposal readback routes.',
)

assert.ok(
  service.includes('resolveNaturalLanguageProposalDecision') &&
    service.includes('resolveLatestPendingProposalForChatDecision') &&
    service.includes('approveAiPlayerActionProposal') &&
    service.includes('rejectAiPlayerActionProposal') &&
    service.includes(decisionSource) &&
    service.includes('已批准。等我执行后再回报。') &&
    service.includes('已驳回。我不会执行这件事。'),
  'chat service must resolve natural-language approve/reject into real proposal lifecycle mutations and short AI replies.',
)

assert.ok(
  httpContract.includes('testChatCommandApprovesAndRejectsLatestPendingProposalByNaturalLanguage') &&
    httpContract.includes('批准刚才这个方案') &&
    httpContract.includes('驳回刚才那个方案') &&
    httpContract.includes(decisionSource),
  'HTTP contract must cover approve and reject natural-language chat decisions.',
)

console.log('[godot_chat_natural_language_proposal_decision_visual_smoke_contract] all checks passed')
