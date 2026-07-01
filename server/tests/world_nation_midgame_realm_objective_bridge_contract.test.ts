import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  issueNationMidgameLuoyangAuthorityClaimAction,
  recordNationMidgameLuoyangBattleReportFeedbackAction,
  recordNationMidgameLuoyangControlAuthorityAction,
  recordNationMidgameRealmObjectiveBridgeAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')
const worldRoute = readFileSync('server/src/routes/world.ts', 'utf-8')

const action = 'recordNationMidgameRealmObjectiveBridge'

assert.match(
  worldContract,
  /action: 'recordNationMidgameRealmObjectiveBridge'[\s\S]*sourceControlAuthorityId[\s\S]*sourceLuoyangControlProgressId[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'WorldActionRequest must expose the D-W6 realm objective bridge payload.',
)

assert.match(
  worldContract,
  /realmObjectiveProgressId\?: string[\s\S]*kingdomObjectivePrerequisiteProgress\?: string[\s\S]*empireObjectivePrerequisiteProgress\?: string[\s\S]*kingdomObjectivePrerequisiteVisible\?: boolean[\s\S]*empireObjectivePrerequisiteVisible\?: boolean[\s\S]*nextStepLabel\?: string[\s\S]*nationMidgameRealmObjectiveBridgeScope\?: 'realm_objective_bridge_only_not_full_kingdom_empire_creation'/,
  'WorldActionReceipt must expose D-W6 realm objective bridge receipt/readback fields.',
)

assert.match(
  worldSchema,
  /z\.literal\('recordNationMidgameRealmObjectiveBridge'\)[\s\S]*sourceControlAuthorityId[\s\S]*sourceLuoyangControlProgressId[\s\S]*sourcePageId[\s\S]*targetLabel/,
  'worldActionRequestSchema must validate the D-W6 action payload.',
)

assert.match(
  worldRoute,
  /recordNationMidgameRealmObjectiveBridgeAction[\s\S]*case 'recordNationMidgameRealmObjectiveBridge'/,
  'world route must dispatch D-W6 action through the formal /api/world/action path.',
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
    targetLabel: '王国目标',
    organizationId: 'player',
    nextStepLabel: '巩固洛阳',
  },
})

assert.equal(parsed.action, action)

const result = recordNationMidgameRealmObjectiveBridgeAction(parsed.payload, false)

assert.equal(result.ok, true)
assert.equal(result.receipt?.action, action)
assert.equal(result.receipt?.sourceControlAuthorityId, control.receipt?.controlAuthorityId)
assert.equal(result.receipt?.sourceLuoyangControlProgressId, control.receipt?.prefectureControlProgressId)
assert.equal(result.receipt?.sourcePageId, 'nation/midgame')
assert.equal(result.receipt?.targetLabel, '王国目标')
assert.equal(result.receipt?.organizationId, 'player')
assert.equal(result.receipt?.kingdomObjectivePrerequisiteVisible, true)
assert.equal(result.receipt?.empireObjectivePrerequisiteVisible, true)
assert.equal(result.receipt?.usesOrganizationNationSurface, true)
assert.equal(result.receipt?.nextStepLabel, '巩固洛阳')
assert.equal(result.receipt?.nationMidgameRealmObjectiveBridgeScope, 'realm_objective_bridge_only_not_full_kingdom_empire_creation')
assert.ok(result.receipt?.realmObjectiveProgressId && result.receipt.realmObjectiveProgressId.length > 0)
assert.ok(result.receipt?.kingdomObjectivePrerequisiteProgress)
assert.ok(result.receipt?.empireObjectivePrerequisiteProgress)

console.log('[world_nation_midgame_realm_objective_bridge_contract] all checks passed')
