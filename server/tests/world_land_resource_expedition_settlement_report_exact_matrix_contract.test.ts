import assert from 'node:assert/strict'
import type { ResourceKind, Unit, WorldActionReceipt, WorldState } from '../../shared/contracts/game'
import type { BattleOutcomeRecord } from '../../shared/contracts/game/history'
import { RESOURCE_TILE_ECONOMY_MODEL_VERSION } from '../../shared/domain/resourceTileEconomy'
import {
  occupyTileAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'

const FACTION_ID = 'player'
const RESOURCE_KINDS: Array<Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>> = ['food', 'wood', 'stone', 'iron']
const TARGET_LEVELS = [1, 3, 5, 7, 9]
const NAVAL_FORBIDDEN_PATTERN = /(海上接战|舰队|回港|巡逻|拦截|港口)/
const ENGINEERING_FORBIDDEN_PATTERN = /(snake_case|read model|authority|tier|backend|contract id|守军强度)/

function exactMainResourceYield(level: number): number {
  return level * 2 * 100
}

function exactGuardSoldiers(level: number): number {
  return level * 300
}

function exactRecommendedPower(level: number): number {
  return level * 100
}

function exactHeroExp(level: number): number {
  return level * 20
}

function cloneReadyUnit(base: Unit, id: string, tileId: string): Unit {
  const unit = structuredClone(base)
  unit.id = id
  unit.name = id
  unit.tileId = tileId
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 9999
  unit.supply = 99
  unit.mobility = 99
  unit.corps = {
    ...unit.corps,
    readiness: 100,
    roster: [`${id}-roster`],
  }
  unit.hero = {
    ...unit.hero,
    id: `${id}_hero`,
    name: `${id} Hero`,
    level: 20,
    exp: 0,
    force: 999,
    command: 999,
    intelligence: 999,
    charisma: 999,
    speed: 999,
  }
  unit.coHeroes = []
  return unit
}

function seedExactMatrixSettlementWorld(): {
  targets: Array<{ unitId: string; tileId: string; resourceLevel: number; resourceKind: ResourceKind }>
  l0Target: { unitId: string; tileId: string }
  l10Target: { unitId: string; tileId: string }
  copperTarget: { unitId: string; tileId: string }
} {
  let seeded:
    | {
        targets: Array<{ unitId: string; tileId: string; resourceLevel: number; resourceKind: ResourceKind }>
        l0Target: { unitId: string; tileId: string }
        l10Target: { unitId: string; tileId: string }
        copperTarget: { unitId: string; tileId: string }
      }
    | undefined

  resetWorldServiceForTests((world) => {
    const faction = world.factions[FACTION_ID]
    assert.ok(faction, `missing faction ${FACTION_ID}`)
    const baseUnit = world.units.find((unit) => unit.faction === FACTION_ID)
    assert.ok(baseUnit, `missing base unit for ${FACTION_ID}`)

    const candidateTiles = world.map.tiles.filter((tile) => tile.type !== 'city' && tile.type !== 'fog')
    assert.ok(candidateTiles.length >= 12, 'settlement exact-matrix contract needs occupiable tiles')

    const units: Unit[] = []
    const targets: Array<{ unitId: string; tileId: string; resourceLevel: number; resourceKind: ResourceKind }> = []
    TARGET_LEVELS.forEach((level, index) => {
      const tile = candidateTiles[index]
      const resourceKind = RESOURCE_KINDS[index % RESOURCE_KINDS.length]
      tile.type = 'resource'
      tile.terrain = 'grassland'
      tile.owner = 'neutral'
      tile.resourceKind = resourceKind
      tile.resourceLevel = level
      tile.enemyPressure = 0
      tile.moveCost = 1
      const unitId = `land_exact_l${level}_${resourceKind}_unit`
      units.push(cloneReadyUnit(baseUnit, unitId, tile.id))
      targets.push({ unitId, tileId: tile.id, resourceLevel: level, resourceKind })
    })

    const l0Tile = candidateTiles[6]
    l0Tile.type = 'plain'
    l0Tile.terrain = 'grassland'
    l0Tile.owner = 'neutral'
    delete l0Tile.resourceKind
    delete l0Tile.resourceLevel
    l0Tile.enemyPressure = 0
    const l0Target = { unitId: 'land_exact_l0_unit', tileId: l0Tile.id }
    units.push(cloneReadyUnit(baseUnit, l0Target.unitId, l0Target.tileId))

    const l10Tile = candidateTiles[7]
    l10Tile.type = 'resource'
    l10Tile.terrain = 'grassland'
    l10Tile.owner = 'neutral'
    l10Tile.resourceKind = 'iron'
    l10Tile.resourceLevel = 10
    l10Tile.enemyPressure = 0
    const l10Target = { unitId: 'land_exact_l10_unit', tileId: l10Tile.id }
    units.push(cloneReadyUnit(baseUnit, l10Target.unitId, l10Target.tileId))

    const copperTile = candidateTiles[8]
    copperTile.type = 'resource'
    copperTile.terrain = 'grassland'
    copperTile.owner = 'neutral'
    copperTile.resourceKind = 'copper'
    copperTile.resourceLevel = 3
    copperTile.enemyPressure = 0
    const copperTarget = { unitId: 'land_exact_copper_unit', tileId: copperTile.id }
    units.push(cloneReadyUnit(baseUnit, copperTarget.unitId, copperTarget.tileId))

    world.units = [
      ...world.units.filter((unit) => unit.faction !== FACTION_ID),
      ...units,
    ]
    world.feedback.battleRecords = []
    world.reports = []
    world.executions[FACTION_ID] = null
    faction.actionPoints = 100
    faction.food = 10000
    faction.wood = 10000
    faction.stone = 10000
    faction.iron = 10000
    faction.copper = 10000
    seeded = { targets, l0Target, l10Target, copperTarget }
  })

  assert.ok(seeded, 'settlement exact-matrix world should be seeded')
  return seeded
}

function readReceipt(response: ReturnType<typeof occupyTileAction>): WorldActionReceipt {
  assert.ok(response.receipt, 'occupyTile response should include receipt')
  return response.receipt
}

function findBattleRecord(world: WorldState | undefined, tileId: string, unitId: string): BattleOutcomeRecord {
  assert.ok(world, 'includeWorld=true should return world readback')
  const record = world.feedback.battleRecords.find((candidate) => (
    candidate.tileId === tileId &&
    candidate.attackerUnitId === unitId &&
    candidate.reportKind === 'resource_guard'
  ))
  assert.ok(record, `missing resource guard battle record for ${tileId}`)
  return record
}

function assertNoProductCopyLeak(values: Array<unknown>) {
  const text = values.map((value) => String(value ?? '')).join(' ')
  assert.equal(NAVAL_FORBIDDEN_PATTERN.test(text), false, `land response must not contain naval copy: ${text}`)
  assert.equal(ENGINEERING_FORBIDDEN_PATTERN.test(text), false, `player-visible land copy must not leak engineering terms: ${text}`)
}

function resourceValueFromDelta(delta: unknown, resourceKind: ResourceKind): number {
  const record = delta as Record<string, unknown> | undefined
  return Number(record?.[resourceKind] ?? 0)
}

const seeded = seedExactMatrixSettlementWorld()
const coveredKinds = new Set<ResourceKind>()

for (const target of seeded.targets) {
  const response = occupyTileAction({ factionId: FACTION_ID, unitId: target.unitId, tileId: target.tileId }, true)
  assert.equal(response.ok, true, `L${target.resourceLevel} ${target.resourceKind} settlement should succeed`)
  const receipt = readReceipt(response)
  const expectedReward = exactMainResourceYield(target.resourceLevel)
  const expectedHeroExp = exactHeroExp(target.resourceLevel)
  coveredKinds.add(target.resourceKind)

  assert.equal(receipt.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
  assert.equal(receipt.resourceEconomyConfigVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
  assert.equal(receipt.resourceTileSettlementStatus, 'ready')
  assert.equal(receipt.tileLevel, target.resourceLevel)
  assert.equal(receipt.resourceKind, target.resourceKind)
  assert.deepEqual(receipt.baseYieldPerHour, { min: expectedReward, max: expectedReward })
  assert.deepEqual(receipt.ongoingYieldPerHour, { min: expectedReward, max: expectedReward })
  assert.deepEqual(receipt.defenderStrengthRange, { min: exactGuardSoldiers(target.resourceLevel), max: exactGuardSoldiers(target.resourceLevel) })
  assert.deepEqual(receipt.defenderTroopCountRange, { min: target.resourceLevel, max: target.resourceLevel })
  assert.equal(receipt.recommendedPower, exactRecommendedPower(target.resourceLevel))
  assert.equal(receipt.captureReward?.resourceKind, target.resourceKind)
  assert.deepEqual(receipt.captureReward?.amount, { min: expectedReward, max: expectedReward })
  assert.equal(receipt.captureReward?.heroExp, expectedHeroExp)
  assert.equal(receipt.expGained, expectedHeroExp)
  assert.equal(resourceValueFromDelta(receipt.resourceRewardDelta, target.resourceKind), expectedReward)
  assert.equal(resourceValueFromDelta(receipt.battleReportResourceRewardDelta, target.resourceKind), expectedReward)
  assert.equal(receipt.guardSoldiersLabel, `守军兵力 ${exactGuardSoldiers(target.resourceLevel)}`)
  assert.equal(receipt.recommendedPowerLabel, `推荐战力 ${exactRecommendedPower(target.resourceLevel)}`)
  assert.ok(String(receipt.captureRewardLabel ?? '').includes(`占领奖励 +${expectedReward}`))
  assert.ok(String(receipt.captureRewardLabel ?? '').includes(`武将经验 +${expectedHeroExp}`))
  assert.equal(receipt.landFirstMvpGlobalProductContractOk, true)
  assert.equal(receipt.l10NotRequiredForCurrentMvp, true)
  assert.equal(receipt.copperCurrencySuccessPathOpened, false)
  assert.deepEqual(receipt.landFirstMvpProductForbiddenHits, [])

  const battleRecord = findBattleRecord(response.world, target.tileId, target.unitId) as BattleOutcomeRecord & {
    resourceRewardDelta?: Record<string, number>
    captureReward?: WorldActionReceipt['captureReward']
    recommendedPower?: number
    guardSoldiers?: number
    landFirstMvpGlobalProductContractOk?: boolean
  }
  assert.equal(battleRecord.outcome, 'win')
  assert.equal(resourceValueFromDelta(battleRecord.resourceRewardDelta, target.resourceKind), expectedReward)
  assert.deepEqual(battleRecord.captureReward?.amount, { min: expectedReward, max: expectedReward })
  assert.equal(battleRecord.captureReward?.heroExp, expectedHeroExp)
  assert.equal(battleRecord.recommendedPower, exactRecommendedPower(target.resourceLevel))
  assert.equal(battleRecord.guardSoldiers, exactGuardSoldiers(target.resourceLevel))
  assert.equal(battleRecord.landFirstMvpGlobalProductContractOk, true)

  assertNoProductCopyLeak([
    receipt.guardSoldiersLabel,
    receipt.recommendedPowerLabel,
    receipt.captureRewardLabel,
    receipt.battleReportRewardLabel,
    battleRecord.summary,
  ])
}

assert.ok(coveredKinds.size >= 3, 'settlement consistency should cover at least three resource kinds')

const l0Response = occupyTileAction({ factionId: FACTION_ID, ...seeded.l0Target }, true)
const l0Receipt = readReceipt(l0Response)
assert.equal(l0Receipt.resourceTileSettlementStatus, 'not_resource_tile')
assert.equal(l0Receipt.landResourceExpeditionBlocked, true)
assert.equal(l0Receipt.captureReward, undefined)
assert.equal(l0Receipt.resourceRewardDelta, undefined)
assert.equal(l0Receipt.battleReportResourceRewardDelta, undefined)
assert.equal(l0Receipt.landFirstMvpGlobalProductContractOk, true)

const l10Response = occupyTileAction({ factionId: FACTION_ID, ...seeded.l10Target }, true)
assert.equal(l10Response.ok, false, 'L10 must stay unsupported/future-only')
const l10Receipt = readReceipt(l10Response)
assert.equal(l10Receipt.resourceTileSettlementStatus, 'unsupported_resource_level')
assert.equal(l10Receipt.captureReward, undefined)
assert.equal(l10Receipt.l10NotRequiredForCurrentMvp, true)

const copperResponse = occupyTileAction({ factionId: FACTION_ID, ...seeded.copperTarget }, true)
assert.equal(copperResponse.ok, false, 'copper/currency must not be opened as P0 success path')
const copperReceipt = readReceipt(copperResponse)
assert.equal(copperReceipt.resourceTileSettlementStatus, 'unsupported_resource_kind')
assert.equal(copperReceipt.captureReward, undefined)
assert.equal(copperReceipt.copperCurrencySuccessPathOpened, false)

console.log('[world_land_resource_expedition_settlement_report_exact_matrix_contract] all checks passed')
