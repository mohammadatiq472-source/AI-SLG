import assert from 'node:assert/strict'
import type { Unit, WorldMapLayoutResponse, WorldSummary } from '../../shared/contracts/game/world'
import {
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

const FACTION_ID = 'player'
const EXPECTED_FORMATION_ROLES = ['vanguard', 'center', 'camp'] as const
const EXPECTED_EXIT_ANCHOR_BY_DIRECTION: Record<string, string> = {
  east: 'east_gate_queue',
  southeast: 'east_gate_queue',
  north: 'northwest_gate_queue',
  northwest: 'northwest_gate_queue',
  west: 'northwest_gate_queue',
  south: 'south_gate_queue',
  southwest: 'south_gate_queue',
}

function resolveExpectedVisualType(slot: {
  troopType?: string
  cardType?: string
}): string {
  if (slot.troopType === 'cavalry' || slot.cardType === '骑') {
    return 'cavalry'
  }
  if (slot.troopType === 'archer' || slot.cardType === '弓') {
    return 'archer'
  }
  return 'infantry'
}

function assertUnitMapVisual(unit: Unit) {
  const mapVisual = readObject(unit.mapVisual)
  const mapVisualPayload = mapVisual as {
    formationSlots?: Array<{
      role?: string
      heroId?: string
      heroName?: string
      troopType?: string
      visualType?: string
    }>
  }

  assert.ok(
    ['infantry', 'cavalry', 'archer'].includes(String(mapVisual.visualType)),
    `unit ${unit.id} should expose a map visual type`,
  )
  assert.equal(mapVisual.primaryTroopType, unit.hero.troopType, `unit ${unit.id} primary troop type should mirror hero`)
  assert.equal(mapVisual.ownerType, unit.aiPlayerId ? 'ai' : 'human', `unit ${unit.id} owner type should derive from aiPlayerId`)
  assert.equal(mapVisual.currentTileId, unit.tileId, `unit ${unit.id} current tile should mirror unit tile`)
  assert.equal(mapVisual.status, unit.status, `unit ${unit.id} status should mirror authoritative unit status`)
  assert.equal(mapVisual.label, unit.name, `unit ${unit.id} label should mirror unit name`)

  const expectedHeroSlots = [unit.hero, ...((unit.coHeroes ?? []) as Array<Unit['hero']>)].slice(0, 3)
  assert.ok(Array.isArray(mapVisualPayload.formationSlots), `unit ${unit.id} map visual should expose formationSlots`)
  assert.equal(
    mapVisualPayload.formationSlots?.length,
    expectedHeroSlots.length,
    `unit ${unit.id} formationSlots should mirror hero + coHeroes`,
  )

  expectedHeroSlots.forEach((heroSlot, index) => {
    const visualSlot = mapVisualPayload.formationSlots?.[index]
    assert.ok(visualSlot, `unit ${unit.id} formation slot ${index} should exist`)
    assert.equal(visualSlot?.role, EXPECTED_FORMATION_ROLES[index], `unit ${unit.id} slot ${index} role should be stable`)
    assert.equal(visualSlot?.heroId, heroSlot.id, `unit ${unit.id} slot ${index} heroId should mirror source hero`)
    assert.equal(visualSlot?.heroName, heroSlot.name, `unit ${unit.id} slot ${index} heroName should mirror source hero`)
    assert.equal(
      visualSlot?.visualType,
      resolveExpectedVisualType(heroSlot),
      `unit ${unit.id} slot ${index} visual type should derive from that hero troop/card type`,
    )
  })
}

function assertIsoDate(value: unknown, label: string): Date {
  assert.equal(typeof value, 'string', `${label} should be an ISO timestamp string`)
  const isoValue = value as string
  const parsed = new Date(isoValue)
  assert.ok(Number.isFinite(parsed.getTime()), `${label} should parse as a valid date`)
  assert.equal(parsed.toISOString(), isoValue, `${label} should be normalized ISO-8601`)
  return parsed
}

function resolveMoveCandidate(world: WorldSummary, connections: Record<string, string[]>) {
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID && candidate.tileId)
  assert.ok(unit, `world should include a movable ${FACTION_ID} unit`)

  const targetTileId = (connections[unit.tileId] ?? []).find((tileId) => tileId !== unit.tileId)
  assert.ok(targetTileId, `unit ${unit.id} should have an adjacent move target`)

  return {
    unit,
    targetTileId,
  }
}

function resolveExpectedRoadExitDirection(layout: WorldMapLayoutResponse, originTileId: string, targetTileId: string): string {
  const originTile = layout.map.tiles.find((tile) => tile.id === originTileId)
  const targetTile = layout.map.tiles.find((tile) => tile.id === targetTileId)
  assert.ok(originTile, `layout should expose origin tile ${originTileId}`)
  assert.ok(targetTile, `layout should expose target tile ${targetTileId}`)
  const dx = targetTile.x - originTile.x
  const dy = targetTile.y - originTile.y
  if (dy < 0) {
    return dx > 0 ? 'north' : 'northwest'
  }
  if (dx > 0) {
    return dy > 0 ? 'southeast' : 'east'
  }
  if (dx < 0) {
    return dy > 0 ? 'southwest' : 'west'
  }
  return 'south'
}

function assertThreeHeroFormationUnit(unit: Unit, expectedHeroIds: string[]) {
  const expectedProfileHeroIds = expectedHeroIds.map((heroId) => `hero_${heroId}`)
  assert.equal(unit.hero.id, expectedProfileHeroIds[0], 'deployed unit main hero should mirror formal deploy payload')
  assert.deepEqual(
    (unit.coHeroes ?? []).map((hero) => hero.id),
    expectedProfileHeroIds.slice(1),
    'deployed unit coHeroes should mirror formal deploy payload',
  )
  assertUnitMapVisual(unit)
  assert.deepEqual(
    unit.mapVisual?.formationSlots.map((slot) => slot.heroId),
    expectedProfileHeroIds,
    'mapVisual formationSlots should mirror the formal three-hero formation',
  )
  const visualTypes = new Set(unit.mapVisual?.formationSlots.map((slot) => slot.visualType))
  assert.ok(visualTypes.size >= 2, 'formal formation should expose multiple visual rows when selected heroes differ')
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const baselineResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(baselineResponse.status, 200, `world route failed: ${JSON.stringify(baselineResponse.data)}`)
    const baselineWorld = readObject(readObject(baselineResponse.data).world) as unknown as WorldSummary
    assert.ok(baselineWorld.units.length > 0, 'world should expose units for map visual rendering')
    for (const unit of baselineWorld.units.slice(0, 8)) {
      assertUnitMapVisual(unit)
    }

    const layoutResponse = await requestJson(baseUrl, '/api/world/map-layout?scope=bootstrap', 'GET', undefined, 30_000)
    assert.equal(layoutResponse.status, 200, `map layout route failed: ${JSON.stringify(layoutResponse.data)}`)
    const layout = readObject(layoutResponse.data) as unknown as WorldMapLayoutResponse
    const { unit, targetTileId } = resolveMoveCandidate(baselineWorld, layout.map.connections)
    const moveResponse = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'moveUnit',
      payload: {
        factionId: FACTION_ID,
        unitId: unit.id,
        targetTileId,
      },
    })
    assert.equal(moveResponse.status, 200, `moveUnit action failed: ${JSON.stringify(moveResponse.data)}`)
    const movePayload = readObject(moveResponse.data)
    assert.equal(movePayload.ok, true, `moveUnit should succeed: ${JSON.stringify(movePayload)}`)

    const movedWorld = readObject(movePayload.world) as unknown as WorldSummary
    const movedUnit = movedWorld.units.find((candidate) => candidate.id === unit.id)
    assert.ok(movedUnit, `moved unit ${unit.id} should remain in world`)
    assertUnitMapVisual(movedUnit)
    assert.equal(movedUnit.mapVisual?.currentTileId, targetTileId, 'map visual should update after authoritative movement')
    assert.ok(movedUnit.march, 'moved unit should expose authoritative march timing')
    assert.equal(movedUnit.march?.targetTileId, targetTileId, 'march target should mirror the requested target')
    assert.deepEqual(movedUnit.march?.path, [unit.tileId, targetTileId], 'march path should preserve origin and target')
    const startedAt = assertIsoDate(movedUnit.march?.startedAt, 'march.startedAt')
    const estimatedArrivalAt = assertIsoDate(movedUnit.march?.estimatedArrivalAt, 'march.estimatedArrivalAt')
    assert.ok(estimatedArrivalAt.getTime() > startedAt.getTime(), 'march ETA should be after march start')
    assert.ok((movedUnit.march?.durationSec ?? 0) > 0, 'march duration should be positive')
    assert.equal(movedUnit.mapVisual?.targetTileId, movedUnit.march?.targetTileId, 'map visual target should mirror march target')
    assert.deepEqual(
      movedUnit.mapVisual?.currentPath,
      movedUnit.march?.path,
      'map visual path should be derived from the authoritative march path',
    )
    assert.equal(movedUnit.mapVisual?.marchStartedAt, movedUnit.march?.startedAt, 'map visual should mirror march start')
    assert.equal(movedUnit.mapVisual?.etaAt, movedUnit.march?.estimatedArrivalAt, 'map visual should mirror march ETA')
    assert.equal(movedUnit.mapVisual?.estimatedArrivalAt, movedUnit.march?.estimatedArrivalAt, 'map visual should expose explicit estimated arrival')
    const expectedRoadExitDirection = resolveExpectedRoadExitDirection(layout, unit.tileId, targetTileId)
    const expectedExitAnchorId = EXPECTED_EXIT_ANCHOR_BY_DIRECTION[expectedRoadExitDirection]
    assert.equal(movedUnit.march?.roadExitDirection, expectedRoadExitDirection, 'march should expose authoritative road exit direction')
    assert.equal(movedUnit.march?.exitAnchorId, expectedExitAnchorId, 'march should expose authoritative exit anchor id')
    assert.equal(movedUnit.mapVisual?.roadExitDirection, movedUnit.march?.roadExitDirection, 'map visual should mirror road exit direction')
    assert.equal(movedUnit.mapVisual?.exitAnchorId, movedUnit.march?.exitAnchorId, 'map visual should mirror exit anchor id')

    const recruitResponse = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
      action: 'recruitProspectHero',
      payload: {
        factionId: FACTION_ID,
        count: 1,
        poolId: 'pool_standard',
      },
    })
    assert.equal(recruitResponse.status, 200, `recruitProspectHero action failed: ${JSON.stringify(recruitResponse.data)}`)
    const recruitPayload = readObject(recruitResponse.data)
    assert.equal(recruitPayload.ok, true, `recruitProspectHero should succeed: ${JSON.stringify(recruitPayload)}`)
    const worldAfterRecruit = readObject(recruitPayload.world) as unknown as WorldSummary
    const reserveHeroIds = worldAfterRecruit.factions[FACTION_ID]?.heroCommand.reserveHeroIds ?? []
    assert.ok(reserveHeroIds.length >= 3, 'formal three-hero deploy should have at least three reserve heroes')
    const formationHeroIds = reserveHeroIds.slice(0, 3)
    let deployResponse: Awaited<ReturnType<typeof requestJson>>
    try {
      deployResponse = await requestJson(baseUrl, '/api/world/action?includeWorld=true', 'POST', {
        action: 'deployReserveHero',
        payload: {
          factionId: FACTION_ID,
          heroId: formationHeroIds[0],
          coHeroIds: formationHeroIds.slice(1),
          tileId: worldAfterRecruit.factions[FACTION_ID]?.heroCommand.homeTileId,
        },
      })
    } catch (error) {
      console.error(
        `[map_unit_visual_contract] deployReserveHero request failed\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`,
      )
      throw error
    }
    assert.equal(deployResponse.status, 200, `deployReserveHero action failed: ${JSON.stringify(deployResponse.data)}`)
    const deployPayload = readObject(deployResponse.data)
    assert.equal(deployPayload.ok, true, `deployReserveHero should accept formal coHeroIds: ${JSON.stringify(deployPayload)}`)
    assert.deepEqual(deployPayload.heroIds, formationHeroIds, 'deployReserveHero response should expose all selected heroIds')
    const worldAfterDeploy = readObject(deployPayload.world) as unknown as WorldSummary
    const deployedUnit = worldAfterDeploy.units.find((candidate) => candidate.id === deployPayload.unitId)
    assert.ok(deployedUnit, 'formal deploy should create a map unit')
    assertThreeHeroFormationUnit(deployedUnit, formationHeroIds)
    for (const heroId of formationHeroIds) {
      assert.ok(
        !(worldAfterDeploy.factions[FACTION_ID]?.heroCommand.reserveHeroIds ?? []).includes(heroId),
        `formal deploy should remove ${heroId} from reserveHeroIds`,
      )
    }
    const idempotentDeployResponse = await requestJson(baseUrl, '/api/world/action?includeWorld=false', 'POST', {
      action: 'deployReserveHero',
      payload: {
        factionId: FACTION_ID,
        heroId: formationHeroIds[0],
        coHeroIds: formationHeroIds.slice(1),
        tileId: worldAfterRecruit.factions[FACTION_ID]?.heroCommand.homeTileId,
      },
    })
    assert.equal(
      idempotentDeployResponse.status,
      200,
      `idempotent deployReserveHero action failed: ${JSON.stringify(idempotentDeployResponse.data)}`,
    )
    const idempotentDeployPayload = readObject(idempotentDeployResponse.data)
    assert.equal(
      idempotentDeployPayload.ok,
      true,
      `deployReserveHero should accept an already deployed identical three-hero formation: ${JSON.stringify(idempotentDeployPayload)}`,
    )
    assert.equal(idempotentDeployPayload.unitId, deployPayload.unitId, 'idempotent formation submit should return the existing unit id')
    assert.deepEqual(
      idempotentDeployPayload.heroIds,
      formationHeroIds,
      'idempotent formation submit should preserve the original heroIds order',
    )

    console.log('[map_unit_visual_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[map_unit_visual_contract] failed:', error)
  process.exitCode = 1
})
