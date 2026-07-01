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

const presenter = read('godot-client/scripts/ui/presenters/ai_panel_presenter.gd')
const aiPanel = read('godot-client/scripts/ui/ai_panel.gd')
const mainSource = read('godot-client/scripts/app/main.gd')
const runner = read('godot-client/tools/run_mainline_visual_smoke.py')
const packageJson = read('package.json')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const productAuthority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')

const contract = 'ai_proposal_decision_surface_v1'
const action = 'player_history_ai_proposal_apply_panel_open'
const agendaSection = presenter.slice(presenter.indexOf('"agenda": {'), presenter.indexOf('"context": {'))
const decisionBlocks = functionSource(presenter, 'func _build_ai_proposal_decision_surface_blocks(proposal: Dictionary) -> Array:')
const decisionHero = functionSource(presenter, 'func _build_ai_proposal_decision_hero(proposal: Dictionary) -> Dictionary:')
const decisionItems = functionSource(presenter, 'func _build_ai_proposal_decision_items(proposal: Dictionary) -> Array:')
const decisionActions = functionSource(presenter, 'func _build_ai_proposal_decision_actions(proposal: Dictionary) -> Array:')
const decisionSource = [decisionBlocks, decisionHero, decisionItems, decisionActions].join('\n')
const proposalBridge = functionSource(mainSource, 'func _press_mainline_visual_smoke_player_history_ai_proposal_apply(panel_id: String) -> Dictionary:')
const surfaceOpen = functionSource(mainSource, 'func _open_player_history_timeline_recovery_surface(target_surface: String) -> void:')
const proposalValidator = functionSource(runner, 'def _validate_player_history_ai_proposal_apply_recovery_visual_smoke(')

assert.ok(
  presenter.includes(`AI_PROPOSAL_DECISION_SURFACE_CONTRACT := "${contract}"`) &&
    presenter.includes('var ai_proposal_decision_surface := _resolve_primary_actionable_ai_proposal(ai_player_proposal_items)') &&
    agendaSection.includes('content_first_mode') &&
    agendaSection.includes('_build_ai_proposal_decision_surface_blocks(ai_proposal_decision_surface)'),
  'AIPanelPresenter must switch agenda into a content-first proposal decision surface when a pending proposal exists.',
)

assert.ok(
  decisionBlocks.includes('AIProposalDecisionHeroBlock') &&
    decisionBlocks.includes('AIProposalDecisionEssentialsBlock') &&
    decisionBlocks.includes('AIProposalDecisionActionBlock') &&
    decisionSource.includes('AI 想做什么') &&
    decisionSource.includes('你会失去或得到什么') &&
    decisionSource.includes('要批准这件事吗'),
  'decision surface must use sparse player-facing Chinese blocks for intent, consequence, and the decision question.',
)

assert.ok(
  decisionActions.includes('ai_player_proposal_approve:') &&
    decisionActions.includes('ai_player_proposal_reject:') &&
    decisionActions.includes('"label": "批准"') &&
    decisionActions.includes('"label": "驳回"') &&
    decisionActions.includes('"font_size": 28') &&
    decisionActions.includes('"min_height": 82'),
  'decision actions must be large real Godot buttons with approve/reject action ids.',
)

assert.ok(
  aiPanel.includes('aiPanelProposalDecisionSurfaceContract') &&
    aiPanel.includes('aiPanelProposalDecisionSurfacePlayerUiAccepted') &&
    aiPanel.includes('aiPanelProposalDecisionApproveActionVisible') &&
    aiPanel.includes('aiPanelProposalDecisionRejectActionVisible') &&
    aiPanel.includes('aiPanelProposalDecisionForbiddenCopyClear'),
  'AI panel smoke summary must expose proposal decision acceptance fields.',
)

assert.ok(
  mainSource.includes('_seed_mainline_visual_smoke_ai_proposal_decision_surface') &&
    surfaceOpen.includes('_open_overlay_panel_with_page("ai_hub", "agenda")') &&
    proposalBridge.includes('aiProposalDecisionSurfaceSummary') &&
    proposalBridge.includes('aiPanelProposalDecisionSurfacePlayerUiAccepted'),
  'main.gd must seed the Godot AI hub proposal snapshot and open the agenda decision page from player-history recovery.',
)

assert.ok(
  runner.includes('aiHubProposalDecisionSurfaceAccepted') &&
    proposalValidator.includes('aiProposalDecisionSurfaceSummary') &&
    proposalValidator.includes('aiPanelProposalDecisionSurfacePlayerUiAccepted') &&
    proposalValidator.includes('playerHistoryAiProposalDecisionSurfaceNotAccepted'),
  'visual smoke runner must gate the proposal/apply screenshot on the AI hub decision surface.',
)

assert.ok(
  packageJson.includes('"test:godot:ai-hub-proposal-decision-surface-contract"'),
  'package.json must expose the formal AI hub proposal decision surface contract command.',
)

assert.ok(
  handoff.includes('Stage 622') &&
    handoff.includes(action) &&
    handoff.includes(contract) &&
    productAuthority.includes('Stage 622') &&
    productAuthority.includes(action) &&
    productAuthority.includes(contract),
  'CURRENT handoff and player-history authority must record Stage 622 decision-surface screenshot gate.',
)

for (const forbidden of ['read model', 'authority', 'tier', 'backend', 'contract id', 'debug', 'snake_case', 'proposalId', 'worldAction', 'queuePlanExecution', 'JSON']) {
  assert.equal(decisionSource.includes(forbidden), false, `decision copy leaked engineering term: ${forbidden}`)
}

console.log('[godot_ai_hub_proposal_decision_surface_contract] all checks passed')
