import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function extractJsonBlock(source: string): any {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'anchor doc must include one fenced json block')
  return JSON.parse(match[1])
}

function blockSource(source: string, signature: string, nextMarker: string): string {
  const start = source.indexOf(signature)
  assert.ok(start >= 0, `missing block ${signature}`)
  const next = source.indexOf(nextMarker, start + signature.length)
  return source.slice(start, next > start ? next : source.length)
}

const anchorDocPath = 'docs/GODOT_AI_PROPOSAL_GAMEPLAY_ANCHOR_CURRENT_2026_06_17.md'
const packageJson = JSON.parse(readUtf8('package.json'))

assert.equal(
  packageJson.scripts?.['test:godot:ai-proposal-gameplay-anchor-contract'],
  'tsx server/tests/godot_ai_proposal_gameplay_anchor_contract.test.ts',
  'package.json must expose the AI proposal gameplay anchor contract',
)

assert.ok(existsSync(anchorDocPath), `missing AI proposal gameplay anchor doc: ${anchorDocPath}`)
const anchorDoc = readUtf8(anchorDocPath)
assertIncludes(anchorDoc, 'Status: current Godot AI proposal gameplay anchor', 'anchor doc status')
assertIncludes(anchorDoc, 'Stage 813', 'anchor doc stage marker')
assertIncludes(anchorDoc, '/api/ai/players/proposals', 'anchor doc server route')
assertIncludes(anchorDoc, '/approve', 'anchor doc approve route')
assertIncludes(anchorDoc, 'not a full proposal execution proof', 'anchor doc scope boundary')

const anchor = extractJsonBlock(anchorDoc)
assert.equal(anchor.status, 'current Godot AI proposal gameplay anchor')
assert.equal(anchor.stage, 813)
assert.equal(anchor.anchorId, 'ai_proposal_approve_decision_result')
assert.equal(anchor.clickAction, 'ai_hub_proposal_approve_result_smoke')
assert.equal(anchor.playerVisibleSurface, 'ai_hub_proposal_approval_result')
assert.equal(
  anchor.formalCommand,
  'npm.cmd run godot:mainline:visual-smoke -- --click-action ai_hub_proposal_approve_result_smoke --window-width 1920 --window-height 1080 --isolated-backend-state --timeout-sec 280 --backend-timeout-sec 180 --evidence-dir tmp/stage813_ai_proposal_gameplay_anchor',
)

for (const clientFile of [
  'godot-client/scripts/app/main.gd',
  'godot-client/scripts/app/adapters/slg_domain_action_adapter.gd',
  'godot-client/scripts/infra/http/backend_api_client.gd',
  'godot-client/scripts/ui/ai_panel.gd',
  'godot-client/scripts/ui/presenters/ai_panel_presenter.gd',
]) {
  assert.ok(anchor.ownership.clientOwned.includes(clientFile), `anchor client ownership must include ${clientFile}`)
}

for (const serverFile of [
  'server/src/routes/aiPlayerProposalRoutes.ts',
  'server/src/routes/aiPlayerRuntimeRoutes.ts',
  'server/src/application/ai/aiPlayerProposalLifecycle.ts',
  'server/src/application/ai/aiPlayerProposalExecution.ts',
  'server/src/application/ai/aiPlayerSubjectReadModel.ts',
  'shared/contracts/aiPlayer.ts',
  'shared/schemas/aiPlayer.ts',
]) {
  assert.ok(anchor.ownership.serverOwned.includes(serverFile), `anchor server ownership must include ${serverFile}`)
}

for (const contractFile of [
  'godot-client/tools/run_mainline_visual_smoke.py',
  'server/tests/godot_ai_hub_proposal_decision_surface_contract.test.ts',
  'server/tests/godot_ai_hub_proposal_mutation_result_visual_smoke_contract.test.ts',
  'server/tests/ai_player_http_model_proposal_contract.test.ts',
  'server/tests/ai_player_runtime_model_proposal_contract.test.ts',
  'server/tests/ai_player_subject_read_model_contract.test.ts',
  'server/tests/player_history_ai_execution_receipt_producer_contract.test.ts',
]) {
  assert.ok(anchor.ownership.sharedContract.includes(contractFile), `anchor shared contract must include ${contractFile}`)
}

for (const requiredAiReadBoundary of [
  'GET /api/ai/players/:id/subject',
  'recentBodyChanges',
  'recentHistoryAnchors',
  'recentReceipts',
  'sourceRefsVisibility=internal_link_only',
  'no provider key',
  'no restore token',
  'no Godot cache authority',
]) {
  assert.ok(anchor.ownership.aiRead.includes(requiredAiReadBoundary), `anchor AI-read boundary must include ${requiredAiReadBoundary}`)
}

for (const requiredGodotField of [
  'aiProposalMutationResultVisualSmokeContract',
  'aiProposalMutationResultAccepted',
  'aiProposalMutationResultKind',
  'aiProposalMutationResultStatus',
  'aiProposalMutationResultRemoteOk',
  'aiProposalDecisionSurfaceSummary',
  'aiProposalMutationResultSummary',
  'aiPanelProposalDecisionSurfacePlayerUiAccepted',
  'aiPanelProposalDecisionApproveActionVisible',
  'aiPanelProposalDecisionRejectActionVisible',
  'aiPanelProposalMutationResultAccepted',
  'aiPanelProposalMutationResultShellAccepted',
  'aiPanelProposalMutationResultForbiddenCopyClear',
  'aiPanelProposalDecisionStyleOwner',
]) {
  assert.ok(anchor.requiredGodotFields.includes(requiredGodotField), `anchor Godot fields must include ${requiredGodotField}`)
}

for (const requiredRouteField of [
  'proposalId',
  'aiPlayerId',
  'governorPlayerId',
  'action',
  'status',
  'approvedBy',
  'approvedAt',
  'requiresApproval',
  'recoveryHint',
  'receipt',
]) {
  assert.ok(anchor.requiredServerRouteFields.includes(requiredRouteField), `anchor server route fields must include ${requiredRouteField}`)
}

assert.deepEqual(anchor.evidence, {
  summaryPath: 'tmp/stage813_ai_proposal_gameplay_anchor/mainline_visual_smoke_summary.json',
  godotReportPath: 'tmp/stage813_ai_proposal_gameplay_anchor/godot_visual_smoke_report.json',
  screenshotPath: 'tmp/stage813_ai_proposal_gameplay_anchor/01_after_ai_hub_proposal_approve_result_smoke.png',
})

for (const command of [
  'npm.cmd run test:godot:ai-proposal-gameplay-anchor-contract',
  'npm.cmd run test:godot:ai-hub-proposal-decision-surface-contract',
  'npm.cmd run test:godot:ai-hub-proposal-mutation-result-visual-smoke-contract',
  'npm.cmd run test:ai:player-http-model-proposal-contract',
  'npm.cmd run test:ai:runtime-model-proposal-contract',
  'npm.cmd run test:ai:player-subject-read-model-contract',
  'npm.cmd run test:world:player-history-ai-execution-receipt-producer-contract',
  anchor.formalCommand,
]) {
  assert.ok(anchor.formalVerification.includes(command), `anchor formal verification must include ${command}`)
}

const mainSource = readUtf8('godot-client/scripts/app/main.gd')
const dispatchSource = blockSource(
  mainSource,
  'func _run_mainline_visual_smoke_click_action(click_action: String, panel_id: String) -> Dictionary:',
  '\nfunc ',
)
for (const requiredDispatchToken of [
  '"ai_hub_proposal_approve_result_smoke":',
  'return await _press_mainline_visual_smoke_ai_hub_proposal_mutation_result(panel_id, "approve")',
]) {
  assertIncludes(dispatchSource, requiredDispatchToken, 'Godot AI proposal approve dispatch')
}

const mutationHelper = blockSource(
  mainSource,
  'func _press_mainline_visual_smoke_ai_hub_proposal_mutation_result(panel_id: String, mutation: String) -> Dictionary:',
  '\nfunc ',
)
for (const requiredMainToken of [
  'SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID',
  '_seed_mainline_visual_smoke_ai_proposal_decision_surface()',
  '_on_snapshot_overlay_page_action_requested("agenda", clicked_action_id)',
  'aiProposalMutationResultVisualSmokeContract',
  'aiProposalMutationResultRemoteOk',
  'aiProposalDecisionSurfaceSummary',
  'aiProposalMutationResultSummary',
]) {
  assertIncludes(mutationHelper, requiredMainToken, 'Godot AI proposal mutation helper')
}

const seedHelper = blockSource(mainSource, 'func _seed_mainline_visual_smoke_ai_proposal_decision_surface() -> void:', '\nfunc ')
for (const requiredSeedToken of [
  'SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID',
  'SLG_MAINLINE_VISUAL_SMOKE_AI_PLAYER_ID',
  'SLG_MAINLINE_VISUAL_SMOKE_AI_GOVERNOR_PLAYER_ID',
]) {
  assertIncludes(seedHelper, requiredSeedToken, 'Godot AI proposal seed helper')
}

const runner = readUtf8('godot-client/tools/run_mainline_visual_smoke.py')
const runnerSeed = blockSource(runner, 'def _seed_player_history_ai_proposal_apply(', '\ndef ')
const runnerValidator = blockSource(runner, 'def _validate_ai_hub_proposal_mutation_result_visual_smoke(', '\ndef ')
for (const requiredRunnerToken of [
  '"ai_hub_proposal_approve_result_smoke"',
  'SLG_MAINLINE_VISUAL_SMOKE_AI_PROPOSAL_ID',
  'SLG_MAINLINE_VISUAL_SMOKE_AI_PLAYER_ID',
  'SLG_MAINLINE_VISUAL_SMOKE_AI_GOVERNOR_PLAYER_ID',
]) {
  assertIncludes(runner, requiredRunnerToken, 'visual smoke runner AI proposal action/env')
}
for (const requiredRunnerSeedToken of [
  '"POST"',
  '"/api/ai/players/proposals"',
  'status=pending_approval&limit=10',
  'proposal_status == "pending_approval"',
  '"proposalId"',
  '"aiPlayerId"',
  '"governorPlayerId"',
]) {
  assertIncludes(runnerSeed, requiredRunnerSeedToken, 'visual smoke runner AI proposal server seed')
}
for (const requiredRunnerValidatorToken of [
  'aiProposalMutationResultVisualSmokeContract',
  'aiProposalMutationResultAccepted',
  'aiProposalMutationResultKind',
  'aiProposalMutationResultStatus',
  'aiProposalMutationResultRemoteOk',
  'aiPanelProposalMutationResultForbiddenCopyClear',
]) {
  assertIncludes(runnerValidator, requiredRunnerValidatorToken, 'visual smoke runner AI proposal result validator')
}

const adapter = readUtf8('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd')
const approveMutation = blockSource(adapter, 'func request_ai_player_proposal_approve(proposal_id: String) -> Dictionary:', '\nfunc ')
const adapterAction = blockSource(adapter, 'func request_ai_panel_action(action_id: String, tab_id: String) -> Dictionary:', '\nfunc ')
for (const requiredAdapterToken of [
  'approve_ai_player_proposal',
  '_store_ai_player_proposal_mutation_result("approve", response)',
  'remote_applied',
  'ai_proposal_approved',
]) {
  assertIncludes(approveMutation, requiredAdapterToken, 'Godot AI proposal approve adapter')
}
assertIncludes(adapterAction, 'action_id.begins_with("ai_player_proposal_approve:")', 'Godot AI panel action router')

const backendApiClient = readUtf8('godot-client/scripts/infra/http/backend_api_client.gd')
for (const requiredClientApiToken of [
  'func get_ai_player_proposals',
  'func approve_ai_player_proposal(proposal_id: String, approved_by: String) -> Dictionary:',
  'func reject_ai_player_proposal(proposal_id: String, rejected_by: String, reason: String = "") -> Dictionary:',
  'func execute_ai_player_proposal(proposal_id: String, executed_by: String, include_world: bool = false) -> Dictionary:',
  '/api/ai/players/proposals/%s/approve',
  '/api/ai/players/proposals/%s/reject',
  '/api/ai/players/proposals/%s/execute',
]) {
  assertIncludes(backendApiClient, requiredClientApiToken, 'BackendApiClient AI proposal route boundary')
}

const aiPanel = readUtf8('godot-client/scripts/ui/ai_panel.gd')
const presenter = readUtf8('godot-client/scripts/ui/presenters/ai_panel_presenter.gd')
for (const requiredUiToken of [
  'AI_PROPOSAL_DECISION_SURFACE_CONTRACT := "ai_proposal_decision_surface_v1"',
  'AI_PROPOSAL_MUTATION_RESULT_CONTRACT := "ai_proposal_mutation_result_visual_smoke_v1"',
  '_build_ai_proposal_decision_surface_blocks',
  '_build_ai_proposal_mutation_result_blocks',
]) {
  assertIncludes(presenter, requiredUiToken, 'AI panel presenter proposal surface')
}
for (const requiredPanelToken of [
  'aiPanelProposalDecisionSurfacePlayerUiAccepted',
  'aiPanelProposalDecisionApproveActionVisible',
  'aiPanelProposalDecisionRejectActionVisible',
  'aiPanelProposalDecisionStyleOwner',
  'aiPanelProposalMutationResultAccepted',
  'aiPanelProposalMutationResultShellAccepted',
  'aiPanelProposalMutationResultForbiddenCopyClear',
]) {
  assertIncludes(aiPanel, requiredPanelToken, 'AI panel proposal smoke summary')
}

const proposalRoutes = readUtf8('server/src/routes/aiPlayerProposalRoutes.ts')
for (const requiredRouteToken of [
  "pathname === '/api/ai/players/proposals'",
  "operation === 'approve'",
  "operation === 'reject'",
  "operation === 'execute'",
  'approveAiPlayerActionProposal(proposalId, parsed.data)',
  'executeAiPlayerActionProposal(proposalId, parsed.data)',
]) {
  assertIncludes(proposalRoutes, requiredRouteToken, 'server AI proposal routes')
}

const runtimeRoutes = readUtf8('server/src/routes/aiPlayerRuntimeRoutes.ts')
for (const requiredRuntimeRouteToken of [
  "operation === 'model-proposals'",
  'handleModelProposalsRoute(req, res, aiPlayerId)',
  'createAiPlayerActionProposal(proposalRequest)',
  'providerFallback',
]) {
  assertIncludes(runtimeRoutes, requiredRuntimeRouteToken, 'server AI runtime model proposal route')
}

const proposalLifecycle = readUtf8('server/src/application/ai/aiPlayerProposalLifecycle.ts')
for (const requiredLifecycleToken of [
  'export function createAiPlayerActionProposal',
  'export function approveAiPlayerActionProposal',
  "status: 'approved'",
  'approvedBy: input.approvedBy',
  "action: 'ai_player_approve_proposal'",
  'export async function executeAiPlayerActionProposal',
  'proposal.status !== \'approved\'',
  'export function listAiPlayerActionReceipts',
  "visibility: 'internal_link_only'",
]) {
  assertIncludes(proposalLifecycle, requiredLifecycleToken, 'server AI proposal lifecycle authority')
}

const proposalExecution = readUtf8('server/src/application/ai/aiPlayerProposalExecution.ts')
for (const requiredExecutionToken of [
  'executeSupportedAiPlayerProposal',
  'setRecruitSelectedPool',
  'transferFactionResourcesToGovernor',
  'occupyTile',
]) {
  assertIncludes(proposalExecution, requiredExecutionToken, 'server AI proposal execution authority')
}

const subjectReadModel = readUtf8('server/src/application/ai/aiPlayerSubjectReadModel.ts')
for (const requiredSubjectToken of [
  'aiReadEntrypoint: \'GET /api/ai/players/:id/subject\'',
  'recentBodyChanges',
  'recentHistoryAnchors',
  'recentReceipts',
  'sourceRefsVisibility: \'internal_link_only\'',
  'clientMutationAllowed: false',
]) {
  assertIncludes(subjectReadModel, requiredSubjectToken, 'AI subject read-model boundary')
}

const sharedContract = readUtf8('shared/contracts/aiPlayer.ts')
for (const requiredSharedContractToken of [
  'export type AiPlayerActionProposal',
  'proposalId: string',
  'requiresApproval: boolean',
  'approvedBy?: string',
  'export type AiPlayerActionReceipt',
]) {
  assertIncludes(sharedContract, requiredSharedContractToken, 'shared AI proposal contract')
}

const sharedSchema = readUtf8('shared/schemas/aiPlayer.ts')
for (const requiredSharedSchemaToken of [
  'aiPlayerActionProposalRequestSchema',
  'approveAiPlayerProposalRequestSchema',
  'executeAiPlayerProposalRequestSchema',
]) {
  assertIncludes(sharedSchema, requiredSharedSchemaToken, 'shared AI proposal schemas')
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredHandoffToken of [
  'Stage 813 - Godot AI Proposal Gameplay Anchor',
  'tmp/stage813_ai_proposal_gameplay_anchor/01_after_ai_hub_proposal_approve_result_smoke.png',
  'npm.cmd run test:godot:ai-proposal-gameplay-anchor-contract',
]) {
  assertIncludes(currentHandoff, requiredHandoffToken, 'CURRENT handoff Stage 813')
}

for (const docPath of [
  'docs/CLIENT_SERVER_AI_AUTHORITY_INVENTORY_CURRENT_2026_06_15.md',
  'docs/CLIENT_SERVER_AI_AUTHORITY_BOUNDARY_PLAN_CURRENT_2026_06_15.md',
  'docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md',
  'docs/superpowers/plans/2026-06-16-client-server-ai-ops-release-lane-roadmap.md',
]) {
  const source = readUtf8(docPath)
  assertIncludes(source, 'Stage 813', `${docPath} Stage 813 record`)
  assertIncludes(source, anchorDocPath, `${docPath} anchor doc link`)
}
