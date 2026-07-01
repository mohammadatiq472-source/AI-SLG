import assert from 'node:assert/strict'
import {
  CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES,
  cityControlJudgmentKindForRole,
} from '../../shared/domain/cityControlJudgment'
import {
  recordNationMidgameCityControlJudgmentAction,
  recordNationMidgameLuoyangPrefectureControlJudgmentAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import { parseWorldActionRequest } from '../../shared/schemas/worldAction'

const action = 'recordNationMidgameCityControlJudgment'

const roleCounts = new Map<string, number>()
const cityIds = new Set<string>()
const nonLuoyangSamples = CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES.filter((sample) => sample.cityId !== 'luoyang')

for (const sample of CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES) {
  roleCounts.set(sample.administrativeRole, (roleCounts.get(sample.administrativeRole) ?? 0) + 1)
  cityIds.add(sample.cityId)
}

assert.ok(CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES.length >= 6, 'D-W10A coverage gate must cover at least six city-control samples.')
assert.ok(nonLuoyangSamples.length >= 5, 'D-W10A coverage gate must prove non-Luoyang city-control coverage.')
assert.ok((roleCounts.get('state_government') ?? 0) >= 2, 'D-W10A coverage gate must cover at least two state-government targets.')
assert.ok((roleCounts.get('commandery_seat') ?? 0) >= 2, 'D-W10A coverage gate must cover at least two commandery-seat targets.')
assert.ok((roleCounts.get('city') ?? 0) >= 2, 'D-W10A coverage gate must cover at least two ordinary-city targets.')
assert.equal(cityIds.size, CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES.length, 'D-W10A coverage samples must not reuse city ids.')

const expectedKinds = {
  state_government: 'prefectureControlJudgment',
  commandery_seat: 'commanderyControlJudgment',
  city: 'cityControlJudgment',
} as const

resetWorldServiceForTests()
for (const sample of CITY_CONTROL_JUDGMENT_COVERAGE_SAMPLES) {
  assert.equal(
    cityControlJudgmentKindForRole(sample.administrativeRole),
    expectedKinds[sample.administrativeRole],
    `D-W10A role ${sample.administrativeRole} must map to the expected control judgment kind.`,
  )

  const parsed = parseWorldActionRequest({
    action,
    payload: {
      factionId: 'player',
      cityId: sample.cityId,
      cityName: sample.cityName,
      administrativeRole: sample.administrativeRole,
      organizationId: sample.organizationId,
      sourceControlAuthorityId: sample.sourceControlAuthorityId,
      sourceControlProgressId: sample.sourceControlProgressId,
      sourcePageId: 'nation/midgame',
      nextStepLabel: sample.nextStepLabel,
    },
  })
  assert.equal(parsed.action, action)
  assert.ok('payload' in parsed)
  const result = recordNationMidgameCityControlJudgmentAction(parsed.payload, false)

  assert.equal(result.ok, true, `D-W10A sample ${sample.cityId} should produce a successful judgment readback.`)
  assert.equal(result.receipt?.cityId, sample.cityId)
  assert.equal(result.receipt?.cityName, sample.cityName)
  assert.equal(result.receipt?.cityControlAdministrativeRole, sample.administrativeRole)
  assert.equal(result.receipt?.cityControlJudgmentKind, expectedKinds[sample.administrativeRole])
  assert.equal(result.receipt?.ownershipTransferApplied, false)
  assert.equal(result.receipt?.cityControlScope, 'city_control_judgment_only_not_ownership_transfer')
  assert.ok(result.receipt?.cityControlJudgmentId && result.receipt.cityControlJudgmentId.length > 0)
}

const invalidPayloads = [
  { cityId: '', cityName: '缺城池', sourceControlAuthorityId: 'authority_missing_city_id', sourceControlProgressId: 'progress_missing_city_id' },
  { cityId: 'missing_city_name', cityName: '', sourceControlAuthorityId: 'authority_missing_city_name', sourceControlProgressId: 'progress_missing_city_name' },
  { cityId: 'missing_authority', cityName: '缺军令', sourceControlAuthorityId: '', sourceControlProgressId: 'progress_missing_authority' },
  { cityId: 'missing_progress', cityName: '缺进度', sourceControlAuthorityId: 'authority_missing_progress', sourceControlProgressId: '' },
]

for (const payload of invalidPayloads) {
  const result = recordNationMidgameCityControlJudgmentAction({
    factionId: 'player',
    administrativeRole: 'city',
    organizationId: 'player',
    sourcePageId: 'nation/midgame',
    nextStepLabel: '固守城池',
    ...payload,
  }, false)

  assert.equal(result.ok, false, `D-W10A invalid payload ${payload.cityId || payload.cityName} must not be treated as success.`)
  assert.equal(result.receipt?.ownershipTransferApplied, false, 'D-W10A invalid payload must not generate ownership transfer.')
  assert.equal(result.receipt?.cityControlScope, 'city_control_judgment_only_not_ownership_transfer')
}

const luoyangRegression = recordNationMidgameLuoyangPrefectureControlJudgmentAction({
  factionId: 'player',
  sourceControlAuthorityId: 'luoyang_control_authority_regression',
  sourceLuoyangControlProgressId: 'luoyang_prefecture_progress_regression',
  sourcePageId: 'nation/midgame',
  targetLabel: '洛阳',
  organizationId: 'player',
  nextStepLabel: '固守洛阳',
}, false)

assert.equal(luoyangRegression.ok, true)
assert.equal(luoyangRegression.receipt?.targetLabel, '洛阳')
assert.equal(luoyangRegression.receipt?.cityId, 'luoyang')
assert.equal(luoyangRegression.receipt?.cityName, '洛阳')
assert.equal(luoyangRegression.receipt?.cityControlAdministrativeRole, 'state_government')
assert.equal(luoyangRegression.receipt?.cityControlJudgmentKind, 'prefectureControlJudgment')
assert.equal(luoyangRegression.receipt?.ownershipTransferApplied, false)
assert.ok(luoyangRegression.receipt?.cityControlJudgmentId && luoyangRegression.receipt.cityControlJudgmentId.length > 0)

console.log('[world_nation_midgame_city_control_judgment_coverage_gate_contract] all checks passed')
