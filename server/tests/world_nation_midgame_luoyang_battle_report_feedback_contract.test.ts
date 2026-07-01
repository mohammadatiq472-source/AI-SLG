import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  issueNationMidgameLuoyangAuthorityClaimAction,
  recordNationMidgameLuoyangBattleReportFeedbackAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')
const worldRoute = readFileSync('server/src/routes/world.ts', 'utf-8')

const action = 'recordNationMidgameLuoyangBattleReportFeedback'

assert.match(
  worldContract,
  /action: 'recordNationMidgameLuoyangBattleReportFeedback'[\s\S]*sourceLuoyangContestId[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'WorldActionRequest must expose the D-W4 Luoyang battle-report feedback payload.',
)

assert.match(
  worldContract,
  /sourceLuoyangContestId\?: string[\s\S]*organizationReportId\?: string[\s\S]*reportStatus\?: 'recorded'[\s\S]*usesOrganizationReportSurface\?: boolean[\s\S]*nationMidgameBattleReportScope\?: 'luoyang_feedback_only_not_full_prefecture_control'/,
  'WorldActionReceipt must expose D-W4 report receipt/readback fields.',
)

assert.match(
  worldSchema,
  /z\.literal\('recordNationMidgameLuoyangBattleReportFeedback'\)[\s\S]*sourceLuoyangContestId[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'worldActionRequestSchema must validate the D-W4 action payload.',
)

assert.match(
  worldRoute,
  /recordNationMidgameLuoyangBattleReportFeedbackAction[\s\S]*case 'recordNationMidgameLuoyangBattleReportFeedback'/,
  'world route must dispatch D-W4 action through the formal /api/world/action path.',
)

resetWorldServiceForTests()
const authority = issueNationMidgameLuoyangAuthorityClaimAction(
  {
    factionId: 'player',
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    nationObjectiveId: 'luoyang_prefecture_contest',
  },
  false,
)

const parsed = parseWorldActionRequest({
  action,
  payload: {
    factionId: 'player',
    sourceLuoyangContestId: authority.receipt?.luoyangContestId,
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    reportStatus: 'recorded',
  },
})

assert.equal(parsed.action, action)

const result = recordNationMidgameLuoyangBattleReportFeedbackAction(parsed.payload, false)

assert.equal(result.ok, true)
assert.equal(result.receipt?.action, action)
assert.equal(result.receipt?.sourceLuoyangContestId, authority.receipt?.luoyangContestId)
assert.equal(result.receipt?.sourcePageId, 'nation/midgame')
assert.equal(result.receipt?.targetLabel, '洛阳')
assert.equal(result.receipt?.organizationId, 'player')
assert.equal(result.receipt?.reportStatus, 'recorded')
assert.equal(result.receipt?.usesOrganizationReportSurface, true)
assert.equal(result.receipt?.nationMidgameBattleReportScope, 'luoyang_feedback_only_not_full_prefecture_control')
assert.ok(result.receipt?.organizationReportId && result.receipt.organizationReportId.length > 0)
assert.ok(result.receipt?.playerOrganizationResult)

console.log('[world_nation_midgame_luoyang_battle_report_feedback_contract] all checks passed')
