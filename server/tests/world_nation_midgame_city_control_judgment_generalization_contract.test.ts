import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildCityControlJudgmentReadback,
  cityControlJudgmentKindForRole,
} from '../../shared/domain/cityControlJudgment'
import {
  recordNationMidgameCityControlJudgmentAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const worldContract = readFileSync('shared/contracts/game/world.ts', 'utf-8')
const worldSchema = readFileSync('shared/schemas/worldAction.ts', 'utf-8')
const worldRoute = readFileSync('server/src/routes/world.ts', 'utf-8')
const worldService = readFileSync('server/src/application/world/WorldService.ts', 'utf-8')

const action = 'recordNationMidgameCityControlJudgment'

assert.match(
  worldContract,
  /action: 'recordNationMidgameCityControlJudgment'[\s\S]*cityId[\s\S]*cityName[\s\S]*administrativeRole[\s\S]*sourceControlAuthorityId[\s\S]*sourceControlProgressId/,
  'WorldActionRequest must expose the D-W9 generic city-control judgment payload.',
)

assert.match(
  worldContract,
  /cityControlJudgmentId\?: string[\s\S]*cityControlAdministrativeRole\?: 'state_government' \| 'commandery_seat' \| 'city'[\s\S]*cityControlJudgmentKind\?: 'prefectureControlJudgment' \| 'commanderyControlJudgment' \| 'cityControlJudgment'[\s\S]*cityControlScope\?: 'city_control_judgment_only_not_ownership_transfer'/,
  'WorldActionReceipt must expose generic city/prefecture/commandery judgment fields.',
)

assert.match(
  worldSchema,
  /z\.literal\('recordNationMidgameCityControlJudgment'\)[\s\S]*cityId[\s\S]*cityName[\s\S]*administrativeRole[\s\S]*sourceControlAuthorityId[\s\S]*sourceControlProgressId/,
  'worldActionRequestSchema must validate D-W9 generic city-control judgment payload.',
)

assert.match(
  worldRoute,
  /recordNationMidgameCityControlJudgmentAction[\s\S]*case 'recordNationMidgameCityControlJudgment'/,
  'world route must dispatch D-W9 generic city-control judgment through /api/world/action.',
)

assert.match(
  worldService,
  /recordNationMidgameLuoyangPrefectureControlJudgmentAction[\s\S]*recordNationMidgameCityControlJudgmentAction/,
  'D-W8 Luoyang judgment should reuse the D-W9 generic city-control judgment path instead of staying a standalone special case.',
)

assert.equal(cityControlJudgmentKindForRole('state_government'), 'prefectureControlJudgment')
assert.equal(cityControlJudgmentKindForRole('commandery_seat'), 'commanderyControlJudgment')
assert.equal(cityControlJudgmentKindForRole('city'), 'cityControlJudgment')

const readback = buildCityControlJudgmentReadback(
  {
    cityId: 'yingchuan_xuchang',
    cityName: '许昌',
    administrativeRole: 'commandery_seat',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_xuchang',
    sourceControlProgressId: 'control_progress_xuchang',
    nextStepLabel: '固守郡城',
  },
  'test_seed',
)

assert.equal(readback.cityControlJudgmentKind, 'commanderyControlJudgment')
assert.equal(readback.ownershipTransferApplied, false)
assert.equal(readback.cityControlScope, 'city_control_judgment_only_not_ownership_transfer')
assert.match(readback.playerOrganizationResult, /许昌/)

resetWorldServiceForTests()
const parsed = parseWorldActionRequest({
  action,
  payload: {
    factionId: 'player',
    cityId: 'jingzhou_xiangyang',
    cityName: '襄阳',
    administrativeRole: 'state_government',
    organizationId: 'player',
    sourceControlAuthorityId: 'control_authority_xiangyang',
    sourceControlProgressId: 'control_progress_xiangyang',
    sourcePageId: 'nation/midgame',
    nextStepLabel: '固守州府',
  },
})

assert.equal(parsed.action, action)
const result = recordNationMidgameCityControlJudgmentAction(parsed.payload, false)

assert.equal(result.ok, true)
assert.equal(result.receipt?.action, action)
assert.equal(result.receipt?.cityId, 'jingzhou_xiangyang')
assert.equal(result.receipt?.cityName, '襄阳')
assert.equal(result.receipt?.cityControlAdministrativeRole, 'state_government')
assert.equal(result.receipt?.cityControlJudgmentKind, 'prefectureControlJudgment')
assert.equal(result.receipt?.cityControlJudgmentStatus, 'controlled')
assert.equal(result.receipt?.ownershipTransferApplied, false)
assert.equal(result.receipt?.cityControlScope, 'city_control_judgment_only_not_ownership_transfer')
assert.ok(result.receipt?.cityControlJudgmentId && result.receipt.cityControlJudgmentId.length > 0)
assert.match(String(result.receipt?.playerOrganizationResult), /襄阳/)

console.log('[world_nation_midgame_city_control_judgment_generalization_contract] all checks passed')
