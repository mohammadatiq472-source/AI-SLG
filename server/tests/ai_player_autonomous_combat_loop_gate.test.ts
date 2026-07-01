import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'
import WebSocket from 'ws'
import { createInitialWorldState } from '../../shared/domain/scenario'
import type { Unit } from '../../shared/contracts/game/world'
import {
  AI_PLAYER_ID,
  FACTION_ID,
  GOVERNOR_PLAYER_ID,
  createApproveExecuteProposal,
  ensureFactionBudget,
  joinGovernor,
  loadWorldState,
  startAiPlayerHttpBackend,
} from './helpers/aiPlayerHttpContractHarness'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  sleep,
} from './helpers/backendHarness'
import { listStaticAiPlayerActionCatalog } from '../src/application/ai/aiPlayerActionCatalog'

const ENEMY_FACTION_ID = 'enemy'
const RENAMED_REPORT_DISPLAY_NAME = '青州后勤官'

async function startCombatNarrativeRelayProbe() {
  const port = await getAvailablePort()
  const requestBodies: string[] = []
  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf-8')
      requestBodies.push(rawBody)
      let eventType = ''
      try {
        const requestBody = readObject(JSON.parse(rawBody))
        const messages = readArray(requestBody.messages).map((item) => readObject(item))
        const userMessage = messages.find((message) => String(message.role) === 'user')
        eventType = String(readObject(JSON.parse(String(userMessage?.content ?? '{}'))).eventType ?? '')
      } catch {
        eventType = ''
      }
      const content = eventType.includes('攻城')
        ? '青州后勤官回报：主公，攻城已经结束，城防和耐久变化都进了战报；目标城还没有松口，我会继续压住。'
        : eventType.includes('来袭')
          ? '青州后勤官回报：主公，敌军又来袭了，我已把他们常打的前线和时间线记进敌军档案，先稳城防。'
          : eventType.includes('驻防')
            ? '青州后勤官回报：主公，驻防结果已经结算，战损我会继续盯着；下一步先补强城防，再找反击窗口。'
            : eventType.includes('战情')
              ? '青州后勤官战情汇报：主公，战情室已刷新，权限隔离正常；驻防、战损和反制建议我会继续按敌军档案复盘。'
              : '青州后勤官低声回报：主公，东线已经接上，西线我会先稳住；我不会把没结算的集结说成结果，今天先守住人心和城防。'
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: 'combat-narrative-mock',
        choices: [{
          message: {
            content,
          },
        }],
        usage: { prompt_tokens: 11, completion_tokens: 19, total_tokens: 30 },
      }))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requestBodies,
    stop: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    }),
  }
}

async function startUnsafeCombatNarrativeRelayProbe() {
  const port = await getAvailablePort()
  const requestBodies: string[] = []
  const server = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      requestBodies.push(Buffer.concat(chunks).toString('utf-8'))
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({
        model: 'unsafe-combat-narrative-mock',
        choices: [{
          message: {
            content: '{"regionId":"east_expansion","stateKind":"ai_rally_campaign_state","proposalId":"leak"}',
          },
        }],
      }))
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => resolve())
  })
  return {
    baseUrl: `http://127.0.0.1:${port}/v1`,
    requestBodies,
    stop: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    }),
  }
}

function cloneCombatDefenderFrom(attacker: Unit, tileId: string): Unit {
  const defender: Unit = structuredClone(attacker)
  defender.id = 'ai_autonomous_combat_defender'
  defender.name = '自主战斗守军'
  defender.faction = ENEMY_FACTION_ID
  defender.aiPlayerId = undefined
  defender.tileId = tileId
  defender.status = '驻防中'
  defender.currentTask = 'Guard autonomous combat gate tile'
  defender.strength = 35
  defender.supply = 4
  defender.mobility = 8
  defender.hero = {
    ...defender.hero,
    id: 'hero_ai_autonomous_combat_defender',
    name: '守军校尉',
    force: 42,
    command: 40,
    intelligence: 38,
    charisma: 36,
    speed: 35,
  }
  defender.corps = {
    ...defender.corps,
    name: '守军小队',
    readiness: 75,
  }
  return defender
}

function seedAutonomousCombatWorld(): { path: string; unitId: string; targetTileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction, `missing faction ${FACTION_ID} while seeding autonomous combat gate`)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit, `missing unit for faction ${FACTION_ID} while seeding autonomous combat gate`)
  const targetTile = world.map.tiles.find((tile) => tile.type === 'plain')
    ?? world.map.tiles.find((tile) => tile.type !== 'city' && tile.type !== 'fog')
    ?? world.map.tiles[0]
  assert.ok(targetTile, 'missing target tile while seeding autonomous combat gate')

  targetTile.type = 'plain'
  targetTile.terrain = 'grassland'
  targetTile.owner = ENEMY_FACTION_ID
  targetTile.enemyPressure = 4
  targetTile.moveCost = 1
  targetTile.name = '自主战斗前哨'

  unit.aiPlayerId = AI_PLAYER_ID
  unit.tileId = targetTile.id
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 46
  unit.supply = 2
  unit.mobility = Math.max(unit.mobility, 20)
  unit.hero.force = 96
  unit.hero.command = 92
  unit.hero.intelligence = 88
  unit.hero.speed = 80
  unit.corps.readiness = 100

  faction.actionPoints = 100
  faction.food = 100
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'assault',
  }]

  world.units = world.units.filter((candidate) => candidate.id === unit.id || candidate.tileId !== targetTile.id)
  world.units.push(cloneCombatDefenderFrom(unit, targetTile.id))
  world.feedback.battleRecords = [{
    id: 'ai_autonomous_combat_loss_seed',
    tick: world.tick + 1,
    regionId: 'autonomous_combat_gate',
    tileId: targetTile.id,
    attackerFaction: FACTION_ID,
    attackerUnitId: unit.id,
    outcome: 'loss',
    attackerLoss: 72,
    defenderLoss: 18,
    alliedSupport: 0,
    summary: 'AI 先锋刚在前哨吃亏，需要先整补再打。',
  }]

  const path = buildSessionPersistPath('ai_player_autonomous_combat_loop_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, unitId: unit.id, targetTileId: targetTile.id }
}

async function runCombatStep(
  baseUrl: string,
): Promise<Record<string, unknown>> {
  const run = await requestJson(baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`, 'POST', {
    maxSteps: 1,
    limit: 4,
  })
  assert.equal(run.status, 200, `autonomous combat run failed: ${JSON.stringify(run.data)}`)
  const steps = readArray(readObject(readObject(run.data).run).steps).map((item) => readObject(item))
  const step = readObject(steps[0])
  const receipt = readObject(step.receipt)
  assert.equal(receipt.ok, true, `${String(step.selectedAction)} receipt should be ok; steps=${JSON.stringify(steps.map((candidate) => ({ selectedAction: candidate.selectedAction, receipt: candidate.receipt })))}`)
  return step
}

async function assertCombatReportsPersisted(baseUrl: string, expectedAction: string, label: string) {
  const personalReportsResponse = await requestJson(
    baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/personal-reports?limit=20`,
    'GET',
  )
  assert.equal(
    personalReportsResponse.status,
    200,
    `${label} combat personal reports route failed: ${JSON.stringify(personalReportsResponse.data)}`,
  )
  const personalReports = readArray(readObject(personalReportsResponse.data).items).map((item) => readObject(item))
  assert.ok(personalReports.length >= 1, `${label} should write a backend combat personal report`)
  const latestReport = personalReports[0]
  assert.equal(latestReport.category, 'combat')
  assert.equal(latestReport.action, expectedAction)
  assert.match(String(latestReport.summary), /整补|预备队|驻防|侦察|占领|推进|战斗|目标/)
  assert.doesNotMatch(JSON.stringify(latestReport), /proposalId|worldAction|MCP|tool|approve|execute|JSON/)

  const playerReportsResponse = await requestJson(
    baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/player-reports?limit=20`,
    'GET',
  )
  assert.equal(
    playerReportsResponse.status,
    200,
    `${label} combat player reports route failed: ${JSON.stringify(playerReportsResponse.data)}`,
  )
  const playerReports = readArray(readObject(playerReportsResponse.data).items).map((item) => readObject(item))
  assert.ok(
    playerReports.some((report) => report.itemKind === 'ai_autonomous_combat' && report.action === expectedAction),
    `${label} player report list should include backend combat report`,
  )
}

async function assertAutonomousGarrisonSubjectBodyChange(params: {
  baseUrl: string
  unitId: string
  targetTileId: string
}) {
  const subjectResult = await requestJson(
    params.baseUrl,
    `/api/ai/players/${AI_PLAYER_ID}/subject?governorPlayerId=${GOVERNOR_PLAYER_ID}`,
    'GET',
    undefined,
    60_000,
  )
  assert.equal(subjectResult.status, 200, `subject after autonomous garrison failed: ${JSON.stringify(subjectResult.data)}`)
  const subject = readObject(readObject(subjectResult.data).subject)
  const bodyChangeItems = readArray(readObject(subject.recentBodyChanges).items).map((item) => readObject(item))
  const garrisonBodyChange = bodyChangeItems.find((item) => (
    item.action === 'garrison_set' &&
    item.bodyNode === 'war_and_relations' &&
    item.unitId === params.unitId &&
    item.targetTileId === params.targetTileId
  ))
  assert.ok(garrisonBodyChange, 'autonomous garrison_set receipt must become a subject war body change')
  assert.equal(garrisonBodyChange.status, 'completed')
  assert.equal(garrisonBodyChange.nextSubjectFocus, 'war')
  assert.equal(garrisonBodyChange.visibleToAi, true)
  assert.equal(garrisonBodyChange.governanceApprovedBeforeExecution, true)
  assert.equal(garrisonBodyChange.executionReceiptAvailable, true)
  assert.equal(garrisonBodyChange.executionWorldAction, 'queueTacticalOverride')
  assert.equal(garrisonBodyChange.executionFailureCode, null)
  assert.equal(garrisonBodyChange.historyAnchorAvailable, true)
  assert.equal(garrisonBodyChange.historyAnchorSourceVisibility, 'internal_link_only')
  assert.ok(String(garrisonBodyChange.historyAnchorWorldEventId ?? '').length > 0)
}

async function bootCombatBackend(path: string, actionWhitelist: string[], envOverrides: NodeJS.ProcessEnv = {}) {
  const backend = await startAiPlayerHttpBackend(
    'ai_player_autonomous_combat_loop_gate',
    undefined,
    {
      WORLD_STATE_PERSIST_PATH: path,
      ...envOverrides,
    },
  )
  await joinGovernor(backend.baseUrl)
  const register = await requestJson(backend.baseUrl, '/api/ai/players', 'POST', {
    aiPlayerId: AI_PLAYER_ID,
    displayName: 'Player Operator Alpha',
    governorPlayerId: GOVERNOR_PLAYER_ID,
    factionId: FACTION_ID,
    actionWhitelist,
    runtimePolicy: {
      allowAutonomousCombatDailySummaryChatReports: true,
      allowAutonomousCombatWarEventChatReports: true,
      allowAutonomousCombatVoiceReports: false,
    },
  })
  assert.equal(register.status, 200, `register combat AI player failed: ${JSON.stringify(register.data)}`)
  return backend
}

function waitForWsMessage(
  socket: WebSocket,
  predicate: (payload: Record<string, unknown>) => boolean,
  timeoutMs = 15_000,
) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const seenMessages: string[] = []
    const timer = setTimeout(() => {
      socket.off('message', handleMessage)
      reject(new Error(`websocket message timeout; seen=${seenMessages.join(' | ') || 'none'}`))
    }, timeoutMs)
    const handleMessage = (raw: WebSocket.RawData) => {
      let payload: Record<string, unknown>
      try {
        const text = Buffer.isBuffer(raw)
          ? raw.toString('utf-8')
          : Array.isArray(raw)
            ? Buffer.concat(raw).toString('utf-8')
            : raw instanceof ArrayBuffer
              ? Buffer.from(raw).toString('utf-8')
              : Buffer.from((raw as ArrayBufferView).buffer, (raw as ArrayBufferView).byteOffset, (raw as ArrayBufferView).byteLength).toString('utf-8')
        payload = readObject(JSON.parse(text))
      } catch {
        return
      }
      if (!predicate(payload)) {
        seenMessages.push(`${String(payload.type ?? 'missing_type')}:${String(payload.message ?? payload.playerFacingSummary ?? '')}`)
        return
      }
      clearTimeout(timer)
      socket.off('message', handleMessage)
      resolve(payload)
    }
    socket.on('message', handleMessage)
  })
}

async function openSubscribedWarRoomSocket(baseUrl: string, factionId = FACTION_ID) {
  const session = await requestJson(baseUrl, '/api/session/join', 'POST', {
    factionId,
    playerName: `${GOVERNOR_PLAYER_ID}_${factionId}_war_room_ws`,
  })
  assert.equal(session.status, 200, `war-room websocket session join failed: ${JSON.stringify(session.data)}`)
  const token = String(readObject(session.data).token ?? '').trim()
  assert.ok(token, 'war-room websocket session should return a token')
  const url = new URL(baseUrl)
  const socket = new WebSocket(`ws://127.0.0.1:${url.port}/ws`)
  await new Promise<void>((resolve, reject) => {
    socket.once('open', () => resolve())
    socket.once('error', reject)
  })
  const subscribed = waitForWsMessage(socket, (payload) => (
    payload.type === 'subscribed'
    && payload.factionId === factionId
  ))
  socket.send(JSON.stringify({ type: 'subscribe', factionId, token }))
  await subscribed
  return socket
}

async function waitForNoWsMessage(
  socket: WebSocket,
  predicate: (payload: Record<string, unknown>) => boolean,
  timeoutMs = 700,
) {
  try {
    const message = await waitForWsMessage(socket, predicate, timeoutMs)
    assert.fail(`unexpected websocket message: ${JSON.stringify(message)}`)
  } catch (error) {
    assert.match(String(error instanceof Error ? error.message : error), /websocket message timeout/)
  }
}

async function runLossRecoveryScenario() {
  const seeded = seedAutonomousCombatWorld()
  const backend = await bootCombatBackend(
    seeded.path,
    ['battle_report_read', 'troop_heal', 'troop_train', 'tile_occupy', 'march_move', 'garrison_set', 'world_scout'],
  )
  try {
    const worldBefore = await loadWorldState(backend.baseUrl)
    const initialAiUnit = worldBefore.units.find((unit) => unit.id === seeded.unitId)
    assert.ok(initialAiUnit, 'seeded autonomous combat unit should exist before observation')
    assert.equal(initialAiUnit.strength, 46)
    assert.equal(initialAiUnit.supply, 2)
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=4`,
      'GET',
    )
    assert.equal(observationResponse.status, 200, `combat observation route failed: ${JSON.stringify(observationResponse.data)}`)
    const observation = readObject(readObject(observationResponse.data).observation)
    assert.equal(observation.aiPlayerId, AI_PLAYER_ID)
    assert.equal(observation.factionId, FACTION_ID)
    assert.equal(readArray(observation.ownUnits).length, 1)
    assert.equal(readObject(readArray(observation.battleReports)[0]).reportId, 'ai_autonomous_combat_loss_seed')
    assert.equal(readObject(readArray(observation.battleReports)[0]).outcome, 'loss')
    const initialRecommendedAction = readObject(readArray(observation.recommendedActions)[0])
    assert.equal(initialRecommendedAction.action, 'troop_heal')
    assert.equal(readObject(initialRecommendedAction.args).unitId, seeded.unitId)
    const enemyTarget = readObject(readArray(observation.enemyTargets)[0])
    assert.equal(enemyTarget.tileId, seeded.targetTileId)
    assert.equal(enemyTarget.owner, ENEMY_FACTION_ID)
    assert.equal(enemyTarget.canOccupyNow, false)
    assert.match(String(readObject(readArray(observation.recommendedActions)[0]).playerFacingReason), /整补|补给/)

    const worldAfterObservation = await loadWorldState(backend.baseUrl)
    assert.deepEqual(worldAfterObservation.feedback.battleRecords, worldBefore.feedback.battleRecords)
    assert.equal(worldAfterObservation.worldVersion, worldBefore.worldVersion, 'combat observation must not mutate world')
    const aiUnitAfterObservation = worldAfterObservation.units.find((unit) => unit.id === seeded.unitId)
    assert.ok(aiUnitAfterObservation, 'seeded autonomous combat unit should exist after observation')
    assert.equal(aiUnitAfterObservation.strength, 46)
    assert.equal(aiUnitAfterObservation.supply, 2)

    let healedObservation = observation
    let healCount = 0
    let occupyStep: Record<string, unknown> | null = null
    let trainCount = 0
    for (; healCount < 6; healCount += 1) {
      const firstRecommendedAction = readObject(readArray(healedObservation.recommendedActions)[0])
      if (
        firstRecommendedAction.action !== 'troop_heal'
        && firstRecommendedAction.action !== 'troop_train'
        && firstRecommendedAction.action !== 'tile_occupy'
      ) {
        break
      }
      const recoveryStep = await runCombatStep(backend.baseUrl)
      if (recoveryStep.selectedAction === 'tile_occupy') {
        occupyStep = recoveryStep
        break
      }
      assert.ok(
        recoveryStep.selectedAction === 'troop_heal' || recoveryStep.selectedAction === 'troop_train',
        `unexpected recovery action: ${String(recoveryStep.selectedAction)}`,
      )
      const recoveryReceipt = readObject(recoveryStep.receipt)
      if (recoveryStep.selectedAction === 'troop_heal') {
        assert.equal(recoveryReceipt.worldAction, 'healTroop')
      } else {
        trainCount += 1
        assert.equal(recoveryReceipt.worldAction, 'deployReserveHero')
      }
      const healedObservationResponse = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=4`,
        'GET',
      )
      assert.equal(healedObservationResponse.status, 200)
      healedObservation = readObject(readObject(healedObservationResponse.data).observation)
    }
    assert.ok(healCount >= 1, 'combat loop should heal at least once after the seeded loss')
    assert.ok(trainCount >= 1, 'combat loop should train once after the seeded high-loss battle report')
    if (!occupyStep) {
      assert.equal(readObject(readArray(healedObservation.recommendedActions)[0]).action, 'tile_occupy')
      assert.equal(readObject(readArray(healedObservation.enemyTargets)[0]).canOccupyNow, true)
      occupyStep = await runCombatStep(backend.baseUrl)
    }
    assert.equal(occupyStep.selectedAction, 'tile_occupy')
    const occupyReceipt = readObject(occupyStep.receipt)
    assert.equal(occupyReceipt.worldAction, 'occupyTile')
    await assertCombatReportsPersisted(backend.baseUrl, 'tile_occupy', 'loss recovery')

    const worldAfterCombat = await loadWorldState(backend.baseUrl)
    const tileStates = (worldAfterCombat.map as unknown as { tileStates?: Array<{ id: string; owner?: string }> }).tileStates ?? []
    const targetOwner = tileStates.find((tile) => tile.id === seeded.targetTileId)?.owner
      ?? worldAfterCombat.map.tiles.find((tile) => tile.id === seeded.targetTileId)?.owner
    assert.equal(targetOwner, FACTION_ID)
    assert.ok(worldAfterCombat.feedback.battleRecords.some((record) => (
      record.tileId === seeded.targetTileId
      && record.attackerUnitId === seeded.unitId
      && record.reportKind === 'field_battle'
    )), 'autonomous combat loop should leave a field battle report')

    console.log('[ai_player_autonomous_combat_loop_gate] all checks passed')
  } finally {
    await backend.stop()
  }
}

function seedScoutWorld(): { path: string; targetTileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit)
  const targetTileId = world.map.connections[unit.tileId]?.[0] ?? 'grid_1_0'
  const targetTile = world.map.tiles.find((tile) => tile.id === targetTileId)
  assert.ok(targetTile)
  unit.aiPlayerId = AI_PLAYER_ID
  unit.strength = 100
  unit.supply = 9
  unit.status = '待命'
  unit.currentTask = undefined
  targetTile.owner = ENEMY_FACTION_ID
  targetTile.enemyPressure = 6
  targetTile.type = 'plain'
  faction.actionPoints = 100
  faction.food = 100
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'assault',
  }]
  world.feedback.battleRecords = []
  const path = buildSessionPersistPath('ai_player_autonomous_combat_scout_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, targetTileId }
}

function seedGarrisonWorld(): { path: string; tileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit)
  const tile = world.map.tiles.find((candidate) => candidate.id === unit.tileId)
  assert.ok(tile)
  unit.aiPlayerId = AI_PLAYER_ID
  unit.strength = 100
  unit.supply = 9
  unit.status = '待命'
  unit.currentTask = undefined
  tile.owner = FACTION_ID
  tile.enemyPressure = 5
  faction.actionPoints = 100
  faction.food = 100
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'guard',
  }]
  world.feedback.battleRecords = []
  const path = buildSessionPersistPath('ai_player_autonomous_combat_garrison_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, tileId: tile.id }
}

function seedInvalidTargetRecoveryWorld(): { path: string; failedTileId: string; alternateTileId: string } {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction)
  const unit = world.units.find((candidate) => candidate.faction === FACTION_ID)
  assert.ok(unit)
  const failedTile = world.map.tiles.find((tile) => tile.id === unit.tileId)
  assert.ok(failedTile)
  const alternateTileId = world.map.connections[unit.tileId]?.find((tileId) => tileId !== failedTile.id)
    ?? world.map.connections[unit.tileId]?.[0]
    ?? 'grid_1_0'
  const alternateTile = world.map.tiles.find((tile) => tile.id === alternateTileId)
  assert.ok(alternateTile)

  unit.aiPlayerId = AI_PLAYER_ID
  unit.status = '待命'
  unit.currentTask = undefined
  unit.strength = 100
  unit.supply = 9
  failedTile.owner = ENEMY_FACTION_ID
  failedTile.enemyPressure = 2
  failedTile.type = 'plain'
  alternateTile.owner = ENEMY_FACTION_ID
  alternateTile.enemyPressure = 1
  alternateTile.type = 'plain'
  faction.actionPoints = 0
  faction.food = 0
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [unit.id],
    specialty: 'assault',
  }]
  world.feedback.battleRecords = []
  const path = buildSessionPersistPath('ai_player_autonomous_combat_invalid_target_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return { path, failedTileId: failedTile.id, alternateTileId }
}

function seedMultiUnitPressureWorld(): {
  path: string
  garrisonUnitId: string
  occupyUnitId: string
  ownThreatTileId: string
  occupyTargetTileId: string
  scoutTargetTileId: string
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction)
  const garrisonUnit = world.units.find((candidate) => candidate.faction === FACTION_ID && candidate.id === 'u3')
    ?? world.units.find((candidate) => candidate.faction === FACTION_ID)
  const occupyUnit = world.units.find((candidate) => candidate.faction === FACTION_ID && candidate.id !== garrisonUnit?.id)
  assert.ok(garrisonUnit)
  assert.ok(occupyUnit)
  const ownThreatTile = world.map.tiles.find((tile) => tile.id === garrisonUnit.tileId)
  const occupyTargetTile = world.map.tiles.find((tile) => tile.id === occupyUnit.tileId)
  const scoutTargetTileId = world.map.connections[occupyUnit.tileId]?.find((tileId) => tileId !== garrisonUnit.tileId)
    ?? world.map.connections[occupyUnit.tileId]?.[0]
  assert.ok(ownThreatTile)
  assert.ok(occupyTargetTile)
  assert.ok(scoutTargetTileId)
  const scoutTargetTile = world.map.tiles.find((tile) => tile.id === scoutTargetTileId)
  assert.ok(scoutTargetTile)

  garrisonUnit.aiPlayerId = AI_PLAYER_ID
  garrisonUnit.status = '待命'
  garrisonUnit.currentTask = undefined
  garrisonUnit.strength = 95
  garrisonUnit.supply = 8
  ownThreatTile.owner = FACTION_ID
  ownThreatTile.enemyPressure = 5

  occupyUnit.aiPlayerId = AI_PLAYER_ID
  occupyUnit.status = '待命'
  occupyUnit.currentTask = undefined
  occupyUnit.strength = 90
  occupyUnit.supply = 7
  occupyTargetTile.owner = ENEMY_FACTION_ID
  occupyTargetTile.type = 'plain'
  occupyTargetTile.enemyPressure = 1
  occupyTargetTile.name = '多队伍低压敌营'

  scoutTargetTile.owner = ENEMY_FACTION_ID
  scoutTargetTile.type = 'plain'
  scoutTargetTile.enemyPressure = 7
  scoutTargetTile.name = '多目标高压前哨'

  world.units = world.units.filter((unit) => (
    unit.id === garrisonUnit.id
    || unit.id === occupyUnit.id
    || unit.faction !== ENEMY_FACTION_ID
  ))
  world.units.push(cloneCombatDefenderFrom(occupyUnit, occupyTargetTile.id))

  faction.actionPoints = 100
  faction.food = 100
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: [garrisonUnit.id, occupyUnit.id],
    specialty: 'assault',
  }]
  world.feedback.battleRecords = []

  const path = buildSessionPersistPath('ai_player_autonomous_combat_multi_unit_pressure_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    garrisonUnitId: garrisonUnit.id,
    occupyUnitId: occupyUnit.id,
    ownThreatTileId: ownThreatTile.id,
    occupyTargetTileId: occupyTargetTile.id,
    scoutTargetTileId,
  }
}

async function runScoutScenario() {
  const seeded = seedScoutWorld()
  const backend = await bootCombatBackend(seeded.path, ['world_scout', 'march_move', 'garrison_set'])
  try {
    const step = await runCombatStep(backend.baseUrl)
    assert.equal(step.selectedAction, 'world_scout')
    const receipt = readObject(step.receipt)
    assert.equal(receipt.worldAction, 'queuePlanExecution')
    assert.match(String(readObject(step.plannerDecision).reason), /侦察|硬打/)
    await assertCombatReportsPersisted(backend.baseUrl, 'world_scout', 'scout')
  } finally {
    await backend.stop()
  }
}

async function runGarrisonScenario() {
  const seeded = seedGarrisonWorld()
  const backend = await bootCombatBackend(seeded.path, ['garrison_set', 'world_scout', 'march_move'])
  try {
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=4`,
      'GET',
    )
    assert.equal(observationResponse.status, 200)
    const observation = readObject(readObject(observationResponse.data).observation)
    assert.equal(readObject(readArray(observation.ownTileThreats)[0]).tileId, seeded.tileId)
    const step = await runCombatStep(backend.baseUrl)
    assert.equal(step.selectedAction, 'garrison_set')
    const receipt = readObject(step.receipt)
    assert.equal(receipt.worldAction, 'queueTacticalOverride')
    const plannerArgs = readObject(readObject(step.plannerDecision).args)
    await assertAutonomousGarrisonSubjectBodyChange({
      baseUrl: backend.baseUrl,
      unitId: String(plannerArgs.unitId),
      targetTileId: seeded.tileId,
    })
    await assertCombatReportsPersisted(backend.baseUrl, 'garrison_set', 'garrison')
  } finally {
    await backend.stop()
  }
}

async function runMultiUnitPressureScenario() {
  const seeded = seedMultiUnitPressureWorld()
  const backend = await bootCombatBackend(
    seeded.path,
    ['garrison_set', 'tile_occupy', 'world_scout', 'march_move'],
  )
  try {
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=8`,
      'GET',
    )
    assert.equal(observationResponse.status, 200)
    const observation = readObject(readObject(observationResponse.data).observation)
    assert.equal(readArray(observation.ownUnits).length, 2, 'pressure gate should expose multiple assigned AI units')
    assert.ok(readArray(observation.enemyTargets).length >= 2, 'pressure gate should expose multiple combat targets')
    const recommendedActions = readArray(observation.recommendedActions).map((item) => readObject(item))
    const garrisonAction = recommendedActions.find((action) => action.action === 'garrison_set')
    const occupyAction = recommendedActions.find((action) => action.action === 'tile_occupy')
    const scoutAction = recommendedActions.find((action) => action.action === 'world_scout')
    assert.ok(garrisonAction, 'pressure gate should recommend garrison for threatened owned tile')
    assert.ok(occupyAction, 'pressure gate should recommend occupy for low-pressure current enemy tile')
    assert.ok(scoutAction, 'pressure gate should recommend scout for high-pressure nearby target')
    assert.equal(readObject(garrisonAction.args).unitId, seeded.garrisonUnitId)
    assert.equal(readObject(garrisonAction.args).targetTileId, seeded.ownThreatTileId)
    assert.equal(readObject(occupyAction.args).unitId, seeded.occupyUnitId)
    assert.equal(readObject(occupyAction.args).tileId, seeded.occupyTargetTileId)
    assert.equal(readObject(scoutAction.args).unitId, seeded.occupyUnitId)
    assert.equal(readObject(scoutAction.args).targetTileId, seeded.scoutTargetTileId)

    const firstStep = await runCombatStep(backend.baseUrl)
    assert.equal(firstStep.selectedAction, 'garrison_set')
    assert.equal(readObject(readObject(firstStep.plannerDecision).args).unitId, seeded.garrisonUnitId)
    assert.equal(readObject(firstStep.receipt).worldAction, 'queueTacticalOverride')
    await assertAutonomousGarrisonSubjectBodyChange({
      baseUrl: backend.baseUrl,
      unitId: seeded.garrisonUnitId,
      targetTileId: seeded.ownThreatTileId,
    })
    await assertCombatReportsPersisted(backend.baseUrl, 'garrison_set', 'multi-unit pressure')
  } finally {
    await backend.stop()
  }
}

function seedWarObjectiveWorld(): {
  path: string
  siegeTileId: string
  rallyRegionId: string
  crossPlayerTileId: string
} {
  const world = createInitialWorldState()
  const faction = world.factions[FACTION_ID]
  assert.ok(faction)
  const units = world.units.filter((candidate) => candidate.faction === FACTION_ID).slice(0, 2)
  assert.ok(units.length >= 2)
  const siegeUnit = units[0]
  const rallyUnit = units[1]
  const siegeTileId = world.map.connections[siegeUnit.tileId]?.[0] ?? rallyUnit.tileId
  const siegeTile = world.map.tiles.find((tile) => tile.id === siegeTileId)
  assert.ok(siegeTile)
  const crossPlayerTileId = world.map.connections[rallyUnit.tileId]?.find((tileId) => tileId !== siegeTileId)
    ?? world.map.connections[rallyUnit.tileId]?.[0]
    ?? siegeTileId
  const crossPlayerTile = world.map.tiles.find((tile) => tile.id === crossPlayerTileId)
  assert.ok(crossPlayerTile)

  siegeUnit.aiPlayerId = AI_PLAYER_ID
  siegeUnit.status = '待命'
  siegeUnit.currentTask = undefined
  siegeUnit.strength = 120
  siegeUnit.supply = 9
  rallyUnit.aiPlayerId = AI_PLAYER_ID
  rallyUnit.status = '待命'
  rallyUnit.currentTask = undefined
  rallyUnit.strength = 95
  rallyUnit.supply = 8

  siegeTile.owner = 'enemy_ai_legion'
  siegeTile.type = 'city'
  siegeTile.enemyPressure = 5
  siegeTile.name = '跨州敌城'
  crossPlayerTile.owner = 'rival_player_beta'
  crossPlayerTile.type = 'plain'
  crossPlayerTile.enemyPressure = 3
  crossPlayerTile.name = '敌方玩家前沿'

  world.units = world.units.filter((unit) => unit.faction !== ENEMY_FACTION_ID)
  world.units.push(cloneCombatDefenderFrom(siegeUnit, siegeTile.id))
  world.units.push({
    ...cloneCombatDefenderFrom(rallyUnit, crossPlayerTile.id),
    id: 'ai_autonomous_combat_cross_player_defender',
    faction: 'rival_player_beta',
    name: '玩家前沿守军',
  })
  const rallyRegionId = 'frontline_east'
  world.alliance.directives[rallyRegionId] = {
    regionId: rallyRegionId,
    stance: 'support',
    assignedCommanderId: world.alliance.commanders[0]?.id ?? 'alliance_commander_gate',
    supportLevel: 90,
    summary: '东线需要同盟集结支援。',
  }
  world.feedback.diplomacyAgreements = [{
    id: 'ai_autonomous_combat_rally_ceasefire_context',
    tick: Math.max(0, world.tick - 14),
    type: 'ceasefire',
    parties: [FACTION_ID, 'neutral_neighbor'],
    duration: 24,
    terms: '北线停火，东线集结可集中兵力。',
  }]

  faction.actionPoints = 100
  faction.food = 100
  faction.aiPlayers = [{
    id: AI_PLAYER_ID,
    name: 'Player Operator Alpha',
    factionId: FACTION_ID,
    unitIds: units.map((unit) => unit.id),
    specialty: 'assault',
  }]
  world.feedback.battleRecords = [{
    id: 'ai_autonomous_combat_previous_day_rally_memory',
    tick: Math.max(0, world.tick - 26),
    regionId: rallyRegionId,
    tileId: crossPlayerTile.id,
    attackerFaction: FACTION_ID,
    attackerUnitId: rallyUnit.id,
    outcome: 'draw',
    attackerLoss: 18,
    defenderLoss: 12,
    alliedSupport: 3,
    summary: '昨日东线集结已经接敌，今日需要继续接力。',
  }, {
    id: 'ai_autonomous_combat_enemy_ai_siege_memory',
    tick: Math.max(0, world.tick - 18),
    regionId: rallyRegionId,
    tileId: siegeTile.id,
    attackerFaction: 'enemy_ai_legion',
    attackerUnitId: 'enemy_ai_siege_unit',
    outcome: 'loss',
    attackerLoss: 9,
    defenderLoss: 28,
    alliedSupport: 0,
    summary: '敌对AI玩家携攻城队反复压跨州敌城城防，我方前排受损，需要记录敌军攻城偏好。',
  }, {
    id: 'ai_autonomous_combat_enemy_player_cavalry_memory',
    tick: Math.max(0, world.tick - 8),
    regionId: rallyRegionId,
    tileId: crossPlayerTile.id,
    attackerFaction: 'rival_player_beta',
    attackerUnitId: 'enemy_player_cavalry_unit',
    outcome: 'win',
    attackerLoss: 24,
    defenderLoss: 10,
    alliedSupport: 2,
    summary: '敌对玩家常用骑兵冲击敌方玩家前沿，我方守住后建议继续驻防并准备反击。',
  }]

  const path = buildSessionPersistPath('ai_player_autonomous_combat_war_objective_gate_world_state')
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    siegeTileId: siegeTile.id,
    rallyRegionId,
    crossPlayerTileId: crossPlayerTile.id,
  }
}

async function runWarObjectiveAndDailySummaryScenario() {
  const actionCatalog = new Map(listStaticAiPlayerActionCatalog().map((entry) => [entry.action, entry] as const))
  assert.equal(
    actionCatalog.get('alliance_task_execute')?.executableInV1,
    false,
    'diplomacy tasks should stay advisory archive text instead of executable AI actions',
  )
  const seeded = seedWarObjectiveWorld()
  const narrativeRelay = await startCombatNarrativeRelayProbe()
  const backend = await bootCombatBackend(
    seeded.path,
    ['alliance_help', 'world_scout', 'march_move', 'garrison_set', 'tile_occupy', 'troop_heal', 'troop_train', 'alliance_defense_assign', 'alliance_defense_batch_assign'],
    {
      AI_PLAYER_COMBAT_NARRATIVE_REWRITE_ENABLED: 'true',
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: narrativeRelay.baseUrl,
      AI_PLAYER_RUNTIME_MODEL: 'combat-narrative-mock',
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'combat-narrative-key-fixture',
      AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS: '3000',
    },
  )
  try {
    const observationResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/observation?limit=8`,
      'GET',
    )
    assert.equal(observationResponse.status, 200)
    const observation = readObject(readObject(observationResponse.data).observation)
    const warObjectives = readArray(observation.warObjectives).map((item) => readObject(item))
    assert.ok(warObjectives.some((objective) => (
      objective.kind === 'siege'
      && objective.targetTileId === seeded.siegeTileId
      && String(objective.playerFacingSummary).match(/攻城|敌城/)
    )), 'combat observation should expose backend siege objective')
    assert.ok(warObjectives.some((objective) => (
      objective.kind === 'alliance_rally'
      && objective.regionId === seeded.rallyRegionId
      && objective.suggestedAction === 'rally_launch'
    )), 'combat observation should expose executable alliance rally objective')
    assert.ok(warObjectives.some((objective) => (
      objective.kind === 'cross_player_target'
      && objective.targetTileId === seeded.crossPlayerTileId
      && String(objective.playerFacingSummary).match(/玩家|对手|跨玩家/)
    )), 'combat observation should expose cross-player target objective')

    const run = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`, 'POST', {
      maxSteps: 12,
      limit: 8,
    })
    assert.equal(run.status, 200, `war objective combat soak failed: ${JSON.stringify(run.data)}`)
    const runPayload = readObject(readObject(run.data).run)
    assert.ok(Number(runPayload.stepCount) >= 6, 'combat soak should run multiple steps')
    const failedSteps = readArray(runPayload.steps).filter((step) => readObject(readObject(step).receipt).ok !== true)
    assert.equal(failedSteps.length, 0, 'combat soak should not leave failed receipts')
    const profileUpdate = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/profile`, 'POST', {
      displayName: RENAMED_REPORT_DISPLAY_NAME,
      runtimePolicy: {
        allowAutonomousCombatDailySummaryChatReports: true,
        allowAutonomousCombatWarEventChatReports: true,
        allowAutonomousCombatVoiceReports: true,
      },
      updatedBy: GOVERNOR_PLAYER_ID,
    })
    assert.equal(profileUpdate.status, 200, `profile report setting update failed: ${JSON.stringify(profileUpdate.data)}`)
    const updatedProfile = readObject(readObject(profileUpdate.data).player)
    assert.equal(updatedProfile.displayName, RENAMED_REPORT_DISPLAY_NAME)
    const updatedRuntimePolicy = readObject(updatedProfile.runtimePolicy)
    assert.equal(updatedRuntimePolicy.allowAutonomousCombatDailySummaryChatReports, true)
    assert.equal(updatedRuntimePolicy.allowAutonomousCombatWarEventChatReports, true)
    assert.equal(updatedRuntimePolicy.allowAutonomousCombatVoiceReports, true)

    const summaryResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/daily-summary?limit=20`,
      'GET',
    )
    assert.equal(summaryResponse.status, 200, `daily summary route failed: ${JSON.stringify(summaryResponse.data)}`)
    const summary = readObject(readObject(summaryResponse.data).summary)
    assert.equal(summary.itemKind, 'ai_autonomous_combat_daily_summary')
    assert.match(String(summary.summary), /今日|本日|战斗|整补|集结|攻城|目标/)
    const dailySummaryPlayerFacingText = [
      String(summary.summary),
      String(summary.result),
      String(summary.rallyCampaignMemory),
      String(summary.diplomacyPosture),
      String(summary.crossDayRecap),
      String(readObject(summary.rallyCampaignState).playerFacingSummary),
    ].join('\n')
    assert.doesNotMatch(dailySummaryPlayerFacingText, /east_expansion|west_front|frontline_east|neutral_neighbor|regionId|stateKind/)
    assert.match(String(summary.rallyCampaignMemory), /集结|东线|接力|同盟/)
    assert.match(String(summary.diplomacyPosture), /外交|停火|中立|盟友|敌对/)
    assert.match(String(summary.crossDayRecap), /昨日|跨日|今日|接力/)
    const rallyCampaignState = readObject(summary.rallyCampaignState)
    assert.equal(rallyCampaignState.stateKind, 'ai_rally_campaign_state')
    assert.equal(rallyCampaignState.aiPlayerId, AI_PLAYER_ID)
    assert.equal(rallyCampaignState.regionId, seeded.rallyRegionId)
    assert.match(String(rallyCampaignState.campaignMemory), /集结|东线|接力|同盟/)
    assert.match(String(rallyCampaignState.diplomacyPosture), /外交|停火|中立|盟友|敌对/)
    assert.match(String(rallyCampaignState.crossDayRecap), /昨日|跨日|今日|接力/)
    assert.ok(Number(rallyCampaignState.rallyActionCount) >= 1, 'rally campaign state should accumulate rally actions')
    assert.ok(Number(rallyCampaignState.relatedBattleCount) >= 1, 'rally campaign state should retain battle memory')
    assert.match(String(summary.result), /集结|外交|跨日/)
    assert.doesNotMatch(JSON.stringify(summary), /proposalId|worldAction|MCP|tool|approve|execute|JSON/)
    const chatAfterDailySummary = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat?limit=20`,
      'GET',
    )
    assert.equal(chatAfterDailySummary.status, 200, `chat after daily summary failed: ${JSON.stringify(chatAfterDailySummary.data)}`)
    const dailyChatMessages = readArray(readObject(chatAfterDailySummary.data).messages).map((item) => readObject(item))
    const dailySummaryChatMessages = dailyChatMessages.filter((message) => String(readObject(message.metadata).source) === 'autonomous_combat_daily_summary_report')
    assert.equal(dailySummaryChatMessages.length, 1, 'daily summary should write one default AI-player chat report')
    assert.equal(String(dailySummaryChatMessages[0].authorName), RENAMED_REPORT_DISPLAY_NAME)
    assert.match(String(dailySummaryChatMessages[0].body), /青州后勤官|今日|战况|总结/)
    assert.match(String(dailySummaryChatMessages[0].body), /低声回报|主公|守住人心和城防/)
    assert.equal(narrativeRelay.requestBodies.length, 1, 'daily summary chat report should call narrative rewrite provider once')
    assert.equal(String(narrativeRelay.requestBodies[0]).includes('combat-narrative-key-fixture'), false, 'narrative rewrite request body must not include provider API key')
    assert.doesNotMatch(String(dailySummaryChatMessages[0].body), /east_expansion|west_front|regionId|stateKind/)
    const dailySummaryVoiceMetadata = readObject(dailySummaryChatMessages[0].metadata)
    assert.equal(dailySummaryVoiceMetadata.voicePlaybackReady, false)
    assert.match(String(dailySummaryVoiceMetadata.speakableText), /青州后勤官|今日|战况|总结/)
    assert.doesNotMatch(String(dailySummaryVoiceMetadata.speakableText), /east_expansion|west_front|regionId|stateKind/)
    const dailySummaryVoiceAvailability = readObject(dailySummaryVoiceMetadata.voiceAvailability)
    assert.equal(dailySummaryVoiceAvailability.status, 'unconfigured')
    assert.equal(dailySummaryVoiceAvailability.label, '今日总结语音未配置')
    assert.match(String(dailySummaryVoiceAvailability.summary), /文字总结|语音服务/)
    assert.equal(dailySummaryVoiceAvailability.canPlayVoice, false)
    assert.doesNotMatch(JSON.stringify(dailySummaryVoiceAvailability), /provider|env|key|MIMO_API_KEY/i)
    assert.equal(dailySummaryVoiceMetadata.speechContract, undefined)
    const dailySummaryAgain = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/daily-summary?limit=20`,
      'GET',
    )
    assert.equal(dailySummaryAgain.status, 200, `daily summary duplicate route failed: ${JSON.stringify(dailySummaryAgain.data)}`)
    const chatAfterDailySummaryAgain = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat?limit=20`,
      'GET',
    )
    const dailySummaryChatMessagesAgain = readArray(readObject(chatAfterDailySummaryAgain.data).messages)
      .map((item) => readObject(item))
      .filter((message) => String(readObject(message.metadata).source) === 'autonomous_combat_daily_summary_report')
    assert.equal(dailySummaryChatMessagesAgain.length, 1, 'daily summary chat report should be deduped/throttled')

    const archiveResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/campaign-archive?limit=20`,
      'GET',
    )
    assert.equal(archiveResponse.status, 200, `campaign archive route failed: ${JSON.stringify(archiveResponse.data)}`)
    const archive = readObject(readObject(archiveResponse.data).archive)
    assert.equal(archive.itemKind, 'ai_autonomous_combat_campaign_archive')
    assert.equal(archive.aiPlayerId, AI_PLAYER_ID)
    const campaigns = readArray(archive.campaigns).map((item) => readObject(item))
    assert.ok(campaigns.length >= 1, 'campaign archive should expose at least one long-term campaign dossier')
    const rallyCampaign = campaigns.find((campaign) => campaign.stateKind === 'ai_rally_campaign_archive' && campaign.regionId === seeded.rallyRegionId)
    assert.ok(rallyCampaign, 'campaign archive should retain rally campaign by region')
    assert.match(String(rallyCampaign.playerFacingTitle), /同盟|集结|东线/)
    assert.match(String(rallyCampaign.longTermMemory), /昨日|今日|跨日|接力/)
    assert.match(String(rallyCampaign.diplomacyTimelineSummary), /外交|停火|盟约|中立|敌对/)
    assert.match(String(rallyCampaign.crossDayActionRecap), /昨日|今日|跨日|接力/)
    const rallyTargets = readArray(rallyCampaign.crossDayRallyTargets).map((item) => readObject(item))
    assert.ok(rallyTargets.some((target) => String(target.regionId) === seeded.rallyRegionId && String(target.playerFacingSummary).match(/集结|东线|接力/)))
    const diplomacyChanges = readArray(rallyCampaign.diplomacyChanges).map((item) => readObject(item))
    assert.ok(diplomacyChanges.some((change) => String(change.playerFacingSummary).match(/停火|外交|盟约|中立|敌对/)))
    const recapEntries = readArray(rallyCampaign.recapEntries).map((item) => readObject(item))
    assert.ok(recapEntries.length >= 2, 'campaign archive should keep battle/action recap entries')
    const stateTransitions = readArray(rallyCampaign.stateTransitions).map((item) => readObject(item))
    assert.ok(
      stateTransitions.some((transition) => String(transition.playerFacingSummary).match(/阶段|侦察|集结|攻城|复盘|迁移/)),
      'campaign archive should expose player-facing alliance-war state transitions',
    )
    const diplomacyTasks = readArray(rallyCampaign.diplomacyTasks).map((item) => readObject(item))
    assert.ok(
      diplomacyTasks.some((task) => String(task.playerFacingSummary).match(/外交任务|停火|盟友|敌对|协调/)),
      'campaign archive should expose player-facing diplomacy tasks',
    )
    assert.ok(
      diplomacyTasks.every((task) => !('executableAction' in task)),
      'campaign archive diplomacy tasks should stay advisory and must not expose executable action ids',
    )
    const hostileDossiers = readArray(rallyCampaign.hostileDossiers).map((item) => readObject(item))
    assert.ok(
      hostileDossiers.some((dossier) => String(dossier.playerFacingSummary).match(/敌对|玩家|AI玩家|交手|战报/)),
      'campaign archive should expose hostile player/AI player dossiers',
    )
    const enemyDossierEntries = readArray(rallyCampaign.enemyDossierEntries).map((item) => readObject(item))
    assert.ok(enemyDossierEntries.length >= 2, 'campaign archive should expose a queryable long-term enemy dossier list')
    assert.ok(
      enemyDossierEntries.some((entry) => String(entry.enemyKind).match(/ai_player/) && String(entry.playerFacingSummary).match(/敌对AI玩家|胜负|常打目标|常用兵种|攻城偏好|反制建议/)),
      'enemy dossier list should aggregate hostile AI-player battle memory',
    )
    assert.ok(
      enemyDossierEntries.some((entry) => String(entry.enemyKind).match(/human_player/) && String(entry.playerFacingSummary).match(/敌对玩家|胜负|常打目标|常用兵种|攻城偏好|反制建议/)),
      'enemy dossier list should aggregate hostile human-player battle memory',
    )
    assert.ok(
      enemyDossierEntries.every((entry) => (
        String(entry.winLossSummary).match(/胜负|赢|输|守住|失守/)
        && String(entry.frequentTargetSummary).match(/常打目标|目标|城防|地块/)
        && String(entry.frequentUnitSummary).match(/常用兵种|攻城队|骑兵|步兵|部队/)
        && String(entry.siegePreferenceSummary).match(/攻城偏好|城防|耐久|攻城/)
        && String(entry.counterAdviceSummary).match(/反制建议|驻防|侦察|反击|绕开/)
      )),
      'enemy dossier entries should expose player-facing win/loss, target, unit, siege, and counter-advice summaries',
    )
    const enemyComparisonRows = readArray(rallyCampaign.enemyComparisonRows).map((item) => readObject(item))
    assert.ok(enemyComparisonRows.length >= 2, 'war-room archive should expose enemy comparison rows')
    assert.ok(
      enemyComparisonRows.every((row) => String(row.playerFacingSummary).match(/敌军对比|威胁|胜负|目标|反制/)),
      'enemy comparison rows should be player-facing war-room summaries',
    )
    const incomingAttackTimeline = readArray(rallyCampaign.incomingAttackTimeline).map((item) => readObject(item))
    assert.ok(incomingAttackTimeline.length >= 2, 'war-room archive should expose incoming attack timeline')
    assert.ok(
      incomingAttackTimeline.every((entry) => String(entry.playerFacingSummary).match(/来袭时间线|敌方|攻打|战报|前线/)),
      'incoming attack timeline should stay natural-language and useful',
    )
    const repeatedFailedTargetRows = readArray(rallyCampaign.repeatedFailedTargetRows).map((item) => readObject(item))
    assert.ok(repeatedFailedTargetRows.length >= 1, 'war-room archive should expose repeated failed target rows')
    assert.ok(
      repeatedFailedTargetRows.some((row) => String(row.playerFacingSummary).match(/重复失败目标|失败|高损|绕开|改换|驻防/)),
      'repeated failed target rows should explain why the target keeps failing',
    )
    const responsePlanCandidates = readArray(rallyCampaign.responsePlanCandidates).map((item) => readObject(item))
    assert.ok(responsePlanCandidates.length >= 2, 'war-room archive should expose counterattack/garrison plan candidates')
    assert.ok(
      responsePlanCandidates.some((plan) => String(plan.planKind).match(/garrison/) && String(plan.playerFacingSummary).match(/驻防计划|防守|侦察|城防/)),
      'response plan candidates should include a garrison plan',
    )
    assert.ok(
      responsePlanCandidates.some((plan) => String(plan.planKind).match(/counterattack/) && String(plan.playerFacingSummary).match(/反击计划|反击|绕开|侦察/)),
      'response plan candidates should include a counterattack plan',
    )
    assert.ok(
      responsePlanCandidates.some((plan) => (
        String(plan.proposalReadinessSummary).match(/可提交|等待真人确认|防守分配/)
        && !('proposalId' in plan)
        && !('worldAction' in plan)
      )),
      'response plan candidates should expose player-facing approval readiness without leaking proposal ids',
    )
    const enemyFilterOptions = readArray(rallyCampaign.enemyFilterOptions).map((item) => readObject(item))
    assert.ok(enemyFilterOptions.length >= 2, 'war-room archive should expose enemy filter options')
    assert.ok(
      enemyFilterOptions.every((option) => String(option.playerFacingSummary).match(/筛选|敌军|胜负|威胁|目标/)),
      'enemy filter options should stay player-facing',
    )
    const enemyHistoryPages = readArray(rallyCampaign.enemyHistoryPages).map((item) => readObject(item))
    assert.ok(enemyHistoryPages.length >= 1, 'war-room archive should expose single-enemy history pages')
    assert.ok(
      enemyHistoryPages.some((page) => (
        String(page.playerFacingTitle).match(/敌军历史|单个敌军/)
        && readArray(page.items).length >= 2
        && String(page.nextPageLabel).match(/下一页|已到末页/)
      )),
      'single-enemy history page should expose paged natural-language rows',
    )
    const liveIncomingAttackUpdates = readArray(rallyCampaign.liveIncomingAttackUpdates).map((item) => readObject(item))
    assert.ok(liveIncomingAttackUpdates.length >= 1, 'war-room archive should expose live incoming attack updates')
    assert.ok(
      liveIncomingAttackUpdates.some((update) => String(update.playerFacingSummary).match(/实时来袭|刚刚|更新|前线|驻防/)),
      'live incoming attack updates should be player-facing timeline deltas',
    )
    const defenseAssignment = await createApproveExecuteProposal(
      backend.baseUrl,
      'alliance_defense_assign',
      {
        targetTileId: String(readObject(responsePlanCandidates[0]).targetTileId || seeded.siegeTileId),
        summary: '同盟 war-room 防守分配：按敌军档案建议驻防东线。',
      },
      'Approve a backend alliance defense assignment generated from war-room plan candidates.',
    )
    assert.equal(defenseAssignment.proposal.action, 'alliance_defense_assign')
    assert.equal(defenseAssignment.receipt.ok, true)
    assert.equal(defenseAssignment.receipt.worldAction, 'queuePlanExecution')
    const batchDefenseAssignment = await createApproveExecuteProposal(
      backend.baseUrl,
      'alliance_defense_batch_assign',
      {
        assignments: [
          {
            targetTileId: seeded.siegeTileId,
            summary: '批量防守分配：第一队驻防东线城防。',
          },
          {
            targetTileId: seeded.crossPlayerTileId,
            summary: '批量防守分配：第二队守住敌方玩家前沿。',
          },
        ],
        summary: '同盟 war-room 批量防守分配：两处前线同时驻防。',
      },
      'Approve a backend alliance defense batch assignment generated from war-room plan candidates.',
    )
    assert.equal(batchDefenseAssignment.proposal.action, 'alliance_defense_batch_assign')
    assert.equal(batchDefenseAssignment.receipt.ok, true)
    assert.equal(batchDefenseAssignment.receipt.worldAction, 'queuePlanExecution')
    const batchPayload = readObject(batchDefenseAssignment.receipt.worldActionPayload)
    const batchPlan = readObject(batchPayload.plan)
    assert.ok(readArray(batchPlan.orders).length >= 2, 'batch defense assignment should queue multiple garrison orders')
    const archiveAfterBatchResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/campaign-archive?limit=20`,
      'GET',
    )
    assert.equal(archiveAfterBatchResponse.status, 200, `campaign archive after batch route failed: ${JSON.stringify(archiveAfterBatchResponse.data)}`)
    const archiveAfterBatch = readObject(readObject(archiveAfterBatchResponse.data).archive)
    const rallyCampaignAfterBatch = readObject(readArray(archiveAfterBatch.campaigns).find((campaign) => readObject(campaign).stateKind === 'ai_rally_campaign_archive'))
    const defenseAssignmentResults = readArray(rallyCampaignAfterBatch.defenseAssignmentResults).map((item) => readObject(item))
    assert.ok(
      defenseAssignmentResults.some((result) => String(result.playerFacingSummary).match(/批量防守|驻防|已提交|战报|敌军档案/)),
      'batch defense execution should be written back into alliance battle report and enemy dossier summaries',
    )
    assert.ok(
      defenseAssignmentResults.some((result) => readArray(result.outcomeRows).some((row) => (
        String(readObject(row).playerFacingSummary).match(/成员|队伍|目标|战损|反制建议/)
      ))),
      'defense assignment results should expose member/team/target/loss/counter-advice outcome rows',
    )
    const enemyDossierEntriesAfterBatch = readArray(rallyCampaignAfterBatch.enemyDossierEntries).map((item) => readObject(item))
    assert.ok(
      enemyDossierEntriesAfterBatch.some((entry) => String(entry.playerFacingSummary).match(/防守分配|驻防已提交|批量防守|回写/)),
      'enemy dossier entries should include defense assignment backwrite summaries',
    )
    const warRoomScope = readObject(rallyCampaignAfterBatch.warRoomAccessScope)
    assert.equal(warRoomScope.factionId, FACTION_ID)
    assert.match(String(warRoomScope.scopeKind), /alliance|kingdom|empire/)
    assert.match(String(warRoomScope.permissionSummary), /同盟|王国|帝国|权限|隔离/)
    assert.ok(readArray(warRoomScope.allowedFactionIds).includes(FACTION_ID), 'war-room scope should allow owner faction')
    assert.ok(!readArray(warRoomScope.allowedFactionIds).includes(ENEMY_FACTION_ID), 'war-room scope should isolate enemy faction')
    const enemyViewerRefresh = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/war-room-live-refresh?limit=20&sinceTick=0&viewerFactionId=${ENEMY_FACTION_ID}`,
      'GET',
    )
    assert.equal(enemyViewerRefresh.status, 403, 'enemy faction should not read another kingdom/alliance war-room refresh')
    const warRoomSocket = await openSubscribedWarRoomSocket(backend.baseUrl, FACTION_ID)
    const enemyWarRoomSocket = await openSubscribedWarRoomSocket(backend.baseUrl, ENEMY_FACTION_ID)
    try {
      const warRoomPushMessagePromise = waitForWsMessage(warRoomSocket, (payload) => (
        payload.type === 'war_room_live_refresh'
      ))
      const enemyWarRoomNoMessagePromise = waitForNoWsMessage(enemyWarRoomSocket, (payload) => (
        payload.type === 'war_room_live_refresh'
      ))
      const liveRefreshResponse = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/war-room-live-refresh?limit=20&sinceTick=0&viewerFactionId=${FACTION_ID}`,
        'GET',
      )
      assert.equal(liveRefreshResponse.status, 200, `war-room live refresh route failed: ${JSON.stringify(liveRefreshResponse.data)}`)
      const liveRefresh = readObject(readObject(liveRefreshResponse.data).refresh)
      assert.equal(liveRefresh.itemKind, 'ai_autonomous_combat_war_room_live_refresh')
      assert.equal(liveRefresh.pollMode, 'backend_poll')
      assert.match(String(liveRefresh.pushTopic), /war_room|autonomous_combat/)
      assert.equal(Number(liveRefresh.pushDeliveredCount), 1, `war-room live refresh should fan out only to permitted faction subscribers: ${JSON.stringify(liveRefresh)}`)
      const liveRefreshScope = readObject(liveRefresh.warRoomAccessScope)
      assert.equal(liveRefreshScope.factionId, FACTION_ID)
      assert.ok(!readArray(liveRefreshScope.allowedFactionIds).includes(ENEMY_FACTION_ID), 'live refresh should not include enemy faction in allowed scope')
      const warRoomPushMessage = await warRoomPushMessagePromise
      assert.equal(warRoomPushMessage.type, 'war_room_live_refresh')
      assert.match(String(warRoomPushMessage.topic), /ai_autonomous_combat_war_room/)
      assert.match(String(warRoomPushMessage.playerFacingSummary), /批量防守|驻防|敌军|战报/)
      assert.equal(readObject(warRoomPushMessage.warRoomAccessScope).factionId, FACTION_ID)
      assert.doesNotMatch(JSON.stringify(warRoomPushMessage), /proposalId|worldAction|MCP|tool|approve|execute|JSON/)
      await enemyWarRoomNoMessagePromise
      assert.ok(readArray(liveRefresh.liveIncomingAttackUpdates).length >= 1, 'live refresh route should expose backend timeline deltas')
      assert.match(String(liveRefresh.playerFacingSummary), /后端|刷新|来袭|敌军|驻防/)
      assert.doesNotMatch(JSON.stringify(liveRefresh), /proposalId|worldAction|MCP|tool|approve|execute|JSON/)
      const chatAfterWarRoomRefresh = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/chat?limit=12`,
        'GET',
      )
      assert.equal(chatAfterWarRoomRefresh.status, 200, `chat after war-room refresh failed: ${JSON.stringify(chatAfterWarRoomRefresh.data)}`)
      const warRoomChatMessages = readArray(readObject(chatAfterWarRoomRefresh.data).messages).map((item) => readObject(item))
      const warRoomChatMessage = warRoomChatMessages.find((message) => String(readObject(message.metadata).source) === 'autonomous_combat_war_room_report')
      assert.ok(warRoomChatMessage, 'war-room refresh should write an AI natural-language report into the AI chat channel')
      assert.equal(warRoomChatMessage.authorType, 'ai')
      assert.equal(warRoomChatMessage.kind, 'message')
      assert.equal(String(warRoomChatMessage.authorName), RENAMED_REPORT_DISPLAY_NAME)
      assert.match(String(warRoomChatMessage.body), /战情|战情室|驻防|战损|反制建议|权限隔离/)
      const chatAfterWarRoomRefreshAgain = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/war-room-live-refresh?limit=20&sinceTick=0&viewerFactionId=${FACTION_ID}`,
        'GET',
      )
      assert.equal(chatAfterWarRoomRefreshAgain.status, 200, `duplicate war-room live refresh failed: ${JSON.stringify(chatAfterWarRoomRefreshAgain.data)}`)
      const chatAfterWarRoomRefreshAgainMessages = await requestJson(
        backend.baseUrl,
        `/api/ai/players/${AI_PLAYER_ID}/chat?limit=20`,
        'GET',
      )
      const warRoomChatMessageCount = readArray(readObject(chatAfterWarRoomRefreshAgainMessages.data).messages)
        .map((item) => readObject(item))
        .filter((message) => String(readObject(message.metadata).source) === 'autonomous_combat_war_room_report')
        .length
      assert.equal(warRoomChatMessageCount, 1, 'war-room chat report should be deduped/throttled during repeated refresh')
      for (const forbidden of ['proposalId', 'worldAction', 'queuePlanExecution', 'alliance_defense_assign', 'alliance_defense_batch_assign', 'JSON', 'war-room', 'provider', 'env', 'key']) {
        assert.equal(String(warRoomChatMessage.body).includes(forbidden), false, `chat war-room report must not expose ${forbidden}`)
      }
    } finally {
      warRoomSocket.close()
      enemyWarRoomSocket.close()
    }
    const advanceAfterDefense = await requestJson(
      backend.baseUrl,
      '/api/world/action?includeWorld=false',
      'POST',
      { action: 'advanceTick' },
      60_000,
    )
    assert.equal(advanceAfterDefense.status, 200, `advance tick after batch defense failed: ${JSON.stringify(advanceAfterDefense.data)}`)
    assert.equal(readObject(advanceAfterDefense.data).ok, true)
    await sleep(100)
    const archiveAfterDefenseSettlementResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/campaign-archive?limit=20`,
      'GET',
    )
    assert.equal(archiveAfterDefenseSettlementResponse.status, 200, `campaign archive after defense settlement failed: ${JSON.stringify(archiveAfterDefenseSettlementResponse.data)}`)
    const archiveAfterDefenseSettlement = readObject(readObject(archiveAfterDefenseSettlementResponse.data).archive)
    const rallyCampaignAfterDefenseSettlement = readObject(readArray(archiveAfterDefenseSettlement.campaigns).find((campaign) => readObject(campaign).stateKind === 'ai_rally_campaign_archive'))
    const defenseSettlementRecapEntries = readArray(rallyCampaignAfterDefenseSettlement.defenseSettlementRecapEntries).map((item) => readObject(item))
    assert.ok(
      defenseSettlementRecapEntries.some((entry) => String(entry.playerFacingSummary).match(/跨成员|防守结算|战报结算|长期战役复盘|驻防/)),
      'campaign archive should retain cross-member defense settlement recap after battle tick',
    )
    const defenseExecutionOutcomeRows = readArray(rallyCampaignAfterDefenseSettlement.defenseExecutionOutcomeRows).map((item) => readObject(item))
    assert.ok(
      defenseExecutionOutcomeRows.some((row) => (
        String(row.memberLabel).match(/成员|队伍/)
        && String(row.teamLabel).match(/队伍|第/)
        && String(row.targetSummary).match(/目标|前线|城防|地块/)
        && String(row.lossSummary).match(/战损|我方|敌方|损失/)
        && String(row.counterAdviceSummary).match(/反制建议|驻防|侦察|反击|绕开/)
      )),
      'defense execution outcome rows should detail member, team, target, losses, and counter-advice',
    )
    const chatAfterDefaultCombatEvents = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat?limit=50`,
      'GET',
    )
    assert.equal(chatAfterDefaultCombatEvents.status, 200, `chat after default combat events failed: ${JSON.stringify(chatAfterDefaultCombatEvents.data)}`)
    const defaultCombatChatMessages = readArray(readObject(chatAfterDefaultCombatEvents.data).messages).map((item) => readObject(item))
    const expectedDefaultCombatSources = [
      'autonomous_combat_daily_summary_report',
      'autonomous_combat_siege_report',
      'autonomous_combat_incoming_attack_report',
      'autonomous_combat_defense_outcome_report',
      'autonomous_combat_war_room_report',
    ]
    const defaultCombatSources = defaultCombatChatMessages.map((message) => String(readObject(message.metadata).source))
    for (const source of expectedDefaultCombatSources) {
      assert.ok(defaultCombatSources.includes(source), `chat should include default combat event source ${source}`)
    }
    const expectedVoiceAvailabilityLabelsBySource = new Map([
      ['autonomous_combat_daily_summary_report', /今日总结语音未配置/],
      ['autonomous_combat_siege_report', /攻城播报语音未配置/],
      ['autonomous_combat_incoming_attack_report', /来袭提醒语音未配置/],
      ['autonomous_combat_defense_outcome_report', /驻防结果语音未配置/],
      ['autonomous_combat_war_room_report', /战情汇报语音未配置/],
    ])
    for (const [source, labelPattern] of expectedVoiceAvailabilityLabelsBySource.entries()) {
      const message = defaultCombatChatMessages.find((item) => String(readObject(item.metadata).source) === source)
      assert.ok(message, `chat should include default event source ${source}`)
      const metadata = readObject(message.metadata)
      const availability = readObject(metadata.voiceAvailability)
      assert.match(String(availability.label), labelPattern)
      assert.match(String(availability.summary), /文字|语音服务|可播放/)
      assert.equal(metadata.voicePlaybackReady, false)
      assert.match(String(metadata.speakableText), /青州后勤官|战况|战情|今日|攻城|来袭|驻防/)
      assert.doesNotMatch(String(message.body), /east_expansion|west_front|frontline_east|neutral_neighbor|war-room|regionId|stateKind|provider|env|key/i)
      assert.doesNotMatch(String(metadata.speakableText), /east_expansion|west_front|frontline_east|neutral_neighbor|war-room|regionId|stateKind|provider|env|key/i)
      assert.doesNotMatch(JSON.stringify(availability), /provider|env|key|MIMO_API_KEY/i)
    }
    const defaultCombatBodies = defaultCombatChatMessages
      .filter((message) => expectedDefaultCombatSources.includes(String(readObject(message.metadata).source)))
      .map((message) => String(message.body))
      .join('\n')
    assert.match(defaultCombatBodies, /攻城结束|攻城|城防|耐久/)
    assert.match(defaultCombatBodies, /敌军来袭|来袭|攻打/)
    assert.match(defaultCombatBodies, /驻防成功|驻防失败|防守结算|战损/)
    assert.match(defaultCombatBodies, /青州后勤官/)
    assert.doesNotMatch(defaultCombatBodies, /AI军事|AI军师|AI降临|AI名城/)
    for (const forbidden of ['proposalId', 'worldAction', 'queuePlanExecution', 'alliance_defense_assign', 'alliance_defense_batch_assign', 'JSON', 'war-room', 'east_expansion', 'west_front', 'frontline_east', 'neutral_neighbor', 'regionId', 'stateKind', 'provider', 'env', 'key']) {
      assert.equal(defaultCombatBodies.includes(forbidden), false, `default combat chat reports must not expose ${forbidden}`)
    }
    const uiStateUpsertResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/war-room-ui-state`,
      'POST',
      {
        selectedEnemyId: String(readObject(enemyFilterOptions[0]).enemyId),
        enemyHistoryPage: 2,
      },
    )
    assert.equal(uiStateUpsertResponse.status, 200, `war-room ui-state upsert route failed: ${JSON.stringify(uiStateUpsertResponse.data)}`)
    const uiStateGetResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/war-room-ui-state`,
      'GET',
    )
    assert.equal(uiStateGetResponse.status, 200, `war-room ui-state get route failed: ${JSON.stringify(uiStateGetResponse.data)}`)
    const uiState = readObject(readObject(uiStateGetResponse.data).uiState)
    assert.equal(uiState.itemKind, 'ai_autonomous_combat_war_room_ui_state')
    assert.equal(uiState.selectedEnemyId, String(readObject(enemyFilterOptions[0]).enemyId))
    assert.equal(uiState.enemyHistoryPage, 2)
    assert.match(String(uiState.playerFacingSummary), /筛选|分页|玩家|已保存/)
    assert.doesNotMatch(JSON.stringify(uiState), /proposalId|worldAction|MCP|tool|approve|execute|JSON/)
    const incomingAttackReports = readArray(rallyCampaign.incomingAttackReports).map((item) => readObject(item))
    assert.ok(
      incomingAttackReports.some((report) => String(report.playerFacingSummary).match(/来袭|攻打|敌方|守住|失守|战报/)),
      'campaign archive should expose incoming hostile battle reports',
    )
    const enemyTargetHistory = readArray(rallyCampaign.enemyTargetHistory).map((item) => readObject(item))
    assert.ok(
      enemyTargetHistory.some((entry) => String(entry.playerFacingSummary).match(/目标|城防|地块|攻城|集结|敌方/)),
      'campaign archive should retain enemy target history',
    )
    const enemyBattleAnalysis = readObject(rallyCampaign.enemyBattleAnalysis)
    assert.match(String(enemyBattleAnalysis.winLossSummary), /赢|输|胜|败|守住|失守|损失/)
    assert.match(String(enemyBattleAnalysis.recommendedDefenseSummary), /防守|驻防|侦察|反击|绕开|优先/)
    const failedTargetMemories = readArray(rallyCampaign.failedTargetMemories).map((item) => readObject(item))
    assert.ok(
      failedTargetMemories.some((memory) => String(memory.playerFacingSummary).match(/失败目标|绕开|改换|备用目标|长期记忆/)),
      'campaign archive should retain long-term failed-target memory',
    )
    const crossDayActionList = readArray(rallyCampaign.crossDayActionList).map((item) => readObject(item))
    assert.ok(crossDayActionList.length >= 3, 'campaign archive should expose a queryable cross-day action list')
    assert.ok(
      crossDayActionList.some((entry) => String(entry.playerFacingSummary).match(/昨日|今日|跨日|攻城|集结|侦察/)),
      'cross-day action list should stay player-facing and useful',
    )
    assert.doesNotMatch(JSON.stringify(archive), /proposalId|worldAction|MCP|tool|approve|execute|JSON/)
  } finally {
    await backend.stop()
    await narrativeRelay.stop()
  }
}

async function runInvalidTargetRecoveryScenario() {
  const seeded = seedInvalidTargetRecoveryWorld()
  const backend = await bootCombatBackend(seeded.path, ['tile_occupy', 'march_move'])
  try {
    const failed = await createApproveExecuteProposal(
      backend.baseUrl,
      'tile_occupy',
      { tileId: seeded.failedTileId },
      'Seed a failed combat target so the autonomous planner must retarget.',
    )
    assert.equal(failed.receipt.ok, false, 'seeded target receipt should fail before retargeting')
    assert.equal(failed.receipt.worldAction, 'occupyTile')
    assert.equal(readObject(failed.receipt.worldActionPayload).tileId, seeded.failedTileId)

    await ensureFactionBudget(backend.baseUrl, 4, 4, 'autonomous combat retarget')
    const step = await runCombatStep(backend.baseUrl)
    assert.equal(step.selectedAction, 'march_move')
    const plannerArgs = readObject(readObject(step.plannerDecision).args)
    assert.notEqual(plannerArgs.targetTileId, seeded.failedTileId)
    assert.equal(plannerArgs.targetTileId, seeded.alternateTileId)
    const receipt = readObject(step.receipt)
    assert.equal(receipt.worldAction, 'moveUnit')
    await assertCombatReportsPersisted(backend.baseUrl, 'march_move', 'invalid target recovery')
  } finally {
    await backend.stop()
  }
}

async function runMockedLlmPlannerScenario() {
  const seeded = seedScoutWorld()
  const backend = await bootCombatBackend(
    seeded.path,
    ['world_scout', 'march_move', 'garrison_set'],
    {
      AI_PLAYER_AUTONOMOUS_COMBAT_MODEL_MOCK_OUTPUT: JSON.stringify({
        summary: '模型判断敌压过高，先侦察。',
        proposals: [
          {
            action: 'world_scout',
            args: {
              targetTileId: seeded.targetTileId,
            },
            reason: '敌压较高，先侦察目标再决定是否进攻；后端负责执行侦察并写战果。',
          },
        ],
        deferReason: '',
        needsHumanReview: false,
      }),
    },
  )
  try {
    const run = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`, 'POST', {
      maxSteps: 1,
      limit: 4,
      plannerMode: 'llm',
    })
    assert.equal(run.status, 200, `mocked LLM combat run failed: ${JSON.stringify(run.data)}`)
    const step = readObject(readArray(readObject(readObject(run.data).run).steps)[0])
    const decision = readObject(step.plannerDecision)
    assert.equal(decision.plannerSource, 'llm')
    assert.equal(decision.model, 'mock:test')
    assert.equal(step.selectedAction, 'world_scout')
    assert.equal(readObject(step.receipt).worldAction, 'queuePlanExecution')
    await assertCombatReportsPersisted(backend.baseUrl, 'world_scout', 'mocked llm')
  } finally {
    await backend.stop()
  }
}

async function runMockedLlmWhitelistGuardScenario() {
  const seeded = seedScoutWorld()
  const backend = await bootCombatBackend(
    seeded.path,
    ['troop_heal'],
    {
      AI_PLAYER_AUTONOMOUS_COMBAT_MODEL_MOCK_OUTPUT: JSON.stringify({
        summary: '模型试图越过白名单去侦察。',
        proposals: [
          {
            action: 'world_scout',
            args: {
              targetTileId: seeded.targetTileId,
            },
            reason: '这条输出不在当前白名单内，后端不能执行。',
          },
        ],
        deferReason: '',
        needsHumanReview: false,
      }),
    },
  )
  try {
    const run = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/run`, 'POST', {
      maxSteps: 1,
      limit: 4,
      plannerMode: 'llm',
    })
    assert.equal(run.status, 409, 'mocked LLM combat run should reject actions outside runtime whitelist')
    assert.match(String(readObject(run.data).error), /no allowed combat action|planner/i)
  } finally {
    await backend.stop()
  }
}

async function runUnsafeNarrativeRewriteFallbackScenario() {
  const seeded = seedWarObjectiveWorld()
  const unsafeRelay = await startUnsafeCombatNarrativeRelayProbe()
  const backend = await bootCombatBackend(
    seeded.path,
    ['alliance_help', 'world_scout', 'march_move', 'garrison_set'],
    {
      AI_PLAYER_COMBAT_NARRATIVE_REWRITE_ENABLED: 'true',
      AI_PLAYER_RUNTIME_MODEL_BASE_URL: unsafeRelay.baseUrl,
      AI_PLAYER_RUNTIME_MODEL: 'unsafe-combat-narrative-mock',
      AI_PLAYER_RUNTIME_MODEL_API_KEY: 'unsafe-combat-narrative-key-fixture',
      AI_PLAYER_RUNTIME_MODEL_REQUEST_TIMEOUT_MS: '3000',
    },
  )
  try {
    const profileUpdate = await requestJson(backend.baseUrl, `/api/ai/players/${AI_PLAYER_ID}/profile`, 'POST', {
      displayName: RENAMED_REPORT_DISPLAY_NAME,
      updatedBy: GOVERNOR_PLAYER_ID,
      runtimePolicy: {
        allowAutonomousCombatDailySummaryChatReports: true,
        allowAutonomousCombatWarEventChatReports: true,
        allowAutonomousCombatVoiceReports: true,
      },
    })
    assert.equal(profileUpdate.status, 200, `unsafe narrative profile update failed: ${JSON.stringify(profileUpdate.data)}`)
    const summaryResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/autonomous-combat/daily-summary?limit=20`,
      'GET',
    )
    assert.equal(summaryResponse.status, 200, `unsafe narrative daily summary failed: ${JSON.stringify(summaryResponse.data)}`)
    const chatResponse = await requestJson(
      backend.baseUrl,
      `/api/ai/players/${AI_PLAYER_ID}/chat?limit=20`,
      'GET',
    )
    assert.equal(chatResponse.status, 200, `unsafe narrative chat read failed: ${JSON.stringify(chatResponse.data)}`)
    const messages = readArray(readObject(chatResponse.data).messages).map((item) => readObject(item))
    const dailyMessage = messages.find((message) => String(readObject(message.metadata).source) === 'autonomous_combat_daily_summary_report')
    assert.ok(dailyMessage, 'unsafe narrative fallback should still write daily summary chat message')
    assert.equal(unsafeRelay.requestBodies.length, 1, 'unsafe narrative fallback should still call provider once before rejecting output')
    assert.match(String(dailyMessage.body), /今日|战况|总结|战斗/)
    assert.doesNotMatch(String(dailyMessage.body), /proposalId|regionId|stateKind|east_expansion|west_front|frontline_east|neutral_neighbor|war-room|provider|env|key|\{|\}/i)
    const metadata = readObject(dailyMessage.metadata)
    assert.doesNotMatch(String(metadata.speakableText), /proposalId|regionId|stateKind|east_expansion|west_front|frontline_east|neutral_neighbor|war-room|provider|env|key|\{|\}/i)
    assert.equal(String(unsafeRelay.requestBodies[0]).includes('unsafe-combat-narrative-key-fixture'), false, 'unsafe narrative request body must not include provider API key')
  } finally {
    await backend.stop()
    await unsafeRelay.stop()
  }
}

async function run() {
  if (process.env.AI_PLAYER_AUTONOMOUS_COMBAT_FOCUS === 'garrison_subject') {
    await runGarrisonScenario()
    await runMultiUnitPressureScenario()
    console.log('[ai_player_autonomous_combat_garrison_subject_gate] all checks passed')
    return
  }
  await runLossRecoveryScenario()
  await runScoutScenario()
  await runGarrisonScenario()
  await runMultiUnitPressureScenario()
  await runWarObjectiveAndDailySummaryScenario()
  await runUnsafeNarrativeRewriteFallbackScenario()
  await runInvalidTargetRecoveryScenario()
  await runMockedLlmPlannerScenario()
  await runMockedLlmWhitelistGuardScenario()
}

run().catch((error) => {
  console.error('[ai_player_autonomous_combat_loop_gate] failed:', error)
  process.exitCode = 1
})
