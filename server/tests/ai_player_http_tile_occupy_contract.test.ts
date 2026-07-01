import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { Unit } from '../../shared/contracts/game/world'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  assertSuccessfulReceipt,
  createApproveExecuteProposal,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
  type AiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import { readArray, readObject, requestJson } from './helpers/backendHarness'

const MAIN_MAP_WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'
const MAIN_MAP_COORDINATE_SPACE = 'real_map_data_1km.cell_1km'
const MAIN_MAP_RUNTIME_SCHEMA_VERSION = 'main_map_runtime_v0_1'
const ENEMY_FACTION_ID = 'enemy'

function visibleCardText(card: Record<string, unknown>): string {
  return [
    card.actorName,
    card.title,
    card.summary,
    card.locationLabel,
    card.targetLabel,
    card.resultLabel,
    card.consequenceLabel,
    card.nextActionLabel,
  ].filter(Boolean).join('\n')
}

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  bearerToken: string,
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    return {
      status: response.status,
      data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

function clonePvpDefenderFrom(attacker: Unit, tileId: string): Unit {
  const defender: Unit = structuredClone(attacker)
  defender.id = 'ai_player_http_tile_occupy_pvp_defender'
  defender.name = 'AI Player Tile Occupy PvP Defender'
  defender.faction = ENEMY_FACTION_ID
  defender.tileId = tileId
  defender.status = '驻防中'
  defender.currentTask = 'Hold AI player tile occupy contract tile'
  defender.strength = 35
  defender.supply = 4
  defender.mobility = 8
  defender.corps = {
    ...defender.corps,
    name: 'AI Player PvP Guard',
    readiness: 80,
    roster: ['front guard'],
  }
  defender.hero = {
    ...defender.hero,
    id: 'hero_ai_player_http_tile_occupy_pvp_defender',
    name: 'AI Player PvP Defender',
    force: 45,
    command: 42,
    intelligence: 40,
    charisma: 40,
    speed: 38,
    signatureSkill: {
      name: 'Guard Counter',
      detail: 'Basic occupied tile defense.',
    },
  }
  return defender
}

function seedWorldStateWithTileOccupyTarget(): { persistRoot: string; path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player tile occupy shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player tile occupy shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles.find((tile) => tile.type === 'resource')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing map tile while seeding AI player tile occupy shard')

  targetTile.type = 'resource'
  targetTile.resourceKind = 'food'
  targetTile.resourceLevel = 1
  targetTile.owner = 'neutral'
  targetTile.enemyPressure = 2
  unit.tileId = targetTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = Math.max(unit.strength, 180)
  unit.supply = Math.max(unit.supply, 9)
  unit.mobility = Math.max(unit.mobility, 12)
  unit.hero.level = 24
  unit.hero.exp = 90
  faction.actionPoints = Math.max(faction.actionPoints, 3)
  faction.food = Math.max(faction.food, 3)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_tile_occupy_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, path, unitId: unit.id, tileId: targetTile.id }
}

function seedWorldStateWithPvpTileOccupyTarget(): { persistRoot: string; path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player PvP tile occupy shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player PvP tile occupy shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing PvP map tile while seeding AI player tile occupy shard')

  targetTile.type = 'plain'
  targetTile.terrain = 'grassland'
  targetTile.owner = ENEMY_FACTION_ID
  targetTile.enemyPressure = 4
  targetTile.moveCost = 1
  unit.tileId = targetTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 900
  unit.supply = 9
  unit.mobility = Math.max(unit.mobility, 20)
  unit.hero.force = 95
  unit.hero.command = 92
  unit.hero.intelligence = 88
  unit.hero.speed = 80
  unit.corps.readiness = 100
  faction.actionPoints = Math.max(faction.actionPoints, 6)
  faction.food = Math.max(faction.food, 6)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]
  world.feedback.battleRecords = []
  world.units = world.units.filter((candidate) => candidate.id === unit.id || candidate.tileId !== targetTile.id)
  world.units.push(clonePvpDefenderFrom(unit, targetTile.id))

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_tile_occupy_pvp_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, path, unitId: unit.id, tileId: targetTile.id }
}

function seedWorldStateWithPvpTileOccupyLossTarget(): { persistRoot: string; path: string; unitId: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player PvP loss tile occupy shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player PvP loss tile occupy shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing PvP loss map tile while seeding AI player tile occupy shard')

  targetTile.type = 'plain'
  targetTile.terrain = 'grassland'
  targetTile.owner = ENEMY_FACTION_ID
  targetTile.enemyPressure = 8
  targetTile.moveCost = 1
  unit.tileId = targetTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 30
  unit.supply = 5
  unit.mobility = Math.max(unit.mobility, 20)
  unit.hero.force = 25
  unit.hero.command = 25
  unit.hero.intelligence = 20
  unit.hero.speed = 20
  unit.corps.readiness = 45
  faction.actionPoints = Math.max(faction.actionPoints, 6)
  faction.food = Math.max(faction.food, 6)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]
  world.feedback.battleRecords = []
  world.units = world.units.filter((candidate) => candidate.id === unit.id || candidate.tileId !== targetTile.id)
  const defender = clonePvpDefenderFrom(unit, targetTile.id)
  defender.id = 'ai_player_http_tile_occupy_pvp_loss_defender'
  defender.strength = 900
  defender.supply = 10
  defender.hero.force = 96
  defender.hero.command = 95
  defender.corps.readiness = 100
  world.units.push(defender)

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_tile_occupy_pvp_loss_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, path, unitId: unit.id, tileId: targetTile.id }
}

function seedWorldStateWithImmuneTileOccupyTarget(): {
  persistRoot: string
  path: string
  unitId: string
  tileId: string
  immunityUntil: string
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding AI player immune tile occupy shard`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding AI player immune tile occupy shard`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles.find((tile) => tile.type === 'resource')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing map tile while seeding AI player immune tile occupy shard')

  targetTile.type = 'plain'
  targetTile.owner = 'neutral'
  targetTile.enemyPressure = 2
  unit.tileId = targetTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  faction.actionPoints = Math.max(faction.actionPoints, 3)
  faction.food = Math.max(faction.food, 3)
  faction.aiPlayers = [
    {
      id: AI_PLAYER_ID,
      name: 'Player Operator Alpha',
      factionId: FACTION_ID,
      unitIds: [unit.id],
      specialty: 'logistics',
    },
  ]

  const cellX = Math.floor(Number(targetTile.x))
  const cellY = Math.floor(Number(targetTile.y))
  assert.ok(Number.isFinite(cellX), 'immune target tile should expose finite x')
  assert.ok(Number.isFinite(cellY), 'immune target tile should expose finite y')
  const cellId = `${MAIN_MAP_WORLD_ID}:${cellX}:${cellY}`
  const immunityUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  world.mainMapRuntime = {
    schemaVersion: MAIN_MAP_RUNTIME_SCHEMA_VERSION,
    worldId: MAIN_MAP_WORLD_ID,
    coordinateSpace: MAIN_MAP_COORDINATE_SPACE,
    ownerIndexVersion: 'main_map_owner_index_v0_1',
    resourceGenerationVersion: 'test',
    overrideVersion: 1,
    cellOverrides: {
      [cellId]: {
        cellId,
        worldId: MAIN_MAP_WORLD_ID,
        coordinateSpace: MAIN_MAP_COORDINATE_SPACE,
        cellX,
        cellY,
        chunkId: `chunk_y${Math.floor(cellY / 64).toString().padStart(3, '0')}_x${Math.floor(cellX / 64).toString().padStart(3, '0')}`,
        owner: ENEMY_FACTION_ID,
        cellVersion: 1,
        lastEventId: 'test_main_map_immunity_claim_event',
        lastEventType: 'claim',
        updatedWorldVersion: world.worldVersion,
        updatedAt: new Date().toISOString(),
        updatedByFactionId: ENEMY_FACTION_ID,
        requestId: 'test_main_map_immunity_claim_request',
        immunityActive: true,
        immunityUntil,
        immunitySource: 'main_map_cell_claim',
      },
    },
    events: [],
  }

  const persistRoot = join(process.cwd(), 'tmp', `ai_player_http_tile_occupy_immune_world_${process.pid}_${Date.now()}`)
  const path = join(persistRoot, 'world_snapshot.json')
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { persistRoot, path, unitId: unit.id, tileId: targetTile.id, immunityUntil }
}

async function bootTileOccupyBackend(worldPersistRoot: string): Promise<AiPlayerHttpBackend> {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_http_tile_occupy_contract',
    undefined,
    {
      WORLD_PERSIST_ROOT: worldPersistRoot,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist: ['tile_occupy'],
  })
  assert.equal(register.status, 200, `register tile occupy AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

async function run() {
  const seeded = seedWorldStateWithTileOccupyTarget()
  const backend = await bootTileOccupyBackend(seeded.persistRoot)
  try {
    const catalog = await requestJson(backend.baseUrl, '/api/ai/player-actions/catalog', 'GET')
    assert.equal(catalog.status, 200)
    const occupyEntry = readArray(readObject(catalog.data).catalog)
      .map((item) => readObject(item))
      .find((item) => item.action === 'tile_occupy')
    assert.ok(occupyEntry, 'catalog should expose tile_occupy')
    assert.equal(occupyEntry.riskLevel, 'medium')
    assert.equal(occupyEntry.requiresApprovalByDefault, true)
    assert.equal(occupyEntry.executableInV1, true)
    assert.equal(occupyEntry.mappedWorldAction, 'occupyTile')

    const invalidArgs = await requestJson(backend.baseUrl, '/api/ai/players/proposals', 'POST', {
      aiPlayerId: AI_PLAYER_ID,
      action: 'tile_occupy',
      source: 'mcp',
      reason: 'invalid tile occupy args should be rejected',
      args: {
        unitId: 123,
        tileId: seeded.tileId,
      },
    })
    assert.equal(invalidArgs.status, 422, 'tile_occupy should reject non-string unitId')

    const worldBefore = await loadWorldState(backend.baseUrl)
    const factionBefore = worldBefore.factions[FACTION_ID]
    assert.ok(factionBefore, 'faction should exist before tile occupy')

    const { receipt } = await createApproveExecuteProposal(
      backend.baseUrl,
      'tile_occupy',
      {
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
      'AI player tile occupy shard success',
    )
    assertSuccessfulReceipt('tile_occupy', receipt, 'occupyTile')
    assert.deepEqual(
      readObject(receipt.worldActionPayload),
      {
        factionId: FACTION_ID,
        aiPlayerId: AI_PLAYER_ID,
        unitId: seeded.unitId,
        tileId: seeded.tileId,
      },
      'tile_occupy receipt should surface world action payload',
    )
    assert.ok(readObject(receipt.execution), 'tile_occupy receipt should include execution')
    const worldReceipt = readObject(receipt.worldReceipt)
    const expectedHeroId = String(worldBefore.units.find((unit) => unit.id === seeded.unitId)?.hero.id ?? '').replace(/^hero_/, '')
    assert.equal(worldReceipt.action, 'occupyTile')
    assert.equal(worldReceipt.unitId, seeded.unitId)
    assert.equal(worldReceipt.tileId, seeded.tileId)
    assert.equal(worldReceipt.heroId, expectedHeroId)
    assert.equal(worldReceipt.expGained, 20)
    assert.equal(worldReceipt.previousLevel, 24)
    assert.equal(worldReceipt.nextLevel, 25)
    assert.equal(worldReceipt.previousExp, 90)
    assert.equal(worldReceipt.nextExp, 10)
    assert.equal(worldReceipt.strengthBefore, 180)
    assert.equal(worldReceipt.strengthAfter, 178)
    assert.equal(worldReceipt.supplyBefore, 9)
    assert.equal(worldReceipt.supplyAfter, 8)

    const worldAfter = await loadWorldState(backend.baseUrl)
    const tileStates = (worldAfter.map as unknown as { tileStates?: Array<{ id: string; owner?: string; enemyPressure?: number }> }).tileStates ?? []
    const occupiedTileState = tileStates.find((tile) => tile.id === seeded.tileId)
    assert.ok(occupiedTileState, 'occupied tile state should be returned in world summary')
    assert.equal(occupiedTileState.owner, FACTION_ID, 'tile_occupy should change tile owner')
    assert.equal(occupiedTileState.enemyPressure, 0, 'resource tile occupy should clear enemy pressure after guard victory')
    const factionAfter = worldAfter.factions[FACTION_ID]
    assert.ok(factionAfter, 'faction should exist after tile occupy')
    assert.equal(factionAfter.actionPoints, factionBefore.actionPoints - 1, 'tile_occupy should spend one action point')
    const captureReward = readObject(worldReceipt.captureReward)
    const captureRewardAmount = Number(readObject(captureReward.amount).min)
    assert.equal(factionAfter.food, factionBefore.food - 1 + captureRewardAmount, 'resource tile occupy should spend one food and add capture reward')
    const subjectAfterOccupy = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
      'GET',
      undefined,
      60_000,
    )
    assert.equal(subjectAfterOccupy.status, 200, `subject after tile_occupy failed: ${JSON.stringify(subjectAfterOccupy.data)}`)
    const subject = readObject(readObject(subjectAfterOccupy.data).subject)
    const recentBodyChanges = readObject(subject.recentBodyChanges)
    assert.equal(recentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
    const bodyChangeItems = readArray(recentBodyChanges.items).map((item) => readObject(item))
    const tileOccupyBodyChange = bodyChangeItems.find((item) => item.action === 'tile_occupy')
    assert.ok(tileOccupyBodyChange, 'tile_occupy hero growth receipt must become a subject body change')
    assert.equal(tileOccupyBodyChange.bodyNode, 'generals_and_troops')
    assert.equal(tileOccupyBodyChange.status, 'completed')
    assert.equal(tileOccupyBodyChange.unitId, seeded.unitId)
    assert.equal(tileOccupyBodyChange.targetTileId, seeded.tileId)
    assert.equal(tileOccupyBodyChange.heroId, worldReceipt.heroId)
    assert.equal(tileOccupyBodyChange.expGained, 20)
    assert.equal(tileOccupyBodyChange.previousLevel, 24)
    assert.equal(tileOccupyBodyChange.nextLevel, 25)
    assert.equal(tileOccupyBodyChange.previousExp, 90)
    assert.equal(tileOccupyBodyChange.nextExp, 10)
    assert.equal(tileOccupyBodyChange.strengthBefore, worldReceipt.strengthBefore)
    assert.equal(tileOccupyBodyChange.strengthAfter, worldReceipt.strengthAfter)
    assert.equal(tileOccupyBodyChange.supplyBefore, worldReceipt.supplyBefore)
    assert.equal(tileOccupyBodyChange.supplyAfter, worldReceipt.supplyAfter)
    assert.equal(tileOccupyBodyChange.nextSubjectFocus, 'troops')
    assert.equal(tileOccupyBodyChange.visibleToAi, true)
    assert.equal(tileOccupyBodyChange.governanceApprovedBeforeExecution, true)
    assert.equal(tileOccupyBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
    assert.equal(typeof tileOccupyBodyChange.governanceApprovedAt, 'string')
    assert.equal(tileOccupyBodyChange.executionReceiptAvailable, true)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptAvailable, true)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptTargetTileId, seeded.tileId)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptUnitId, seeded.unitId)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptHeroId, worldReceipt.heroId)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptExpGained, worldReceipt.expGained)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptPreviousExp, worldReceipt.previousExp)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptNextExp, worldReceipt.nextExp)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptStrengthBefore, worldReceipt.strengthBefore)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptStrengthAfter, worldReceipt.strengthAfter)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptSupplyBefore, worldReceipt.supplyBefore)
    assert.equal(tileOccupyBodyChange.executionWorldReceiptSupplyAfter, worldReceipt.supplyAfter)
    const recentHistoryAnchors = readObject(subject.recentHistoryAnchors)
    assert.equal(recentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
    const historyAnchorItems = readArray(recentHistoryAnchors.items).map((item) => readObject(item))
    const tileOccupyHistoryAnchor = historyAnchorItems.find((item) => (
      item.action === 'tile_occupy' &&
      item.bodyNode === 'generals_and_troops' &&
      item.proposalId === tileOccupyBodyChange.proposalId
    ))
    assert.ok(tileOccupyHistoryAnchor, 'tile_occupy body change must be linked to a subject history anchor')
    assert.equal(tileOccupyHistoryAnchor.status, 'completed')
    assert.equal(tileOccupyHistoryAnchor.unitId, seeded.unitId)
    assert.equal(tileOccupyHistoryAnchor.targetTileId, seeded.tileId)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptTargetTileId, seeded.tileId)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptUnitId, seeded.unitId)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptHeroId, worldReceipt.heroId)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptExpGained, worldReceipt.expGained)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptPreviousExp, worldReceipt.previousExp)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptNextExp, worldReceipt.nextExp)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptStrengthBefore, worldReceipt.strengthBefore)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptStrengthAfter, worldReceipt.strengthAfter)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptSupplyBefore, worldReceipt.supplyBefore)
    assert.equal(tileOccupyHistoryAnchor.executionWorldReceiptSupplyAfter, worldReceipt.supplyAfter)
    assert.equal(tileOccupyHistoryAnchor.nextSubjectFocus, 'troops')
    const tileOccupyHistorySourceRefs = readObject(tileOccupyHistoryAnchor.sourceRefs)
    assert.equal(tileOccupyHistorySourceRefs.visible, false)
    assert.equal(tileOccupyHistorySourceRefs.visibility, 'internal_link_only')
    assert.equal(tileOccupyHistorySourceRefs.proposalId, tileOccupyBodyChange.proposalId)

    await backend.stop()

    const pvpSeeded = seedWorldStateWithPvpTileOccupyTarget()
    const pvpBackend = await bootTileOccupyBackend(pvpSeeded.persistRoot)
    try {
      const { receipt: pvpReceipt } = await createApproveExecuteProposal(
        pvpBackend.baseUrl,
        'tile_occupy',
        {
          unitId: pvpSeeded.unitId,
          tileId: pvpSeeded.tileId,
        },
        'AI player PvP tile occupy shard success',
      )
      assertSuccessfulReceipt('tile_occupy', pvpReceipt, 'occupyTile')
      const pvpWorldReceipt = readObject(pvpReceipt.worldReceipt)
      assert.equal(pvpWorldReceipt.action, 'occupyTile')
      assert.equal(pvpWorldReceipt.unitId, pvpSeeded.unitId)
      assert.equal(pvpWorldReceipt.tileId, pvpSeeded.tileId)
      assert.equal(pvpWorldReceipt.previousOwner, ENEMY_FACTION_ID)
      assert.equal(pvpWorldReceipt.occupied, true)
      assert.equal(pvpWorldReceipt.strengthBefore, 900)
      assert.equal(typeof pvpWorldReceipt.strengthAfter, 'number')
      assert.ok(Number(pvpWorldReceipt.strengthAfter) < 900, 'PvP occupy should reduce attacker strength')
      assert.equal(pvpWorldReceipt.supplyBefore, 9)
      assert.equal(pvpWorldReceipt.supplyAfter, 8)

      const subjectAfterPvpOccupy = await requestJson(
        pvpBackend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(subjectAfterPvpOccupy.status, 200, `subject after PvP tile_occupy failed: ${JSON.stringify(subjectAfterPvpOccupy.data)}`)
      const pvpSubject = readObject(readObject(subjectAfterPvpOccupy.data).subject)
      const pvpRecentBodyChanges = readObject(pvpSubject.recentBodyChanges)
      assert.equal(pvpRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
      const pvpBodyChangeItems = readArray(pvpRecentBodyChanges.items).map((item) => readObject(item))
      const pvpTileOccupyBodyChange = pvpBodyChangeItems.find((item) => item.action === 'tile_occupy')
      assert.ok(pvpTileOccupyBodyChange, 'PvP tile_occupy troop delta receipt must become a subject body change')
      assert.equal(pvpTileOccupyBodyChange.bodyNode, 'generals_and_troops')
      assert.equal(pvpTileOccupyBodyChange.status, 'completed')
      assert.equal(pvpTileOccupyBodyChange.unitId, pvpSeeded.unitId)
      assert.equal(pvpTileOccupyBodyChange.targetTileId, pvpSeeded.tileId)
      assert.equal(pvpTileOccupyBodyChange.strengthBefore, pvpWorldReceipt.strengthBefore)
      assert.equal(pvpTileOccupyBodyChange.strengthAfter, pvpWorldReceipt.strengthAfter)
      assert.equal(pvpTileOccupyBodyChange.supplyBefore, pvpWorldReceipt.supplyBefore)
      assert.equal(pvpTileOccupyBodyChange.supplyAfter, pvpWorldReceipt.supplyAfter)
      assert.equal(pvpTileOccupyBodyChange.nextSubjectFocus, 'troops')
      assert.equal(pvpTileOccupyBodyChange.visibleToAi, true)
      assert.equal(pvpTileOccupyBodyChange.governanceApprovedBeforeExecution, true)
      assert.equal(pvpTileOccupyBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
      assert.equal(typeof pvpTileOccupyBodyChange.governanceApprovedAt, 'string')
      const pvpRecentHistoryAnchors = readObject(pvpSubject.recentHistoryAnchors)
      assert.equal(pvpRecentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
      const pvpHistoryAnchorItems = readArray(pvpRecentHistoryAnchors.items).map((item) => readObject(item))
      const pvpTileOccupyHistoryAnchor = pvpHistoryAnchorItems.find((item) => (
        item.action === 'tile_occupy' &&
        item.bodyNode === 'generals_and_troops' &&
        item.proposalId === pvpTileOccupyBodyChange.proposalId
      ))
      assert.ok(pvpTileOccupyHistoryAnchor, 'PvP tile_occupy troop delta must be linked to a subject history anchor')
      assert.equal(pvpTileOccupyHistoryAnchor.status, 'completed')
      assert.equal(pvpTileOccupyHistoryAnchor.unitId, pvpSeeded.unitId)
      assert.equal(pvpTileOccupyHistoryAnchor.targetTileId, pvpSeeded.tileId)
      assert.equal(pvpTileOccupyHistoryAnchor.nextSubjectFocus, 'troops')
    } finally {
      await pvpBackend.stop()
    }

    const pvpLossSeeded = seedWorldStateWithPvpTileOccupyLossTarget()
    const pvpLossBackend = await bootTileOccupyBackend(pvpLossSeeded.persistRoot)
    try {
      const { receipt: pvpLossReceipt } = await createApproveExecuteProposal(
        pvpLossBackend.baseUrl,
        'tile_occupy',
        {
          unitId: pvpLossSeeded.unitId,
          tileId: pvpLossSeeded.tileId,
        },
        'AI player PvP tile occupy shard occupied-false loss',
      )
      assert.equal(pvpLossReceipt.action, 'tile_occupy')
      assert.equal(pvpLossReceipt.ok, true, 'occupied:false PvP loss is a resolved world action, not an HTTP failure')
      assert.equal(pvpLossReceipt.worldAction, 'occupyTile')
      const pvpLossWorldReceipt = readObject(pvpLossReceipt.worldReceipt)
      assert.equal(pvpLossWorldReceipt.action, 'occupyTile')
      assert.equal(pvpLossWorldReceipt.unitId, pvpLossSeeded.unitId)
      assert.equal(pvpLossWorldReceipt.tileId, pvpLossSeeded.tileId)
      assert.equal(pvpLossWorldReceipt.previousOwner, ENEMY_FACTION_ID)
      assert.equal(pvpLossWorldReceipt.occupied, false)

      const subjectAfterPvpLoss = await requestJson(
        pvpLossBackend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(subjectAfterPvpLoss.status, 200, `subject after PvP loss tile_occupy failed: ${JSON.stringify(subjectAfterPvpLoss.data)}`)
      const pvpLossSubject = readObject(readObject(subjectAfterPvpLoss.data).subject)
      const pvpLossRecentBodyChanges = readObject(pvpLossSubject.recentBodyChanges)
      assert.equal(pvpLossRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
      const pvpLossBodyChangeItems = readArray(pvpLossRecentBodyChanges.items).map((item) => readObject(item))
      const pvpLossTileOccupyBodyChange = pvpLossBodyChangeItems.find((item) => item.proposalId === pvpLossReceipt.proposalId)
      assert.ok(pvpLossTileOccupyBodyChange, 'occupied:false tile_occupy receipt must become a subject body change')
      assert.equal(pvpLossTileOccupyBodyChange.bodyNode, 'land_level_and_expansion')
      assert.equal(pvpLossTileOccupyBodyChange.status, 'failed')
      assert.equal(pvpLossTileOccupyBodyChange.failureCode, 'tile_occupy_not_occupied')
      assert.equal(pvpLossTileOccupyBodyChange.unitId, pvpLossSeeded.unitId)
      assert.equal(pvpLossTileOccupyBodyChange.targetTileId, pvpLossSeeded.tileId)
      assert.equal(pvpLossTileOccupyBodyChange.recommendedRecoveryCommand, 'retry_or_select_alternate_land_target')
      assert.equal(pvpLossTileOccupyBodyChange.nextSubjectFocus, 'land')
      assert.equal(pvpLossTileOccupyBodyChange.visibleToAi, true)
      assert.equal(pvpLossTileOccupyBodyChange.executionReceiptAvailable, true)
      assert.equal(pvpLossTileOccupyBodyChange.executionWorldReceiptAvailable, true)
      assert.equal(pvpLossTileOccupyBodyChange.executionWorldReceiptAction, 'occupyTile')
      assert.equal(pvpLossTileOccupyBodyChange.executionWorldReceiptTargetTileId, pvpLossSeeded.tileId)
      assert.equal(pvpLossTileOccupyBodyChange.executionWorldReceiptOccupied, false)
      const pvpLossRecentHistoryAnchors = readObject(pvpLossSubject.recentHistoryAnchors)
      assert.equal(pvpLossRecentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
      const pvpLossHistoryAnchorItems = readArray(pvpLossRecentHistoryAnchors.items).map((item) => readObject(item))
      const pvpLossTileOccupyHistoryAnchor = pvpLossHistoryAnchorItems.find((item) => (
        item.action === 'tile_occupy' &&
        item.bodyNode === 'land_level_and_expansion' &&
        item.proposalId === pvpLossReceipt.proposalId
      ))
      assert.ok(pvpLossTileOccupyHistoryAnchor, 'occupied:false tile_occupy body change must be linked to a subject history anchor')
      assert.equal(pvpLossTileOccupyHistoryAnchor.status, 'failed')
      assert.equal(pvpLossTileOccupyHistoryAnchor.targetTileId, pvpLossSeeded.tileId)
      assert.equal(pvpLossTileOccupyHistoryAnchor.nextSubjectFocus, 'land')
      assert.equal(pvpLossTileOccupyHistoryAnchor.title, 'AI 行动受阻')
      assert.equal(pvpLossTileOccupyHistoryAnchor.resultLabel, '未完成')

      const pvpLossEvents = await requestJson(pvpLossBackend.baseUrl, '/api/events?limit=60', 'GET')
      assert.equal(pvpLossEvents.status, 200, `events route after occupied:false tile_occupy failed: ${JSON.stringify(pvpLossEvents.data)}`)
      const pvpLossEventItems = readArray(readObject(pvpLossEvents.data).items ?? readObject(pvpLossEvents.data).events)
        .map((item) => readObject(item))
      const pvpLossExecutionEvent = pvpLossEventItems.find((item) => (
        item.action === 'ai_player_execute_proposal' &&
        item.success === true &&
        readObject(item.metadata).proposalId === pvpLossReceipt.proposalId
      ))
      assert.ok(pvpLossExecutionEvent, 'occupied:false tile_occupy should still record an execute event for its receipt')
      const pvpLossExecutionMetadata = readObject(readObject(pvpLossExecutionEvent).metadata)
      assert.equal(pvpLossExecutionMetadata.playerHistoryCategory, 'ai_activity')
      assert.equal(pvpLossExecutionMetadata.playerHistoryTitle, 'AI 行动受阻')
      assert.equal(pvpLossExecutionMetadata.playerHistoryTarget, '占领目标地块')
      assert.equal(pvpLossExecutionMetadata.playerHistoryResultLabel, '未完成')
      assert.equal(pvpLossExecutionMetadata.playerHistoryNextAction, '重新下令')
      assert.equal(pvpLossExecutionMetadata.playerHistorySeverity, 'high')
      assert.equal(pvpLossExecutionMetadata.playerHistoryScope, 'private_ai')
      assert.equal(pvpLossExecutionMetadata.playerHistoryReceiptState, 'failed')
      assert.equal(pvpLossExecutionMetadata.playerHistoryFailureCode, 'world_result_not_achieved')

      const pvpLossSession = await requestJson(pvpLossBackend.baseUrl, '/api/session/join', 'POST', {
        factionId: FACTION_ID,
        playerName: GOVERNOR_PLAYER_ID,
      })
      assert.equal(pvpLossSession.status, 200, `occupied:false tile_occupy session join failed: ${JSON.stringify(pvpLossSession.data)}`)
      const pvpLossSessionToken = String(readObject(pvpLossSession.data).token ?? '')
      assert.ok(pvpLossSessionToken.length > 0, 'occupied:false tile_occupy session join should return bearer token')
      const pvpLossHistory = await requestJsonWithBearer(
        pvpLossBackend.baseUrl,
        '/api/player-history?limit=20&eventLimit=60&civilMemoryLimit=5',
        pvpLossSessionToken,
        60_000,
      )
      assert.equal(pvpLossHistory.status, 200, `player-history after occupied:false tile_occupy failed: ${JSON.stringify(pvpLossHistory.data)}`)
      const pvpLossTimeline = readObject(readObject(pvpLossHistory.data).timeline)
      const pvpLossCards = readArray(pvpLossTimeline.cards).map((item) => readObject(item))
      const pvpLossAiCard = pvpLossCards.find((card) => (
        card.category === 'ai_activity' &&
        card.title === 'AI 行动受阻' &&
        card.targetLabel === '占领目标地块' &&
        card.resultLabel === '未完成'
      ))
      assert.ok(pvpLossAiCard, 'occupied:false tile_occupy should become a private failed AI activity card')
      assert.equal(pvpLossAiCard.locationLabel, 'AI 活动')
      assert.equal(pvpLossAiCard.nextActionLabel, '重新下令')
      assert.equal(pvpLossAiCard.sharePolicy, undefined, 'private occupied:false tile_occupy cards should not become shareable')
      assert.equal(pvpLossAiCard.shareStateLabel, '暂不可分享')
      const pvpLossVisiblePayload = visibleCardText(pvpLossAiCard)
      for (const required of ['AI 行动受阻', 'AI 活动', '占领目标地块', '未完成', '重新下令']) {
        assert.ok(pvpLossVisiblePayload.includes(required), `occupied:false tile_occupy visible copy should include ${required}`)
      }
      for (const forbidden of ['tile_occupy', 'worldReceipt', 'occupied', 'proposalId', 'metadata', 'backend', 'debug']) {
        assert.equal(
          pvpLossVisiblePayload.includes(forbidden),
          false,
          `occupied:false tile_occupy visible copy leaked implementation term: ${forbidden}`,
        )
      }
    } finally {
      await pvpLossBackend.stop()
    }

    const immuneSeeded = seedWorldStateWithImmuneTileOccupyTarget()
    const immuneBackend = await bootTileOccupyBackend(immuneSeeded.persistRoot)
    try {
      const create = await requestJson(immuneBackend.baseUrl, '/api/ai/players/proposals', 'POST', {
        aiPlayerId: AI_PLAYER_ID,
        action: 'tile_occupy',
        source: 'mcp',
        reason: 'immune main map cell should produce a player-readable failure receipt',
        args: {
          unitId: immuneSeeded.unitId,
          tileId: immuneSeeded.tileId,
        },
      })
      assert.equal(create.status, 200, `create immune tile_occupy proposal failed: ${JSON.stringify(create.data)}`)
      const proposal = readObject(readObject(create.data).proposal)
      const proposalId = String(proposal.proposalId)
      const approve = await requestJson(immuneBackend.baseUrl, `/api/ai/players/proposals/${proposalId}/approve`, 'POST', {
        approvedBy: GOVERNOR_PLAYER_ID,
      })
      assert.equal(approve.status, 200, `approve immune tile_occupy proposal failed: ${JSON.stringify(approve.data)}`)
      const execute = await requestJson(immuneBackend.baseUrl, `/api/ai/players/proposals/${proposalId}/execute`, 'POST', {
        executedBy: GOVERNOR_PLAYER_ID,
        includeWorld: false,
      }, 60_000)
      assert.equal(execute.status, 200, `execute immune tile_occupy proposal failed: ${JSON.stringify(execute.data)}`)
      const executePayload = readObject(execute.data)
      const blockedReceipt = readObject(executePayload.receipt)
      assert.equal(blockedReceipt.ok, false)
      assert.equal(blockedReceipt.failureCode, 'main_map_cell_immunity_active')
      assert.equal(blockedReceipt.worldAction, 'occupyTile')
      const recoveryHint = readObject(blockedReceipt.recoveryHint)
      assert.equal(recoveryHint.focus, 'cooldown')
      assert.match(String(recoveryHint.summary), /免战保护/)
      const blockedChatMessage = readObject(executePayload.chatMessage)
      assert.equal(blockedChatMessage.kind, 'receipt')
      assert.equal(blockedChatMessage.receiptOk, false)
      assert.equal(blockedChatMessage.failureCode, 'main_map_cell_immunity_active')
      assert.match(String(blockedChatMessage.body), /免战保护中，暂不能占领/)
      assert.doesNotMatch(String(blockedChatMessage.body), /main_map_cell_immunity_active/)
      const blockedChatMetadata = readObject(blockedChatMessage.metadata)
      assert.equal('worldActionPayload' in blockedChatMetadata, false, 'failed receipt chat metadata must not expose action payload')
      const subjectAfterBlockedOccupy = await requestJson(
        immuneBackend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
        'GET',
        undefined,
        60_000,
      )
      assert.equal(subjectAfterBlockedOccupy.status, 200, `subject after blocked tile_occupy failed: ${JSON.stringify(subjectAfterBlockedOccupy.data)}`)
      const blockedSubject = readObject(readObject(subjectAfterBlockedOccupy.data).subject)
      const blockedRecentBodyChanges = readObject(blockedSubject.recentBodyChanges)
      assert.equal(blockedRecentBodyChanges.contractId, 'ai_player_subject_recent_body_changes_v1')
      const blockedBodyChangeItems = readArray(blockedRecentBodyChanges.items).map((item) => readObject(item))
      const blockedTileOccupyBodyChange = blockedBodyChangeItems.find((item) => (
        item.action === 'tile_occupy' &&
        item.proposalId === proposalId
      ))
      assert.ok(blockedTileOccupyBodyChange, 'blocked tile_occupy receipt must become a subject body change')
      assert.equal(blockedTileOccupyBodyChange.bodyNode, 'land_level_and_expansion')
      assert.equal(blockedTileOccupyBodyChange.status, 'failed')
      assert.equal(blockedTileOccupyBodyChange.unitId, immuneSeeded.unitId)
      assert.equal(blockedTileOccupyBodyChange.targetTileId, immuneSeeded.tileId)
      assert.equal(blockedTileOccupyBodyChange.recommendedRecoveryCommand, 'retry_or_select_alternate_land_target')
      assert.equal(blockedTileOccupyBodyChange.nextSubjectFocus, 'land')
      assert.equal(blockedTileOccupyBodyChange.visibleToAi, true)
      assert.equal(blockedTileOccupyBodyChange.governanceApprovedBeforeExecution, true)
      assert.equal(blockedTileOccupyBodyChange.governanceApprovedBy, GOVERNOR_PLAYER_ID)
      assert.equal(typeof blockedTileOccupyBodyChange.governanceApprovedAt, 'string')
      assert.equal(blockedTileOccupyBodyChange.executionReceiptAvailable, true)
      assert.equal(blockedTileOccupyBodyChange.executionWorldReceiptAvailable, false)
      assert.equal(blockedTileOccupyBodyChange.executionWorldReceiptTargetTileId, undefined)
      assert.equal(blockedTileOccupyBodyChange.executionFailureCode, 'main_map_cell_immunity_active')
      assert.equal(blockedTileOccupyBodyChange.executionRecoveryFocus, 'cooldown')
      assert.match(String(blockedTileOccupyBodyChange.executionRecoverySummary), /免战保护/)
      assert.equal(blockedTileOccupyBodyChange.executionRecoveryRecommendedCommand, '免战结束后，再让部队占领这个目标地块。')
      const blockedRecentHistoryAnchors = readObject(blockedSubject.recentHistoryAnchors)
      assert.equal(blockedRecentHistoryAnchors.contractId, 'ai_player_subject_history_anchors_v1')
      const blockedHistoryAnchorItems = readArray(blockedRecentHistoryAnchors.items).map((item) => readObject(item))
      const blockedTileOccupyHistoryAnchor = blockedHistoryAnchorItems.find((item) => (
        item.action === 'tile_occupy' &&
        item.bodyNode === 'land_level_and_expansion' &&
        item.proposalId === proposalId
      ))
      assert.ok(blockedTileOccupyHistoryAnchor, 'blocked tile_occupy body change must be linked to a subject history anchor')
      assert.equal(blockedTileOccupyHistoryAnchor.status, 'failed')
      assert.equal(blockedTileOccupyHistoryAnchor.targetTileId, immuneSeeded.tileId)
      assert.equal(blockedTileOccupyHistoryAnchor.nextSubjectFocus, 'land')
    } finally {
      await immuneBackend.stop()
    }

    console.log('[ai_player_http_tile_occupy_contract] all checks passed')
  } finally {
    await backend.stop().catch(() => undefined)
  }
}

run().catch((error) => {
  console.error('[ai_player_http_tile_occupy_contract] failed:', error)
  process.exitCode = 1
})
