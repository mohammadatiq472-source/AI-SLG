import assert from 'node:assert/strict'
import { rmSync, writeFileSync } from 'node:fs'
import type { ResourceKind, Unit, WorldActionReceipt, WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { RESOURCE_TILE_ECONOMY_MODEL_VERSION } from '../../shared/domain/resourceTileEconomy'
import {
  occupyTileAction,
  resetWorldServiceForTests,
} from '../src/application/world/WorldService'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const FACTION_ID = 'player'
const RESOURCE_KINDS: Array<Extract<ResourceKind, 'food' | 'wood' | 'stone' | 'iron'>> = [
  'food',
  'wood',
  'stone',
  'iron',
]
const RESOURCE_CONFIG_SOURCE = 'shared/domain/resourceTileEconomyConfig.ts'
const BACKEND_SCOPE = 'resource_tile_backend_settlement_readback_only_not_godot_art'

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

function seedWorldStateWithResourceBackendTargets(): {
  path: string
  l1L9Targets: Array<{ unitId: string; tileId: string; resourceLevel: number; resourceKind: ResourceKind }>
  l0Target: { unitId: string; tileId: string }
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID}`)
  const baseUnit = world.units.find((unit) => unit.faction === FACTION_ID)
  assert.ok(baseUnit, `missing base unit for ${FACTION_ID}`)

  const candidateTiles = world.map.tiles.filter((tile) => tile.type !== 'city' && tile.type !== 'fog')
  assert.ok(candidateTiles.length >= 12, 'resource backend settlement contract needs at least 12 occupiable tiles')

  const units: Unit[] = []
  const l1L9Targets: Array<{ unitId: string; tileId: string; resourceLevel: number; resourceKind: ResourceKind }> = []
  for (let level = 1; level <= 9; level += 1) {
    const tile = candidateTiles[level - 1]
    const resourceKind = RESOURCE_KINDS[(level - 1) % RESOURCE_KINDS.length]
    tile.type = 'resource'
    tile.terrain = 'grassland'
    tile.owner = 'neutral'
    tile.resourceKind = resourceKind
    tile.resourceLevel = level
    tile.enemyPressure = 0
    tile.moveCost = 1
    const unitId = `resource_backend_l${level}_unit`
    units.push(cloneReadyUnit(baseUnit, unitId, tile.id))
    l1L9Targets.push({ unitId, tileId: tile.id, resourceLevel: level, resourceKind })
  }

  const l0Tile = candidateTiles[9]
  l0Tile.type = 'plain'
  l0Tile.terrain = 'grassland'
  l0Tile.owner = 'neutral'
  delete l0Tile.resourceKind
  delete l0Tile.resourceLevel
  l0Tile.enemyPressure = 0
  const l0Target = { unitId: 'resource_backend_l0_unit', tileId: l0Tile.id }
  units.push(cloneReadyUnit(baseUnit, l0Target.unitId, l0Target.tileId))

  world.units = [
    ...world.units.filter((unit) => unit.faction !== FACTION_ID),
    ...units,
  ]
  world.feedback.battleRecords = []
  world.reports = []
  world.executions[FACTION_ID] = null
  faction.actionPoints = 100
  faction.food = 100

  const path = buildSessionPersistPath('world_resource_tile_backend_settlement_readback_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, l1L9Targets, l0Target }
}

function assertNoEngineeringCopy(receipt: WorldActionReceipt) {
  assert.deepEqual(receipt.visibleCopyForbiddenHits, [])
}

async function occupy(baseUrl: string, target: { unitId: string; tileId: string }) {
  return requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
    action: 'occupyTile',
    payload: {
      factionId: FACTION_ID,
      unitId: target.unitId,
      tileId: target.tileId,
    },
  })
}

function seedDirectUnsupportedResourceTarget(params: {
  resourceKind: ResourceKind
  resourceLevel: number
  unitId: string
}): { unitId: string; tileId: string } {
  let target: { unitId: string; tileId: string } | undefined
  resetWorldServiceForTests((world: WorldState) => {
    const faction = world.factions[FACTION_ID]
    assert.ok(faction, `missing faction ${FACTION_ID}`)
    const baseUnit = world.units.find((unit) => unit.faction === FACTION_ID)
    assert.ok(baseUnit, `missing base unit for ${FACTION_ID}`)
    const tile = world.map.tiles.find((candidate) => candidate.type !== 'city' && candidate.type !== 'fog')
    assert.ok(tile, 'missing occupiable tile for unsupported resource direct service proof')
    tile.type = 'resource'
    tile.terrain = 'grassland'
    tile.owner = 'neutral'
    tile.resourceKind = params.resourceKind
    tile.resourceLevel = params.resourceLevel
    tile.enemyPressure = 0
    tile.moveCost = 1
    world.units = [
      ...world.units.filter((unit) => unit.faction !== FACTION_ID),
      cloneReadyUnit(baseUnit, params.unitId, tile.id),
    ]
    faction.actionPoints = 100
    faction.food = 100
    world.executions[FACTION_ID] = null
    target = { unitId: params.unitId, tileId: tile.id }
  })
  assert.ok(target, 'unsupported resource target should be seeded')
  return target
}

async function run() {
  const seeded = seedWorldStateWithResourceBackendTargets()
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    for (const target of seeded.l1L9Targets) {
      const result = await occupy(baseUrl, target)
      assert.equal(result.status, 200, `L${target.resourceLevel} occupy route failed: ${JSON.stringify(result.data)}`)
      const payload = readObject(result.data)
      assert.equal(payload.ok, true, `L${target.resourceLevel} resource occupy should succeed: ${JSON.stringify(result.data)}`)
      const receipt = readObject(payload.receipt) as WorldActionReceipt
      assert.equal(receipt.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
      assert.equal(receipt.resourceEconomyConfigVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
      assert.equal(receipt.resourceEconomyConfigSource, RESOURCE_CONFIG_SOURCE)
      assert.equal(receipt.tileLevel, target.resourceLevel)
      assert.equal(receipt.resourceKind, target.resourceKind)
      assert.deepEqual(receipt.baseYieldPerHour, { min: exactMainResourceYield(target.resourceLevel), max: exactMainResourceYield(target.resourceLevel) })
      assert.deepEqual(receipt.ongoingYieldPerHour, { min: exactMainResourceYield(target.resourceLevel), max: exactMainResourceYield(target.resourceLevel) })
      assert.deepEqual(receipt.defenderStrengthRange, { min: exactGuardSoldiers(target.resourceLevel), max: exactGuardSoldiers(target.resourceLevel) })
      assert.deepEqual(receipt.defenderTroopCountRange, { min: target.resourceLevel, max: target.resourceLevel })
      assert.equal(receipt.recommendedPower, exactRecommendedPower(target.resourceLevel))
      assert.equal(receipt.captureReward?.resourceKind, target.resourceKind)
      assert.equal(receipt.captureReward?.captureRewardUsesResourceLevel, true)
      assert.deepEqual(receipt.captureReward?.amount, { min: exactMainResourceYield(target.resourceLevel), max: exactMainResourceYield(target.resourceLevel) })
      assert.equal(receipt.captureReward?.heroExp, exactHeroExp(target.resourceLevel))
      assert.equal(receipt.captureRewardUsesResourceLevel, true)
      assert.equal(receipt.l1L9YieldCurveBounded, true)
      assert.equal(receipt.l0SubstrateYieldPerHour, 0)
      assert.equal(receipt.l0SubstrateExpeditionRewardBlocked, true)
      assert.equal(receipt.resourceTileBackendSettlementReadbackScope, BACKEND_SCOPE)
      assertNoEngineeringCopy(receipt)
    }

    const l0Result = await occupy(baseUrl, seeded.l0Target)
    assert.equal(l0Result.status, 200, `L0 occupy route failed: ${JSON.stringify(l0Result.data)}`)
    const l0Payload = readObject(l0Result.data)
    assert.equal(l0Payload.ok, true, 'L0 ordinary occupation may succeed, but resource reward path must be blocked')
    const l0Receipt = readObject(l0Payload.receipt) as WorldActionReceipt
    assert.equal(l0Receipt.tileLevel, 0)
    assert.equal(l0Receipt.resourceKind, undefined)
    assert.equal(l0Receipt.baseYieldPerHour?.max ?? 0, 0)
    assert.equal(l0Receipt.ongoingYieldPerHour?.max ?? 0, 0)
    assert.equal(l0Receipt.captureReward, undefined)
    assert.equal(l0Receipt.l0SubstrateYieldPerHour, 0)
    assert.equal(l0Receipt.l0SubstrateExpeditionRewardBlocked, true)
    assert.equal(l0Receipt.resourceTileBackendSettlementReadbackScope, BACKEND_SCOPE)
    assertNoEngineeringCopy(l0Receipt)

    const l10Target = seedDirectUnsupportedResourceTarget({
      resourceKind: 'iron',
      resourceLevel: 10,
      unitId: 'resource_backend_l10_unit',
    })
    const l10Payload = occupyTileAction({ factionId: FACTION_ID, ...l10Target }, true)
    assert.equal(l10Payload.ok, false, 'L10 must stay unsupported and must not settle successfully')
    assert.equal(l10Payload.failureCode, 'tile_not_occupiable')
    const l10Receipt = readObject(l10Payload.receipt) as WorldActionReceipt
    assert.equal(l10Receipt.resourceTileSettlementStatus, 'unsupported_resource_level')
    assert.equal(l10Receipt.tileLevel, 10)
    assert.equal(l10Receipt.captureReward, undefined)
    assert.equal(l10Receipt.resourceTileBackendSettlementReadbackScope, BACKEND_SCOPE)
    assertNoEngineeringCopy(l10Receipt)

    const copperTarget = seedDirectUnsupportedResourceTarget({
      resourceKind: 'copper',
      resourceLevel: 3,
      unitId: 'resource_backend_copper_unit',
    })
    const copperPayload = occupyTileAction({ factionId: FACTION_ID, ...copperTarget }, true)
    assert.equal(copperPayload.ok, false, 'copper must be explicit unsupported P0 economy, not silently mapped to food')
    assert.equal(copperPayload.failureCode, 'tile_not_occupiable')
    const copperReceipt = readObject(copperPayload.receipt) as WorldActionReceipt
    assert.equal(copperReceipt.resourceTileSettlementStatus, 'unsupported_resource_kind')
    assert.equal(copperReceipt.resourceKind, 'copper')
    assert.equal(copperReceipt.captureReward, undefined)
    assert.equal(copperReceipt.resourceTileBackendSettlementReadbackScope, BACKEND_SCOPE)
    assertNoEngineeringCopy(copperReceipt)

    console.log('[world_resource_tile_backend_settlement_readback_contract] all checks passed')
  } catch (error) {
    console.error('[world_resource_tile_backend_settlement_readback_contract] backend exit state:', {
      exitCode: child.exitCode,
      signalCode: child.signalCode,
      killed: child.killed,
    })
    console.error('[world_resource_tile_backend_settlement_readback_contract] backend stdout tail:', tail.stdout.join('\n'))
    console.error('[world_resource_tile_backend_settlement_readback_contract] backend stderr tail:', tail.stderr.join('\n'))
    throw error
  } finally {
    await shutdownChild(child)
    rmSync(seeded.path, { force: true })
  }
}

run().catch((error) => {
  console.error('[world_resource_tile_backend_settlement_readback_contract] failed:', error)
  process.exitCode = 1
})
