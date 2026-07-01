import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function assertBefore(source: string, before: string, after: string, label: string): void {
  const beforeIndex = source.indexOf(before)
  const afterIndex = source.indexOf(after)
  assert.ok(beforeIndex >= 0, `${label} must include ${before}`)
  assert.ok(afterIndex >= 0, `${label} must include ${after}`)
  assert.ok(beforeIndex < afterIndex, `${label} must place ${before} before ${after}`)
}

function blockSource(source: string, signature: string, nextMarker: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing block ${signature}`)
  const end = source.indexOf(nextMarker, start + signature.length)
  return source.slice(start, end > start ? end : source.length)
}

function extractJsonBlock(source: string): Record<string, unknown> {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'anchor doc must include one fenced json block')
  return JSON.parse(match[1]) as Record<string, unknown>
}

const anchorDocPath = 'docs/GODOT_AI_PROPOSAL_EXECUTE_RECEIPT_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const packageJson = JSON.parse(readUtf8('package.json')) as { scripts?: Record<string, string> }

assert.equal(
  packageJson.scripts?.['test:godot:ai-proposal-execute-receipt-gameplay-anchor-contract'],
  'tsx server/tests/godot_ai_proposal_execute_receipt_gameplay_anchor_contract.test.ts',
  'package.json must expose the Stage 819 AI proposal execute receipt anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing Stage 819 anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
for (const token of [
  'Stage 819',
  'server/receipt-ready; direct Godot execute UI absent',
  '/api/ai/players/proposals/:proposalId/execute',
  'approval_only_ui_guard',
  'player_history_ai_execution_receipt_panel_open',
  'not a direct client execute button',
]) {
  assertIncludes(anchorDoc, token, 'Stage 819 anchor doc')
}

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current AI proposal execute receipt boundary anchor')
assert.equal(anchor.stage, 819)
assert.equal(anchor.anchorId, 'ai_proposal_execute_receipt_boundary')
assert.equal(anchor.directExecuteClientUi, 'absent_guarded')
assert.equal(anchor.serverExecuteRoute, '/api/ai/players/proposals/:proposalId/execute')
assert.equal(anchor.visibleGodotReceiptAction, 'player_history_ai_execution_receipt_panel_open')
assert.equal(anchor.approvalOnlyGuardAction, 'ai_panel_pending_proposals_review_guard')
assert.equal(anchor.godotCacheMayExecute, false)

const adapter = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const aiPanel = readUtf8('godot-client/scripts/ui/ai_panel.gd')
const runner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
const proposalRoutes = readUtf8('server/src/routes/aiPlayerProposalRoutes.ts')
const proposalLifecycle = readUtf8('server/src/application/ai/aiPlayerProposalLifecycle.ts')
const proposalExecution = readUtf8('server/src/application/ai/aiPlayerProposalExecution.ts')
const aiPlayerSchema = readUtf8('shared/schemas/aiPlayer.ts')
const producerContract = readUtf8('server/tests/player_history_ai_execution_receipt_producer_contract.test.ts')
const receiptVisualContract = readUtf8('server/tests/godot_player_history_ai_execution_receipt_visual_smoke_contract.test.ts')

const latestExecute = blockSource(adapter, 'func request_ai_player_latest_proposal_execute() -> Dictionary:', '\nfunc ')
for (const token of [
  'AI_PANEL_DIRECT_PROPOSAL_EXECUTE_ENABLED := false',
  'approval_only_ui_guard',
  'remote_attempted": false',
  'execute_ai_player_proposal(proposal_id, approved_by, true)',
]) {
  assertIncludes(adapter, token, 'Godot adapter proposal execute guard')
}
assertBefore(
  latestExecute,
  'if not AI_PANEL_DIRECT_PROPOSAL_EXECUTE_ENABLED:',
  'execute_ai_player_proposal(proposal_id, approved_by, true)',
  'Godot adapter proposal execute guard',
)

const pendingProposalGuard = blockSource(
  mainSource,
  'func _press_mainline_visual_smoke_ai_panel_pending_proposals_review_guard(panel_id: String) -> Dictionary:',
  '\nfunc ',
)
for (const token of [
  'request_ai_player_latest_proposal_execute',
  'approval_only_ui_guard',
  'aiApprovalOnlyExecuteGuardVerified',
  'not direct_execute_action_visible',
]) {
  assertIncludes(pendingProposalGuard, token, 'Godot AI pending proposal approval-only guard')
}

for (const token of [
  'func _ai_visual_smoke_has_direct_execute_action() -> bool:',
  'ai_player_latest_proposal_execute',
  'ai_player_proposal_execute',
  'ai_player_direct_suggested_action_execute',
]) {
  assertIncludes(aiPanel, token, 'AI panel direct execute action detector')
}

for (const token of [
  '"ai_panel_pending_proposals_review_guard"',
  '"player_history_ai_execution_receipt_panel_open"',
  'PLAYER_HISTORY_AI_EXECUTION_RECEIPT_SEEDED_ACTIONS',
  '_seed_player_history_ai_execution_receipt',
  '_validate_player_history_ai_execution_receipt_recovery_visual_smoke',
]) {
  assertIncludes(runner, token, 'Godot runner Stage 819 guard/receipt evidence')
}

for (const token of [
  'handleExecuteProposalRoute',
  "operation === 'execute'",
  'executeAiPlayerActionProposal',
]) {
  assertIncludes(proposalRoutes, token, 'server proposal execute route')
}

for (const token of [
  'executeAiPlayerProposalRequestSchema',
  'executedBy: z.string().trim().min(1).max(80)',
  'includeWorld: z.boolean().optional()',
]) {
  assertIncludes(aiPlayerSchema, token, 'shared execute proposal request schema')
}

for (const token of [
  'export async function executeAiPlayerActionProposal',
  'AiPlayerActionReceipt',
  'receipt',
  'proposalId',
]) {
  assertIncludes(proposalLifecycle, token, 'server proposal lifecycle execute authority')
}

for (const token of [
  'export async function executeSupportedAiPlayerProposal',
  'worldAction',
  'includeWorld',
]) {
  assertIncludes(proposalExecution, token, 'server proposal execution dispatch authority')
}

for (const token of [
  '/api/ai/players/proposals',
  '/execute',
  'receipt',
  'playerHistoryCategory',
  'recentBodyChanges',
  'recentHistoryAnchors',
]) {
  assertIncludes(producerContract, token, 'server execution receipt and AI-read producer contract')
}

for (const token of [
  'player_history_ai_execution_receipt_panel_open',
  'player_history_ai_execution_receipt_recovery_visual_smoke_v1',
  'player_history_ai_execution_receipt_recovery_v1',
]) {
  assertIncludes(receiptVisualContract, token, 'Godot execution receipt visible recovery contract')
}

for (const path of [
  'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md',
  'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md',
  'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md',
]) {
  const doc = readUtf8(path)
  for (const token of [
    'Stage 819',
    'test:godot:ai-proposal-execute-receipt-gameplay-anchor-contract',
    'server/receipt-ready; direct Godot execute UI absent',
  ]) {
    assertIncludes(doc, token, `${path} Stage 819 record`)
  }
}
