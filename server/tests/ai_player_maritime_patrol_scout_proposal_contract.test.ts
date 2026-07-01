import assert from 'node:assert/strict'
import type { AiPlayerActionProposal } from '../../shared/contracts/aiPlayer'
import { getWorldStateReadonly, resetWorldServiceForTests } from '../src/application/world/WorldService'
import { listStaticAiPlayerActionCatalog } from '../src/application/ai/aiPlayerActionCatalog'
import { executeSupportedAiPlayerProposal } from '../src/application/ai/aiPlayerProposalExecution'

const AI_PLAYER_ID = 'ai_player_maritime_patrol_contract'
const GOVERNOR_PLAYER_ID = 'player'
const FACTION_ID = 'player'

function buildOverseasRouteProposal(): AiPlayerActionProposal {
  return {
    proposalId: 'proposal_maritime_patrol_route_open_contract',
    aiPlayerId: AI_PLAYER_ID,
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    action: 'overseas_route_open',
    args: {
      sourceDockId: 'east_han_coastal_dock_quanzhou',
      overseasContactId: 'wa_contact_scoutable',
    },
    reason: '先开通 W6 海路，再执行 W8 海巡侦察。',
    riskLevel: 'medium',
    source: 'mcp',
    status: 'approved',
    requiresApproval: true,
    executableInV1: true,
    createdAt: '2026-06-07T00:00:00.000Z',
    updatedAt: '2026-06-07T00:00:00.000Z',
    approvedAt: '2026-06-07T00:00:01.000Z',
    approvedBy: GOVERNOR_PLAYER_ID,
  }
}

function buildMaritimePatrolScoutProposal(): AiPlayerActionProposal {
  return {
    proposalId: 'proposal_maritime_patrol_scout_contract',
    aiPlayerId: AI_PLAYER_ID,
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    action: 'maritime_patrol_scout',
    args: {
      routeId: 'east_han_coastal_dock_to_wa_contact',
      sourceDockId: 'east_han_coastal_dock_quanzhou',
      overseasContactId: 'wa_contact_scoutable',
    },
    reason: '只做海巡侦察和 maritime report，不进入完整海战。',
    riskLevel: 'medium',
    source: 'mcp',
    status: 'approved',
    requiresApproval: true,
    executableInV1: true,
    createdAt: '2026-06-07T00:00:02.000Z',
    updatedAt: '2026-06-07T00:00:02.000Z',
    approvedAt: '2026-06-07T00:00:03.000Z',
    approvedBy: GOVERNOR_PLAYER_ID,
  }
}

async function run() {
  resetWorldServiceForTests()

  const catalogEntry = listStaticAiPlayerActionCatalog().find((entry) => entry.action === 'maritime_patrol_scout')
  assert.ok(catalogEntry, 'AI catalog should expose maritime_patrol_scout as the W8 patrol proposal action')
  assert.equal(catalogEntry.executableInV1, true)
  assert.equal(catalogEntry.requiresApprovalByDefault, true)
  assert.equal(catalogEntry.mappedWorldAction, 'seaPatrolScout')

  const opened = await executeSupportedAiPlayerProposal(buildOverseasRouteProposal(), false)
  assert.ok(!('error' in opened), `overseas route proposal execution failed: ${JSON.stringify(opened)}`)
  assert.equal(opened.response.ok, true, `open route response should succeed: ${JSON.stringify(opened.response)}`)

  const execution = await executeSupportedAiPlayerProposal(buildMaritimePatrolScoutProposal(), true)
  assert.ok(!('error' in execution), `maritime patrol proposal execution failed: ${JSON.stringify(execution)}`)
  assert.equal(execution.worldAction, 'seaPatrolScout')
  assert.equal(execution.worldActionPayload?.routeId, 'east_han_coastal_dock_to_wa_contact')
  assert.equal(execution.worldActionPayload?.sourceDockId, 'east_han_coastal_dock_quanzhou')
  assert.equal(execution.worldActionPayload?.overseasContactId, 'wa_contact_scoutable')
  assert.equal(execution.worldActionPayload?.actorAiPlayerId, AI_PLAYER_ID)
  assert.equal(execution.response.ok, true, `world response should succeed: ${JSON.stringify(execution.response)}`)
  assert.equal(execution.response.receipt?.action, 'seaPatrolScout')
  assert.equal(execution.response.receipt?.patrolStatus, 'scout_report_ready')
  assert.equal(execution.response.receipt?.maritimeActivityChipId, 'maritime_activity_chip_v1')
  assert.equal(execution.response.receipt?.maritimeReportResultChipId, 'maritime_report_result_chip_v1')
  assert.equal(execution.response.receipt?.navalBattleScope, 'patrol_scout_only_no_full_naval_combat')

  const reports = getWorldStateReadonly().reports
  assert.ok(
    reports.some((report) =>
      report.id === execution.response.receipt?.patrolReportId &&
      report.detail.includes(AI_PLAYER_ID) &&
      report.detail.includes('maritime_activity_chip_v1') &&
      report.detail.includes('不代表完整海战'),
    ),
    'AI maritime patrol should write a report linked to the AI actor and maritime chips',
  )

  console.log('[ai_player_maritime_patrol_scout_proposal_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_maritime_patrol_scout_proposal_contract] failed:', error)
  process.exitCode = 1
})
