import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  issueNationMidgameLuoyangAuthorityClaimAction,
  recordNationMidgameLuoyangBattleReportFeedbackAction,
  recordNationMidgameLuoyangControlAuthorityAction,
  recordNationMidgameLuoyangPrefectureControlJudgmentAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')
const worldRoute = readFileSync('server/src/routes/world.ts', 'utf-8')

const action = 'recordNationMidgameLuoyangPrefectureControlJudgment'

assert.match(
  worldContract,
  /action: 'recordNationMidgameLuoyangPrefectureControlJudgment'[\s\S]*sourceControlAuthorityId[\s\S]*sourceLuoyangControlProgressId[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'WorldActionRequest must expose the D-W8 Luoyang prefecture-control judgment payload.',
)

assert.match(
  worldContract,
  /prefectureControlJudgmentId\?: string[\s\S]*prefectureControlJudgmentStatus\?: 'controlled'[\s\S]*ownershipTransferApplied\?: false[\s\S]*nationMidgamePrefectureControlJudgmentScope\?: 'luoyang_prefecture_control_judgment_only_not_ownership_transfer'/,
  'WorldActionReceipt must expose D-W8 judgment readback and no ownership-transfer boundary.',
)

assert.match(
  worldSchema,
  /z\.literal\('recordNationMidgameLuoyangPrefectureControlJudgment'\)[\s\S]*sourceControlAuthorityId[\s\S]*sourceLuoyangControlProgressId[\s\S]*sourcePageId[\s\S]*targetLabel/,
  'worldActionRequestSchema must validate the D-W8 action payload.',
)

assert.match(
  worldRoute,
  /recordNationMidgameLuoyangPrefectureControlJudgmentAction[\s\S]*case 'recordNationMidgameLuoyangPrefectureControlJudgment'/,
  'world route must dispatch D-W8 action through the formal /api/world/action path.',
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
const control = recordNationMidgameLuoyangControlAuthorityAction(
  {
    factionId: 'player',
    sourceLuoyangContestId: authority.receipt?.luoyangContestId,
    sourceOrganizationReportId: report.receipt?.organizationReportId,
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    controlStatus: 'recorded',
  },
  false,
)

const parsed = parseWorldActionRequest({
  action,
  payload: {
    factionId: 'player',
    sourceControlAuthorityId: control.receipt?.controlAuthorityId,
    sourceLuoyangControlProgressId: control.receipt?.prefectureControlProgressId,
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    nextStepLabel: '固守洛阳',
  },
})

assert.equal(parsed.action, action)

const result = recordNationMidgameLuoyangPrefectureControlJudgmentAction(parsed.payload, false)

assert.equal(result.ok, true)
assert.equal(result.receipt?.action, action)
assert.equal(result.receipt?.sourceControlAuthorityId, control.receipt?.controlAuthorityId)
assert.equal(result.receipt?.sourceLuoyangControlProgressId, control.receipt?.prefectureControlProgressId)
assert.equal(result.receipt?.sourcePageId, 'nation/midgame')
assert.equal(result.receipt?.targetLabel, '洛阳')
assert.equal(result.receipt?.organizationId, 'player')
assert.equal(result.receipt?.prefectureControlJudgmentStatus, 'controlled')
assert.equal(result.receipt?.usesOrganizationNationSurface, true)
assert.equal(result.receipt?.ownershipTransferApplied, false)
assert.equal(result.receipt?.nationMidgamePrefectureControlJudgmentScope, 'luoyang_prefecture_control_judgment_only_not_ownership_transfer')
assert.ok(result.receipt?.prefectureControlJudgmentId && result.receipt.prefectureControlJudgmentId.length > 0)
assert.ok(result.receipt?.playerOrganizationResult)

console.log('[world_nation_midgame_luoyang_prefecture_control_judgment_contract] all checks passed')
