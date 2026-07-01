import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import type { WorldState } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
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

function assignCluster(world: WorldState, index: number, owner: string) {
  const cluster = world.map.overlays.cityClusters[index]
  assert.ok(cluster, `seed world should expose city cluster ${index}`)
  cluster.owner = owner
  cluster.camp = owner === 'player' ? 'human_controlled' : 'autonomous'
  for (const tileId of cluster.tileIds) {
    const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
    if (tile) tile.owner = owner
  }
  const hallTile = world.map.tiles.find((candidate) => candidate.id === cluster.cityHallTileId)
  assert.ok(hallTile, `seed world should expose city hall for cluster ${index}`)
  hallTile.owner = owner
  hallTile.type = 'city'
  if (index === 0) {
    hallTile.landmarkId = 'state_government_w3_qingzhou'
    hallTile.landmarkName = '青州州治'
    cluster.name = '青州州治'
  }
  return hallTile
}

function seedNationWarObjectiveWorldState(): string {
  const world = createInitialWorldState()
  world.alliance.level = 90
  const faction = world.factions.player
  assert.ok(faction, 'seed world should expose player faction')
  faction.organizationId = 'player'
  faction.organizationKind = 'nation'
  faction.organizationName = '齐国'
  faction.nationName = '齐国'
  faction.nationTier = 'empire'
  faction.nationCapitalTileId = 'tile_08'
  faction.nationCapitalName = '青石城'
  faction.jade = 40
  faction.luoyangHoldTicks = 15

  for (let index = 0; index < world.map.overlays.cityClusters.length; index += 1) {
    assignCluster(world, index, index < 13 ? 'player' : 'enemy')
  }

  const luoyangTiles = world.map.tiles.filter((tile) =>
    tile.landmarkName?.includes('洛阳') ||
    (tile.x >= 155 && tile.x <= 165 && tile.y >= 150 && tile.y <= 160 && tile.type === 'city'),
  )
  const fallbackLuoyangTile = world.map.tiles.find((tile) => tile.type === 'city')
  assert.ok(luoyangTiles.length > 0 || fallbackLuoyangTile, 'seed world should expose a Luoyang or city tile')
  for (const tile of luoyangTiles.length > 0 ? luoyangTiles : [fallbackLuoyangTile]) {
    assert.ok(tile)
    tile.owner = 'player'
    tile.landmarkName = '洛阳'
    tile.type = 'city'
  }

  const path = buildSessionPersistPath('nation_war_objective_contract_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return path
}

async function run() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seedNationWarObjectiveWorldState(),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const response = await requestJson(baseUrl, '/api/nation/war-objectives?factionId=player', 'GET', undefined, 60_000)
    assert.equal(response.status, 200, `nation war objective route failed: ${JSON.stringify(response.data)}`)
    const model = readObject(response.data)
    assert.equal(model.contractId, 'nation_war_objective_read_model_v1')
    assert.equal(model.factionId, 'player')
    assert.equal(model.organizationKind, 'nation')
    assert.equal(model.nationTier, 'empire')
    assert.equal(model.authoritySource, 'nation_world_state_victory_objective_read_model')

    const objectives = (model.objectives as unknown[]).map(readObject)
    for (const objectiveId of ['region_control', 'state_capital', 'luoyang_control', 'empire_status', 'east_han_unification']) {
      assert.ok(objectives.some((objective) => objective.objectiveId === objectiveId), `missing objective ${objectiveId}`)
    }
    assert.ok(objectives.some((objective) => objective.objectiveId === 'luoyang_control' && objective.status === 'achieved'), 'Luoyang objective should be achieved from authoritative hold state')
    assert.ok(objectives.some((objective) => objective.objectiveId === 'empire_status' && objective.status === 'achieved'), 'empire objective should prove success state')
    assert.ok(objectives.some((objective) => objective.objectiveId === 'east_han_unification' && objective.requiredStateCount === 13), 'unification objective should explicitly target East Han thirteen states')
    assert.ok(!/rpg|剧情主线|主线任务/i.test(JSON.stringify(model)), 'nation objectives must not become generic RPG mainline copy')

    console.log('[nation_war_objective_contract] all checks passed')
  } finally {
    await shutdownChild(child)
  }
}

run().catch((error) => {
  console.error('[nation_war_objective_contract] failed:', error)
  process.exit(1)
})
