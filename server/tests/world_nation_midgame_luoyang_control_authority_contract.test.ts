import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  issueNationMidgameLuoyangAuthorityClaimAction,
  recordNationMidgameLuoyangBattleReportFeedbackAction,
  recordNationMidgameLuoyangControlAuthorityAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')
const worldRoute = readFileSync('server/src/routes/world.ts', 'utf-8')

const action = 'recordNationMidgameLuoyangControlAuthority'

assert.match(
  worldContract,
  /action: 'recordNationMidgameLuoyangControlAuthority'[\s\S]*sourceLuoyangContestId[\s\S]*sourceOrganizationReportId[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'WorldActionRequest must expose the D-W5 Luoyang control authority payload.',
)

assert.match(
  worldContract,
  /controlAuthorityId\?: string[\s\S]*prefectureControlProgressId\?: string[\s\S]*controlStatus\?: 'recorded'[\s\S]*nationMidgameControlScope\?: 'luoyang_control_authority_only_not_full_occupation'/,
  'WorldActionReceipt must expose D-W5 control receipt/readback fields.',
)

assert.match(
  worldSchema,
  /z\.literal\('recordNationMidgameLuoyangControlAuthority'\)[\s\S]*sourceLuoyangContestId[\s\S]*sourceOrganizationReportId[\s\S]*sourcePageId[\s\S]*targetLabel/,
  'worldActionRequestSchema must validate the D-W5 action payload.',
)

assert.match(
  worldRoute,
  /recordNationMidgameLuoyangControlAuthorityAction[\s\S]*case 'recordNationMidgameLuoyangControlAuthority'/,
  'world route must dispatch D-W5 action through the formal /api/world/action path.',
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

const report = recordNationMidgameLuoyangBattleReportFeedbackAction(
  {
    factionId: 'player',
    sourceLuoyangContestId: authority.receipt?.luoyangContestId,
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    reportStatus: 'recorded',
  },
  false,
)

const parsed = parseWorldActionRequest({
  action,
  payload: {
    factionId: 'player',
    sourceLuoyangContestId: authority.receipt?.luoyangContestId,
    sourceOrganizationReportId: report.receipt?.organizationReportId,
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    controlStatus: 'recorded',
  },
})

assert.equal(parsed.action, action)

const result = recordNationMidgameLuoyangControlAuthorityAction(parsed.payload, false)

assert.equal(result.ok, true)
assert.equal(result.receipt?.action, action)
assert.equal(result.receipt?.sourceLuoyangContestId, authority.receipt?.luoyangContestId)
assert.equal(result.receipt?.sourceOrganizationReportId, report.receipt?.organizationReportId)
assert.equal(result.receipt?.sourcePageId, 'nation/midgame')
assert.equal(result.receipt?.targetLabel, '洛阳')
assert.equal(result.receipt?.organizationId, 'player')
assert.equal(result.receipt?.controlStatus, 'recorded')
assert.equal(result.receipt?.usesOrganizationReportSurface, true)
assert.equal(result.receipt?.nationMidgameControlScope, 'luoyang_control_authority_only_not_full_occupation')
assert.ok(result.receipt?.controlAuthorityId && result.receipt.controlAuthorityId.length > 0)
assert.ok(result.receipt?.prefectureControlProgressId && result.receipt.prefectureControlProgressId.length > 0)
assert.ok(result.receipt?.playerOrganizationResult)

console.log('[world_nation_midgame_luoyang_control_authority_contract] all checks passed')
