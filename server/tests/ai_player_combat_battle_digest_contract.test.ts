import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  joinGovernor,
  loadWorldState,
  registerDefaultAiPlayer,
  startAiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

function seedBattleDigestWorld(): { persistRoot: string; path: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding battle digest world`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding battle digest world`)

  unit.aiPlayerId = AI_PLAYER_ID
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'guard',
    },
  ]
  world.tick = 180
  const targetTiles = world.map.tiles.slice(0, 6)
  assert.ok(targetTiles.length >= 3, 'battle digest seed requires at least 3 target tiles')
  for (const [index, tile] of targetTiles.entries()) {
    tile.owner = index % 2 === 0 ? 'enemy' : FACTION_ID
    tile.enemyPressure = index % 2 === 0 ? 5 : 4
    tile.name = `坐标热点${index + 1}`
  }
  unit.tileId = targetTiles[1].id

  world.feedback.battleRecords = Array.from({ length: 30 }, (_, index) => {
    const tile = targetTiles[index % 3]
    const outcome = index % 5 === 0 ? 'loss' : index % 4 === 0 ? 'draw' : 'win'
    return {
      id: `battle_digest_${String(index).padStart(2, '0')}`,
      tick: world.tick - index,
      regionId: index % 2 === 0 ? 'coordinate_cluster_alpha' : 'coordinate_cluster_beta',
      region: index % 2 === 0 ? '坐标热区甲' : '坐标热区乙',
      tileId: tile.id,
      ...(index % 3 === 0 ? {} : {
        tileX: tile.x,
        tileY: tile.y,
      }),
      attackerFaction: FACTION_ID,
      attackerUnitId: unit.id,
      aiPlayerId: AI_PLAYER_ID,
      outcome,
      attackerLoss: outcome === 'loss' ? 70 : 12 + index,
      defenderLoss: outcome === 'win' ? 45 : 10,
      alliedSupport: index % 3,
      summary: `坐标热点 ${tile.x},${tile.y} 发生第 ${index + 1} 条战斗。`,
    }
  })

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_combat_battle_digest_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, path }
}

const seeded = seedBattleDigestWorld()
const backend = await startAiPlayerHttpBackend(
  'ai_player_combat_battle_digest_contract',
  undefined,
  {
    AI_PLAYER_RUNTIME_ENABLED: 'true',
    WORLD_PERSIST_ROOT: seeded.persistRoot,
    WORLD_STATE_PERSIST_PATH: seeded.path,
  },
)

try {
  await loadWorldState(backend.baseUrl)
  await joinGovernor(backend.baseUrl)
  await registerDefaultAiPlayer(backend.baseUrl)
  void GOVERNOR_PLAYER_ID
  const response = await requestJson(
    backend.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=5`,
    'GET',
  )
  assert.equal(response.status, 200, `battle digest observation failed: ${JSON.stringify(response.data)}`)
  const observation = readObject(readObject(response.data).observation)
  const digest = readObject(observation.battleDigest)
  assert.equal(digest.schemaVersion, 'ai_combat_battle_digest_v1')
  assert.equal(digest.coordinateSpace, 'world_tile_grid')
  assert.equal(digest.retainedBattleRecordCount, 30)
  assert.equal(digest.relevantBattleReportCount, 30)
  assert.equal(digest.visibleBattleReportCount, 5)
  assert.equal(digest.omittedRelevantReportCount, 25)
  const coordinateCoverage = readObject(digest.coordinateCoverage)
  assert.equal(coordinateCoverage.totalRelevantReportCount, 30)
  assert.equal(coordinateCoverage.directCoordinateCount, 20)
  assert.equal(coordinateCoverage.tileBackfilledCoordinateCount, 10)
  assert.equal(coordinateCoverage.missingCoordinateCount, 0)
  assert.equal(coordinateCoverage.coverageRateBps, 10000)
  assert.match(String(digest.playerFacingSummary), /30条相关战报/)
  assert.match(String(digest.playerFacingSummary), /坐标/)
  assert.doesNotMatch(String(digest.playerFacingSummary), /东线|西门|北侧/)
  const hotspots = readArray(digest.targetHotspots).map((item) => readObject(item))
  assert.ok(hotspots.length >= 1, 'battle digest should expose coordinate hotspots')
  assert.ok(hotspots.some((hotspot) => {
    const center = hotspot.center
    return center !== null && typeof center === 'object' && readObject(center).x !== undefined && readObject(center).y !== undefined
  }))
  assert.ok(hotspots.some((hotspot) => {
    const chunk = hotspot.chunk
    return chunk !== null && typeof chunk === 'object' && readObject(chunk).size === 64
  }))
  assert.ok(hotspots.some((hotspot) => readArray(hotspot.targetTileIds).length >= 1))
  assert.ok(hotspots.some((hotspot) => String(hotspot.playerFacingSummary).includes('坐标')))

  const summaryResponse = await requestJson(
    backend.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/daily-summary?limit=20`,
    'GET',
  )
  assert.equal(summaryResponse.status, 200, `daily summary with battle digest failed: ${JSON.stringify(summaryResponse.data)}`)
  const summary = readObject(readObject(summaryResponse.data).summary)
  const summaryDigest = readObject(summary.battleDigest)
  assert.equal(summaryDigest.omittedRelevantReportCount, 10)
  assert.equal(readObject(summaryDigest.coordinateCoverage).coverageRateBps, 10000)
  assert.match(String(summary.summary), /相关战报|坐标热点/)
  assert.doesNotMatch(String(summary.summary), /proposalId|worldAction|regionId|battleDigest/)
} finally {
  await backend.stop()
}

console.log('[ai_player_combat_battle_digest_contract] ok')
