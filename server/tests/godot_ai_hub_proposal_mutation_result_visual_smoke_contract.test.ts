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
const adapter = read('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
const apiClient = read('godot-client/scripts/infra/http/backend_api_client.gd')
const aiPanel = read('godot-client/scripts/ui/ai_panel.gd')
const presenter = read('godot-client/scripts/ui/presenters/ai_panel_presenter.gd')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')
const packageJson = read('package.json')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const productAuthority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

const approveAction = 'ai_hub_proposal_approve_result_smoke'
const rejectAction = 'ai_hub_proposal_reject_result_smoke'
const mutationContract = 'ai_proposal_mutation_result_visual_smoke_v1'

const clickDispatcher = functionSource(mainSource, 'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:')
const approveHelper = functionSource(mainSource, 'func _press_mainline_visual_smoke_ai_hub_proposal_mutation_result(panel_id: String, mutation: String) -> Dictionary:')
const seedHelper = functionSource(mainSource, 'func _seed_mainline_visual_smoke_ai_proposal_decision_surface() -> void:')
const adapterAction = functionSource(adapter, 'func request_ai_panel_action(action_id: String, tab_id: String) -> Dictionary:')
const approveMutation = functionSource(adapter, 'func request_ai_player_proposal_approve(proposal_id: String) -> Dictionary:')
const rejectMutation = functionSource(adapter, 'func request_ai_player_proposal_reject(proposal_id: String) -> Dictionary:')
const summaryFunc = functionSource(aiPanel, 'func get_mainline_visual_smoke_summary(page_id: String = "") -> Dictionary:')
const runnerValidator = functionSource(runner, 'def _validate_ai_hub_proposal_mutation_result_visual_smoke(')

assert.ok(
  packageJson.includes('"test:godot:ai-hub-proposal-mutation-result-visual-smoke-contract"'),
  'package.json must expose Stage 623 mutation-result visual smoke contract.',
)

assert.ok(
  runner.includes(`"${approveAction}"`) &&
    runner.includes(`"${rejectAction}"`) &&
    runner.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID') &&
    runner.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_PLAYER_ID') &&
    runner.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_GOVERNOR_PLAYER_ID') &&
    runnerValidator.includes('aiProposalMutationResultAccepted') &&
    runnerValidator.includes('aiProposalMutationResultKind'),
  'runner must register approve/reject result actions, pass the real seeded proposal id to Godot, and validate mutation result screenshots.',
)

assert.ok(
  clickDispatcher.includes(`"${approveAction}"`) &&
    clickDispatcher.includes(`"${rejectAction}"`) &&
    clickDispatcher.includes('_press_mainline_visual_smoke_ai_hub_proposal_mutation_result(panel_id, "approve")') &&
    clickDispatcher.includes('_press_mainline_visual_smoke_ai_hub_proposal_mutation_result(panel_id, "reject")') &&
    approveHelper.includes('ai_player_proposal_approve:') &&
    approveHelper.includes('ai_player_proposal_reject:') &&
    approveHelper.includes('aiProposalMutationResultVisualSmokeContract') &&
    approveHelper.includes(mutationContract),
  'main.gd must provide formal click actions that click real approve/reject buttons and verify mutation result summary.',
)

assert.ok(
  seedHelper.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID') &&
    seedHelper.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_PLAYER_ID') &&
    seedHelper.includes('SLG_MAINLINE_VISUAL_SMOKE_AI_GOVERNOR_PLAYER_ID'),
  'Godot proposal decision seed must use the real proposal ids passed from the runner.',
)

assert.ok(
  apiClient.includes('func reject_ai_player_proposal(proposal_id: String, rejected_by: String, reason: String = "") -> Dictionary:') &&
    apiClient.includes('/api/ai/players/proposals/%s/reject'),
  'BackendApiClient must expose the real reject proposal mutation route.',
)

assert.ok(
  adapterAction.includes('action_id.begins_with("ai_player_proposal_approve:")') &&
    adapterAction.includes('action_id.begins_with("ai_player_proposal_reject:")') &&
    approveMutation.includes('approve_ai_player_proposal') &&
    rejectMutation.includes('reject_ai_player_proposal') &&
    approveMutation.includes('ai_proposal_approved') &&
    rejectMutation.includes('ai_proposal_rejected'),
  'Godot action adapter must route approve/reject buttons to real proposal mutation APIs and update local AI state.',
)

assert.ok(
  presenter.includes('AI_PROPOSAL_MUTATION_RESULT_CONTRACT := "ai_proposal_mutation_result_visual_smoke_v1"') &&
    presenter.includes('_build_ai_proposal_mutation_result_blocks') &&
    presenter.includes('已批准') &&
    presenter.includes('已驳回') &&
    presenter.includes('AIProposalMutationResultBlock'),
  'AIPanelPresenter must translate mutation results into sparse player-facing result blocks.',
)

assert.ok(
  summaryFunc.includes('aiPanelProposalMutationResultContract') &&
    summaryFunc.includes('aiPanelProposalMutationResultAccepted') &&
    summaryFunc.includes('aiPanelProposalMutationResultKind') &&
    summaryFunc.includes('aiPanelProposalMutationResultForbiddenCopyClear'),
  'AI panel summary must expose accepted approve/reject result screenshot fields.',
)

assert.ok(
  handoff.includes('Stage 623') &&
    handoff.includes(approveAction) &&
    handoff.includes(rejectAction) &&
    handoff.includes(mutationContract) &&
    productAuthority.includes('Stage 623') &&
    productAuthority.includes(approveAction) &&
    productAuthority.includes(rejectAction) &&
    productAuthority.includes(mutationContract),
  'CURRENT handoff and player-history authority must record Stage 623 approve/reject result screenshot gate.',
)

console.log('[godot_ai_hub_proposal_mutation_result_visual_smoke_contract] all checks passed')
