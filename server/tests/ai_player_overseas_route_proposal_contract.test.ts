import assert from 'node:assert/strict'
import type { AiPlayerActionProposal } from '../../shared/contracts/aiPlayer'
import { getWorldStateReadonly, resetWorldServiceForTests } from '../src/application/world/WorldService'
import { listStaticAiPlayerActionCatalog } from '../src/application/ai/aiPlayerActionCatalog'
import { executeSupportedAiPlayerProposal } from '../src/application/ai/aiPlayerProposalExecution'

const AI_PLAYER_ID = 'ai_player_overseas_route_contract'
const GOVERNOR_PLAYER_ID = 'player'
const FACTION_ID = 'player'

function buildOverseasRouteProposal(): AiPlayerActionProposal {
  return {
    proposalId: 'proposal_overseas_route_contract',
    aiPlayerId: AI_PLAYER_ID,
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    action: 'overseas_route_open',
    args: {
      sourceDockId: 'east_han_coastal_dock_quanzhou',
      overseasContactId: 'wa_contact_scoutable',
    },
    reason: '跨海方向只做最小验证：泉州港 -> 倭地联络点，先由后端 authority 判定路线、费用和 blocked reason。',
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

async function run() {
  resetWorldServiceForTests()

  const catalogEntry = listStaticAiPlayerActionCatalog().find((entry) => entry.action === 'overseas_route_open')
  assert.ok(catalogEntry, 'AI catalog should expose overseas_route_open as the W6 route proposal action')
  assert.equal(catalogEntry.executableInV1, true)
  assert.equal(catalogEntry.requiresApprovalByDefault, true)
  assert.equal(catalogEntry.mappedWorldAction, 'openSeaRoute')

  const proposal = buildOverseasRouteProposal()
  const execution = await executeSupportedAiPlayerProposal(proposal, false)
  assert.ok(!('error' in execution), `overseas route proposal execution failed: ${JSON.stringify(execution)}`)
  assert.equal(execution.worldAction, 'openSeaRoute')
  const worldActionPayload = execution.worldActionPayload
  assert.ok(worldActionPayload, 'overseas route execution should expose worldActionPayload')
  assert.equal(worldActionPayload.sourceDockId, 'east_han_coastal_dock_quanzhou')
  assert.equal(worldActionPayload.overseasContactId, 'wa_contact_scoutable')
  assert.equal(worldActionPayload.actorAiPlayerId, AI_PLAYER_ID)
  assert.equal(execution.response.ok, true, `world response should succeed: ${JSON.stringify(execution.response)}`)
  assert.equal(execution.response.receipt?.routeId, 'east_han_coastal_dock_to_wa_contact')
  assert.equal(execution.response.receipt?.routeStatus, 'route_open')
  assert.equal(execution.response.receipt?.blockedReason, null)
  assert.deepEqual(execution.response.receipt?.travelCost, {
    actionPoints: 1,
    food: 2,
  })

  const reports = getWorldStateReadonly().reports
  assert.ok(
    reports.some((report) => report.detail.includes(AI_PLAYER_ID) && report.detail.includes('倭地联络点')),
    'world report should name the AI proposal actor and overseas contact',
  )

  console.log('[ai_player_overseas_route_proposal_contract] all checks passed')
}

run().catch((error) => {
  console.error('[ai_player_overseas_route_proposal_contract] failed:', error)
  process.exitCode = 1
})
