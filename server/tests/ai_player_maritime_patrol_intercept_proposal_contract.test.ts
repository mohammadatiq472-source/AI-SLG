import assert from 'node:assert/strict'
import type { AiPlayerActionProposal } from '../../shared/contracts/aiPlayer'
import { getWorldStateReadonly, resetWorldServiceForTests } from '../src/application/world/WorldService'
import { listStaticAiPlayerActionCatalog } from '../src/application/ai/aiPlayerActionCatalog'
import { executeSupportedAiPlayerProposal } from '../src/application/ai/aiPlayerProposalExecution'
import { parseAiPlayerActionProposalRequest } from '../../shared/schemas/aiPlayer'
import {
  approveAiPlayerActionProposal,
  createAiPlayerActionProposal,
  executeAiPlayerActionProposal,
  listAiPlayerActionReceipts,
  registerGovernedAiPlayer,
  resetAiPlayerGovernanceServiceForTests,
} from '../src/application/ai/AIPlayerGovernanceService'
import { listAiPlayerExecutionTrace } from '../src/application/ai/aiPlayerExecutionTraceReadModel'

const AI_PLAYER_ID = 'ai_player_maritime_patrol_intercept_contract'
const GOVERNOR_PLAYER_ID = 'player'
const FACTION_ID = 'player'
const ROUTE_ID = 'east_han_coastal_dock_to_wa_contact'
const SOURCE_DOCK_ID = 'east_han_coastal_dock_quanzhou'
const OVERSEAS_CONTACT_ID = 'wa_contact_scoutable'

function buildProposal(
  proposalId: string,
  action: string,
  args: Record<string, unknown>,
  createdAt: string,
): AiPlayerActionProposal {
  return {
    proposalId,
    aiPlayerId: AI_PLAYER_ID,
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    action,
    args,
    reason: `W14 maritime intercept proposal contract for ${action}`,
    riskLevel: 'medium',
    source: 'mcp',
    status: 'approved',
    requiresApproval: true,
    executableInV1: true,
    createdAt,
    updatedAt: createdAt,
    approvedAt: createdAt,
    approvedBy: GOVERNOR_PLAYER_ID,
  } as AiPlayerActionProposal
}

function buildOverseasRouteProposal(): AiPlayerActionProposal {
  return buildProposal(
    'proposal_maritime_patrol_intercept_route_open_contract',
    'overseas_route_open',
    {
      sourceDockId: SOURCE_DOCK_ID,
      overseasContactId: OVERSEAS_CONTACT_ID,
    },
    '2026-06-07T00:00:00.000Z',
  )
}

function buildMaritimePatrolScoutProposal(): AiPlayerActionProposal {
  return buildProposal(
    'proposal_maritime_patrol_intercept_scout_contract',
    'maritime_patrol_scout',
    {
      routeId: ROUTE_ID,
      sourceDockId: SOURCE_DOCK_ID,
      overseasContactId: OVERSEAS_CONTACT_ID,
    },
    '2026-06-07T00:00:02.000Z',
  )
}

function buildMaritimePatrolInterceptProposal(): AiPlayerActionProposal {
  return buildProposal(
    'proposal_maritime_patrol_intercept_contract',
    'maritime_patrol_intercept',
    {
      routeId: ROUTE_ID,
      sourceDockId: SOURCE_DOCK_ID,
      overseasContactId: OVERSEAS_CONTACT_ID,
      attackerVesselType: 'interceptor_warship',
      defenderVesselType: 'transport_warship',
    },
    '2026-06-07T00:00:04.000Z',
  )
}

async function run() {
  resetWorldServiceForTests()
  resetAiPlayerGovernanceServiceForTests()

  const catalogEntry = listStaticAiPlayerActionCatalog().find((entry) => entry.action === 'maritime_patrol_intercept')
  assert.ok(catalogEntry, 'AI catalog should expose maritime_patrol_intercept as the W14 patrol intercept action')
  assert.equal(catalogEntry.executableInV1, true)
  assert.equal(catalogEntry.requiresApprovalByDefault, true)
  assert.equal(catalogEntry.mappedWorldAction, 'seaPatrolIntercept')

  const parsed = parseAiPlayerActionProposalRequest({
    aiPlayerId: AI_PLAYER_ID,
    action: 'maritime_patrol_intercept',
    args: {
      routeId: ROUTE_ID,
      sourceDockId: SOURCE_DOCK_ID,
      overseasContactId: OVERSEAS_CONTACT_ID,
      attackerVesselType: 'interceptor_warship',
      defenderVesselType: 'transport_warship',
    },
    reason: 'Create a patrol intercept proposal after route and scout authority exist.',
    source: 'mcp',
  })
  assert.equal(parsed.action, 'maritime_patrol_intercept')

  const opened = await executeSupportedAiPlayerProposal(buildOverseasRouteProposal(), false)
  assert.ok(!('error' in opened), `overseas route proposal execution failed: ${JSON.stringify(opened)}`)
  assert.equal(opened.response.ok, true, `open route response should succeed: ${JSON.stringify(opened.response)}`)

  const blockedBeforeScout = await executeSupportedAiPlayerProposal(buildMaritimePatrolInterceptProposal(), false)
  assert.ok(!('error' in blockedBeforeScout), `intercept proposal should reach world authority: ${JSON.stringify(blockedBeforeScout)}`)
  assert.equal(blockedBeforeScout.worldAction, 'seaPatrolIntercept')
  assert.equal(blockedBeforeScout.response.ok, false, 'intercept proposal should be player-readably blocked before scout report')
  assert.equal(blockedBeforeScout.response.failureCode, 'missing_patrol_scout_report')
  assert.match(JSON.stringify(blockedBeforeScout.response), /missing_patrol_scout_report|scout/i)

  const scouted = await executeSupportedAiPlayerProposal(buildMaritimePatrolScoutProposal(), false)
  assert.ok(!('error' in scouted), `maritime patrol scout proposal execution failed: ${JSON.stringify(scouted)}`)
  assert.equal(scouted.response.ok, true, `scout response should succeed: ${JSON.stringify(scouted.response)}`)

  const execution = await executeSupportedAiPlayerProposal(buildMaritimePatrolInterceptProposal(), true)
  assert.ok(!('error' in execution), `maritime patrol intercept proposal execution failed: ${JSON.stringify(execution)}`)
  assert.equal(execution.worldAction, 'seaPatrolIntercept')
  assert.equal(execution.worldActionPayload?.routeId, ROUTE_ID)
  assert.equal(execution.worldActionPayload?.sourceDockId, SOURCE_DOCK_ID)
  assert.equal(execution.worldActionPayload?.overseasContactId, OVERSEAS_CONTACT_ID)
  assert.equal(execution.worldActionPayload?.actorAiPlayerId, AI_PLAYER_ID)
  assert.equal(execution.worldActionPayload?.attackerVesselType, 'interceptor_warship')
  assert.equal(execution.worldActionPayload?.defenderVesselType, 'transport_warship')
  assert.equal(execution.response.ok, true, `world response should succeed: ${JSON.stringify(execution.response)}`)
  assert.equal(execution.response.receipt?.action, 'seaPatrolIntercept')
  assert.equal(execution.response.receipt?.interceptReportId, execution.response.relatedId)
  assert.equal(execution.response.receipt?.maritimeReportResultChipId, 'maritime_report_result_chip_v1')
  assert.equal(execution.response.receipt?.battleReportSurface, 'battle_report_panel/list/detail')
  assert.equal(execution.response.receipt?.navalBattleScope, 'patrol_intercept_minimal_battle_report_only')

  const reports = getWorldStateReadonly().reports
  const interceptReport = reports.find((report) => report.id === execution.response.receipt?.interceptReportId)
  assert.ok(interceptReport, 'AI maritime intercept should write a battle report into the existing report list')
  assert.ok(interceptReport.detail.includes(AI_PLAYER_ID), 'battle report should link the AI actor')
  assert.ok(interceptReport.detail.includes('reportKind=naval_patrol_intercept'))
  assert.ok(interceptReport.detail.includes('maritimeReportResultChipId=maritime_report_result_chip_v1'))
  assert.ok(interceptReport.detail.includes('battleReportSurface=battle_report_panel/list/detail'))

  const registered = registerGovernedAiPlayer({
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Maritime Patrol Intercept Contract AI',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['maritime_patrol_intercept'],
  })
  assert.ok(!registered.error, `register governed AI player failed: ${registered.error}`)

  const created = createAiPlayerActionProposal({
    aiPlayerId: AI_PLAYER_ID,
    action: 'maritime_patrol_intercept',
    args: {
      routeId: ROUTE_ID,
      sourceDockId: SOURCE_DOCK_ID,
      overseasContactId: OVERSEAS_CONTACT_ID,
      attackerVesselType: 'interceptor_warship',
      defenderVesselType: 'transport_warship',
    },
    reason: 'Persist a governed W14 maritime intercept proposal receipt.',
    source: 'mcp',
  })
  assert.ok(created.proposal, `create governed intercept proposal failed: ${created.error}`)
  assert.equal(created.proposal.status, 'pending_approval')

  const approved = approveAiPlayerActionProposal(created.proposal.proposalId, { approvedBy: GOVERNOR_PLAYER_ID })
  assert.ok(approved.proposal, `approve governed intercept proposal failed: ${approved.error}`)

  const lifecycleExecution = await executeAiPlayerActionProposal(created.proposal.proposalId, {
    executedBy: GOVERNOR_PLAYER_ID,
  })
  assert.ok(lifecycleExecution.receipt, `execute governed intercept proposal failed: ${lifecycleExecution.error}`)
  assert.equal(lifecycleExecution.receipt.ok, true)
  assert.equal(lifecycleExecution.receipt.action, 'maritime_patrol_intercept')
  assert.equal(lifecycleExecution.receipt.worldAction, 'seaPatrolIntercept')
  assert.equal(lifecycleExecution.receipt.worldReceipt?.action, 'seaPatrolIntercept')
  assert.equal(lifecycleExecution.receipt.worldReceipt?.maritimeReportResultChipId, 'maritime_report_result_chip_v1')
  assert.equal(lifecycleExecution.receipt.worldReceipt?.battleReportSurface, 'battle_report_panel/list/detail')
  assert.equal(typeof lifecycleExecution.receipt.worldReceipt?.interceptReportId, 'string')
  assert.ok(
    getWorldStateReadonly().reports.some((report) => report.id === lifecycleExecution.receipt?.worldReceipt?.interceptReportId),
    'governed AI receipt should point at an existing battle report id',
  )

  const receipts = listAiPlayerActionReceipts(AI_PLAYER_ID, 5)
  assert.ok(
    receipts.some((receipt) =>
      receipt.proposalId === created.proposal?.proposalId &&
      receipt.action === 'maritime_patrol_intercept' &&
      receipt.worldAction === 'seaPatrolIntercept' &&
      receipt.worldReceipt?.interceptReportId === lifecycleExecution.receipt?.worldReceipt?.interceptReportId
    ),
    'governed AI receipt list should retain the maritime intercept battle report receipt',
  )

  const trace = listAiPlayerExecutionTrace(AI_PLAYER_ID, 5)
  assert.equal(trace.ok, true, `execution trace should be readable: ${JSON.stringify(trace)}`)
  const traceItems = trace.ok ? trace.items : []
  const interceptTrace = traceItems.find((item) => item.action === 'maritime_patrol_intercept')
  assert.ok(interceptTrace, 'governed maritime intercept receipt should appear in execution trace')
  assert.equal(interceptTrace.sourceKind, 'governed_proposal')
  assert.equal(interceptTrace.phase, 'completed')
  assert.equal(interceptTrace.visibility, 'player')
  assert.equal(interceptTrace.aiPlayerId, AI_PLAYER_ID)
  assert.equal(interceptTrace.ownerPlayerId, GOVERNOR_PLAYER_ID)
  assert.equal(interceptTrace.factionId, FACTION_ID)
  assert.match(interceptTrace.currentTaskText, /Maritime Patrol Intercept|海巡|拦截|完成/i)
  assert.doesNotMatch(JSON.stringify(interceptTrace), /proposalId|worldAction|worldReceipt|interceptReportId/)

  console.log('[ai_player_maritime_patrol_intercept_proposal_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_maritime_patrol_intercept_proposal_contract] failed:', error)
  process.exitCode = 1
})
