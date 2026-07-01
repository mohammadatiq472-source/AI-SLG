import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  issueNationMidgameLuoyangAuthorityClaimAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')
const worldRoute = readFileSync('server/src/routes/world.ts', 'utf-8')

const action = 'issueNationMidgameLuoyangAuthorityClaim'

assert.match(
  worldContract,
  /action: 'issueNationMidgameLuoyangAuthorityClaim'[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'WorldActionRequest must expose the D-W3 Luoyang authority claim payload.',
)

assert.match(
  worldContract,
  /luoyangContestId\?: string[\s\S]*contestStatus\?: 'recorded' \| 'mobilizing' \| 'contested'[\s\S]*nationMidgameAuthorityScope\?: 'luoyang_prefecture_authority_only_not_full_unification'/,
  'WorldActionReceipt must expose D-W3 receipt/readback fields.',
)

assert.match(
  worldSchema,
  /z\.literal\('issueNationMidgameLuoyangAuthorityClaim'\)[\s\S]*sourcePageId[\s\S]*targetLabel[\s\S]*organizationId/,
  'worldActionRequestSchema must validate the D-W3 action payload.',
)

assert.match(
  worldRoute,
  /issueNationMidgameLuoyangAuthorityClaimAction[\s\S]*case 'issueNationMidgameLuoyangAuthorityClaim'/,
  'world route must dispatch D-W3 action through the formal /api/world/action path.',
)

const parsed = parseWorldActionRequest({
  action,
  payload: {
    factionId: 'player',
    sourcePageId: 'nation/midgame',
    targetLabel: '洛阳',
    organizationId: 'player',
    nationObjectiveId: 'luoyang_prefecture_contest',
  },
})

assert.equal(parsed.action, action)

resetWorldServiceForTests()
const result = issueNationMidgameLuoyangAuthorityClaimAction(parsed.payload, false)

assert.equal(result.ok, true)
assert.equal(result.receipt?.action, action)
assert.equal(result.receipt?.sourcePageId, 'nation/midgame')
assert.equal(result.receipt?.targetLabel, '洛阳')
assert.equal(result.receipt?.contestStatus, 'recorded')
assert.equal(result.receipt?.organizationId, 'player')
assert.equal(result.receipt?.nationObjectiveId, 'luoyang_prefecture_contest')
assert.equal(result.receipt?.nationMidgameAuthorityScope, 'luoyang_prefecture_authority_only_not_full_unification')
assert.ok(result.receipt?.luoyangContestId && result.receipt.luoyangContestId.length > 0)
assert.ok(result.receipt?.playerOrganizationResult)

console.log('[world_nation_midgame_luoyang_authority_claim_contract] all checks passed')
