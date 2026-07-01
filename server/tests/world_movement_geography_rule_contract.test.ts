import assert from 'node:assert/strict'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { moveUnit } from '../../shared/domain/rules'
import type {
  FactionId,
  MovementGeographyFeedback,
  Tile,
  Unit,
  WorldState,
} from '../../shared/contracts/game'

function tile(input: Partial<Tile> & Pick<Tile, 'id' | 'name' | 'type' | 'terrain' | 'x' | 'y' | 'district'>): Tile {
  return {
    owner: 'neutral',
    moveCost: 1,
    enemyPressure: 0,
    scoutingDifficulty: 1,
    ...input,
  }
}

function buildWorldForMovement(from: Tile, to: Tile, factionId: FactionId = 'player'): { world: WorldState; unit: Unit } {
  const world = createInitialWorldState()
  const baseUnit = world.units.find((candidate) => candidate.faction === factionId) ?? world.units[0]
  const unit: Unit = {
    ...structuredClone(baseUnit),
    id: 'geo_unit_1',
    name: '地理解释测试队',
    faction: factionId,
    tileId: from.id,
    strength: 100,
    mobility: 4,
    supply: 8,
    status: '待命',
    currentTask: '等待地理解释',
  }
  world.map.tiles = [
    ...world.map.tiles.filter((candidate) => candidate.id !== from.id && candidate.id !== to.id),
    from,
    to,
  ]
  world.map.connections = {
    ...world.map.connections,
    [from.id]: [to.id],
    [to.id]: [from.id],
  }
  world.units = [unit]
  world.executions = {}
  world.factions[factionId].actionPoints = 20
  world.factions[factionId].food = 20
  return { world, unit }
}

function assertFeedbackShape(feedback: MovementGeographyFeedback, expectedCode: MovementGeographyFeedback['code']) {
  assert.equal(feedback.schemaVersion, 'movement_geography_feedback_v0_1')
  assert.equal(feedback.code, expectedCode)
  assert.equal(
    feedback.seaRouteAuthorityBoundary,
    'land_movement_only_sea_route_authority_is_independent',
    'land movement feedback must not become W6 sea-route authority',
  )
  assert.ok(feedback.playerSummary.length > 0, 'feedback should expose player-readable summary')
}

function readFeedback(feedback: MovementGeographyFeedback | undefined): MovementGeographyFeedback {
  assert.ok(feedback, 'movement result should expose geography feedback')
  return feedback
}

async function run() {
  {
    const from = tile({
      id: 'geo_sili_plain',
      name: '司隶平原',
      type: 'plain',
      terrain: 'grassland',
      x: 10,
      y: 10,
      district: 'sili',
      owner: 'player',
    })
    const to = tile({
      id: 'geo_yanzhou_plain',
      name: '兖州边地',
      type: 'plain',
      terrain: 'grassland',
      x: 11,
      y: 10,
      district: 'yanzhou',
    })
    const { world, unit } = buildWorldForMovement(from, to)
    const result = moveUnit(world, unit.id, to.id, 'player')
    assert.equal(result.ok, false)
    assert.match(result.message, /关口/)
    const feedback = readFeedback(result.geographyFeedback)
    assertFeedbackShape(feedback, 'cross_state_blocked_requires_pass')
    assert.equal(feedback.ok, false)
    assert.equal(feedback.requiredPass?.kind, 'pass')
    assert.match(feedback.blockedReason ?? '', /跨州|关口/)
  }

  {
    const from = tile({
      id: 'geo_sili_owned_pass',
      name: '虎牢关',
      type: 'pass',
      terrain: 'mountain',
      x: 20,
      y: 20,
      district: 'sili',
      owner: 'player',
    })
    const to = tile({
      id: 'geo_yanzhou_after_pass',
      name: '兖州关外',
      type: 'plain',
      terrain: 'grassland',
      x: 21,
      y: 20,
      district: 'yanzhou',
    })
    const { world, unit } = buildWorldForMovement(from, to)
    const result = moveUnit(world, unit.id, to.id, 'player')
    assert.equal(result.ok, true)
    assertFeedbackShape(result.geographyFeedback, 'state_boundary_pass_allowed')
    assert.equal(result.geographyFeedback.ok, true)
    assert.equal(result.geographyFeedback.requiredPass?.id, from.id)
    assert.match(result.geographyFeedback.playerSummary, /关口|允许/)
  }

  {
    const from = tile({
      id: 'geo_sili_hill_road',
      name: '司隶山前路',
      type: 'plain',
      terrain: 'highland',
      x: 30,
      y: 30,
      district: 'sili',
      owner: 'player',
    })
    const to = tile({
      id: 'geo_sili_mountain_wall',
      name: '秦岭断崖',
      type: 'plain',
      terrain: 'mountain',
      x: 31,
      y: 30,
      district: 'sili',
    })
    const { world, unit } = buildWorldForMovement(from, to)
    const result = moveUnit(world, unit.id, to.id, 'player')
    assert.equal(result.ok, false)
    const feedback = readFeedback(result.geographyFeedback)
    assertFeedbackShape(feedback, 'mountain_blocked_requires_pass')
    assert.equal(feedback.requiredPass?.kind, 'pass')
  }

  {
    const from = tile({
      id: 'geo_jingzhou_bank',
      name: '荆州河岸',
      type: 'plain',
      terrain: 'grassland',
      x: 40,
      y: 40,
      district: 'jingzhou',
      owner: 'player',
    })
    const blockedRiver = tile({
      id: 'geo_jingzhou_river_band',
      name: '汉水浅滩',
      type: 'plain',
      terrain: 'riverland',
      x: 41,
      y: 40,
      district: 'jingzhou',
    })
    const { world, unit } = buildWorldForMovement(from, blockedRiver)
    const blocked = moveUnit(world, unit.id, blockedRiver.id, 'player')
    assert.equal(blocked.ok, false)
    const blockedFeedback = readFeedback(blocked.geographyFeedback)
    assertFeedbackShape(blockedFeedback, 'river_blocked_requires_dock')
    assert.equal(blockedFeedback.requiredDock?.kind, 'dock')

    const dock = tile({
      ...blockedRiver,
      id: 'geo_jingzhou_dock',
      name: '汉津渡口',
      type: 'dock',
      owner: 'player',
    })
    const allowedWorld = buildWorldForMovement(from, dock).world
    const allowed = moveUnit(allowedWorld, unit.id, dock.id, 'player')
    assert.equal(allowed.ok, true)
    assertFeedbackShape(allowed.geographyFeedback, 'river_crossing_dock_allowed')
    assert.equal(allowed.geographyFeedback.requiredDock?.id, dock.id)
    assert.match(allowed.geographyFeedback.playerSummary, /渡口|码头/)
  }

  console.log('[world_movement_geography_rule_contract] all checks passed')
}

run().catch((error) => {
  console.error('[world_movement_geography_rule_contract] failed:', error)
  process.exitCode = 1
})
