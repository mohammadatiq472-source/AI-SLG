import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Tile, WorldState } from '../../shared/contracts/game'
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

const OFFICER_COMMANDER_ID = 'ally_west'

type FoundingFailureCode =
  | 'nation_found_level_required'
  | 'nation_found_commandery_required'
  | 'nation_found_capital_not_controlled'
  | 'nation_found_forbidden'

type FoundingFailureScenario = {
  id: string
  playerName: string
  allianceLevel: number
  controlledCommanderyCount: number
  selectedCapitalOwner?: 'player' | 'enemy'
  expectedFailureCode: FoundingFailureCode
  expectedStatus: number
  expectedText: string
}

async function requestJsonWithHeaders(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  headers: Record<string, string>,
  body?: Record<string, unknown>,
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    ok: response.ok,
    status: response.status,
    data: raw.trim() ? JSON.parse(raw) as unknown : null,
  }
}

function requireCityTile(world: WorldState, predicate: (tile: Tile) => boolean): Tile {
  const tile = world.map.tiles.find((candidate) => candidate.type === 'city' && predicate(candidate))
  assert.ok(tile, 'seed world should expose the required city tile')
  return tile
}

function configurePlayerAsAlliance(world: WorldState) {
  const faction = world.factions.player
  faction.organizationId = 'player'
  faction.organizationKind = 'alliance'
  faction.organizationName = '青州同盟'
  faction.nationName = undefined
  faction.nationTier = undefined
  faction.nationColorHex = undefined
  faction.nationCapitalTileId = undefined
  faction.nationCapitalName = undefined
  faction.jade = 260
}

function clearPlayerCommanderyOwnership(world: WorldState) {
  for (const cluster of world.map.overlays.cityClusters) {
    cluster.owner = 'enemy'
    cluster.camp = 'autonomous'
    for (const tileId of cluster.tileIds) {
      const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
      if (tile) {
        tile.owner = 'enemy'
      }
    }
  }
  for (const tile of world.map.tiles) {
    if (tile.type === 'city' && tile.owner === 'player') {
      tile.owner = 'enemy'
    }
  }
}

function assignCommanderyToPlayer(world: WorldState, index: number): Tile {
  const cluster = world.map.overlays.cityClusters[index]
  assert.ok(cluster, `seed world should expose city cluster ${index}`)
  cluster.owner = 'player'
  cluster.camp = 'human_controlled'
  for (const tileId of cluster.tileIds) {
    const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
    if (tile) {
      tile.owner = 'player'
    }
  }
  const hallTile = requireCityTile(world, (tile) => tile.id === cluster.cityHallTileId)
  hallTile.owner = 'player'
  hallTile.type = 'city'
  hallTile.name = hallTile.name || cluster.name || '青石城'
  return hallTile
}

function seedNationFoundFailureWorldState(
  prefix: string,
  options: {
    allianceLevel: number
    controlledCommanderyCount: number
    selectedCapitalOwner?: 'player' | 'enemy'
  },
) {
  const world = createInitialWorldState()
  world.alliance.level = options.allianceLevel
  clearPlayerCommanderyOwnership(world)

  let selectedCapital = requireCityTile(world, (tile) => tile.type === 'city')
  for (let index = 0; index < options.controlledCommanderyCount; index += 1) {
    const ownedCapital = assignCommanderyToPlayer(world, index)
    if (index === 0) {
      selectedCapital = ownedCapital
    }
  }

  if (options.selectedCapitalOwner === 'enemy') {
    const enemyCluster = world.map.overlays.cityClusters[options.controlledCommanderyCount]
    assert.ok(enemyCluster, 'seed world should expose an enemy capital candidate')
    enemyCluster.owner = 'enemy'
    enemyCluster.camp = 'autonomous'
    selectedCapital = requireCityTile(world, (tile) => tile.id === enemyCluster.cityHallTileId)
    selectedCapital.owner = 'enemy'
  }

  selectedCapital.name = selectedCapital.name || '青石城'
  configurePlayerAsAlliance(world)

  const path = buildSessionPersistPath(prefix)
  writeFileSync(path, `${JSON.stringify(world)}\n`, 'utf-8')
  return {
    path,
    selectedCapital,
  }
}

async function joinPlayer(baseUrl: string, playerName: string) {
  const response = await requestJson(baseUrl, '/api/session/join', 'POST', {
    factionId: 'player',
    playerName,
  })
  assert.equal(response.status, 200, `session join failed: ${JSON.stringify(response.data)}`)
  const token = String(readObject(response.data).token ?? '')
  assert.ok(token.length >= 32, 'session join should return bearer token')
  return token
}

function appendTail(target: string[], chunk: string, max = 80) {
  const lines = chunk.split(/\r?\n/).filter((line) => line.trim().length > 0)
  target.push(...lines)
  if (target.length > max) {
    target.splice(0, target.length - max)
  }
}

async function runGodotVisualSmoke(
  scenario: FoundingFailureScenario,
  backendUrl: string,
  capital: Tile,
) {
  const evidenceDir = join(
    process.cwd(),
    'tmp',
    'screenshots',
    `nation_found_failure_godot_${scenario.id}_${process.pid}_${Date.now()}`,
  )
  mkdirSync(evidenceDir, { recursive: true })
  const args = [
    '/d',
    '/c',
    'scripts\\run_python.cmd',
    'godot-client\\tools\\run_mainline_visual_smoke.py',
    '--backend-url',
    backendUrl,
    '--no-start-backend',
    '--display-mode',
    'world',
    '--world-action',
    'none',
    '--panel-id',
    'alliance',
    '--click-action',
    'world_open_main_city_organization_founding_submit_failure',
    '--evidence-dir',
    evidenceDir,
    '--timeout-sec',
    '150',
  ]
  const command = process.platform === 'win32' ? 'cmd.exe' : 'python3'
  const commandArgs = process.platform === 'win32'
    ? args
    : [
        'godot-client/tools/run_mainline_visual_smoke.py',
        '--backend-url',
        backendUrl,
        '--no-start-backend',
        '--display-mode',
        'world',
        '--world-action',
        'none',
        '--panel-id',
        'alliance',
        '--click-action',
        'world_open_main_city_organization_founding_submit_failure',
        '--evidence-dir',
        evidenceDir,
        '--timeout-sec',
        '150',
      ]

  const stdout: string[] = []
  const stderr: string[] = []
  const env = {
    ...process.env,
    PYTHONIOENCODING: 'utf-8',
    SLG_PLAYER_NAME: scenario.playerName,
    SLG_FACTION_ID: 'player',
    SLG_NATION_FOUND_FAILURE_EXPECTED_CODE: scenario.expectedFailureCode,
    SLG_NATION_FOUND_FAILURE_EXPECTED_TEXT: scenario.expectedText,
    SLG_NATION_FOUND_FAILURE_CAPITAL_TILE_ID: capital.id,
    SLG_NATION_FOUND_FAILURE_CAPITAL_NAME: capital.name ?? '青石城',
    SLG_NATION_FOUND_FAILURE_NATION_NAME: '青州验收国',
    SLG_NATION_FOUND_FAILURE_COLOR_HEX: '#3f7fbf',
  }

  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.once('error', reject)
    child.stdout?.on('data', (chunk) => appendTail(stdout, String(chunk)))
    child.stderr?.on('data', (chunk) => appendTail(stderr, String(chunk)))
    child.once('exit', (code) => resolve(code ?? -1))
  })

  const summaryPath = join(evidenceDir, 'mainline_visual_smoke_summary.json')
  assert.equal(exitCode, 0, `Godot smoke failed for ${scenario.id}\nstdout=${stdout.join('\n')}\nstderr=${stderr.join('\n')}`)
  assert.ok(existsSync(summaryPath), `Godot smoke summary missing for ${scenario.id}: ${summaryPath}`)
  const summary = JSON.parse(readFileSync(summaryPath, 'utf-8')) as unknown
  const summaryObject = readObject(summary)
  assert.equal(summaryObject.ok, true, `Godot smoke summary should be ok for ${scenario.id}: ${JSON.stringify(summaryObject)}`)
  const godotReport = readObject(summaryObject.godotReport)
  const clickActionResult = readObject(godotReport.clickActionResult)
  assert.equal(clickActionResult.expectedFailureCode, scenario.expectedFailureCode)
  assert.equal(clickActionResult.backendFailureText, scenario.expectedText)
  assert.equal(clickActionResult.backendSubmitReceiptFailureCode, scenario.expectedFailureCode)
  assert.equal(clickActionResult.backendSubmitReceiptRemoteAttempted, true)
  assert.equal(clickActionResult.backendSubmitLabelVisible, true)
  assert.equal(clickActionResult.backendSubmitLabelText, scenario.expectedText)
  assert.equal(clickActionResult.backendSubmitFailureText, scenario.expectedText)
  return {
    evidenceDir,
    screenshot: String(readObject(summaryObject.artifacts).screenshot ?? ''),
  }
}

async function assertDirectBackendFailure(scenario: FoundingFailureScenario) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedNationFoundFailureWorldState(`nation_found_failure_direct_${scenario.id}_world_state`, scenario)
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath(`nation_found_failure_direct_${scenario.id}_session_state`),
  })
  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
    const token = await joinPlayer(baseUrl, scenario.playerName)
    const response = await requestJsonWithHeaders(
      baseUrl,
      '/api/nation/found',
      'POST',
      { Authorization: `Bearer ${token}` },
      {
        factionId: 'player',
        actorCommanderId: OFFICER_COMMANDER_ID,
        nationName: '青州验收国',
        color: '#3f7fbf',
        capitalTileId: seeded.selectedCapital.id,
      },
    )
    assert.equal(response.status, scenario.expectedStatus, `${scenario.id} should produce the expected HTTP status`)
    const payload = readObject(response.data)
    assert.equal(payload.ok, false)
    assert.equal(payload.failureCode, scenario.expectedFailureCode)
  } finally {
    await shutdownChild(child)
  }
}

async function assertGodotSubmitFailure(scenario: FoundingFailureScenario) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const seeded = seedNationFoundFailureWorldState(`nation_found_failure_godot_${scenario.id}_world_state`, scenario)
  const child = spawnBackend(port, tail, {
    WORLD_STATE_PERSIST_PATH: seeded.path,
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath(`nation_found_failure_godot_${scenario.id}_session_state`),
  })
  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)
    return await runGodotVisualSmoke(scenario, baseUrl, seeded.selectedCapital)
  } finally {
    await shutdownChild(child)
  }
}

async function run() {
  const scenarios: FoundingFailureScenario[] = [
    {
      id: 'level_required',
      playerName: 'godot_mvp',
      allianceLevel: 19,
      controlledCommanderyCount: 1,
      expectedFailureCode: 'nation_found_level_required',
      expectedStatus: 409,
      expectedText: '同盟等级不足，达到 20 级后可立国。',
    },
    {
      id: 'commandery_required',
      playerName: 'godot_mvp',
      allianceLevel: 20,
      controlledCommanderyCount: 0,
      expectedFailureCode: 'nation_found_commandery_required',
      expectedStatus: 409,
      expectedText: '还没有占领郡城，占有 1 个郡后可立国。',
    },
    {
      id: 'capital_not_controlled',
      playerName: 'godot_mvp',
      allianceLevel: 20,
      controlledCommanderyCount: 1,
      selectedCapitalOwner: 'enemy',
      expectedFailureCode: 'nation_found_capital_not_controlled',
      expectedStatus: 409,
      expectedText: '都城必须选择己方郡城。',
    },
    {
      id: 'forbidden',
      playerName: '普通成员',
      allianceLevel: 20,
      controlledCommanderyCount: 1,
      expectedFailureCode: 'nation_found_forbidden',
      expectedStatus: 403,
      expectedText: '只有盟主或授权官员可以立国。',
    },
  ]

  const results: unknown[] = []
  for (const scenario of scenarios) {
    await assertDirectBackendFailure(scenario)
    const godot = await assertGodotSubmitFailure(scenario)
    results.push({
      id: scenario.id,
      failureCode: scenario.expectedFailureCode,
      evidenceDir: godot.evidenceDir,
      screenshot: godot.screenshot,
    })
  }

  console.log(JSON.stringify({
    ok: true,
    smoke: 'nation_found_failure_godot_seed_smoke',
    cases: results,
  }, null, 2))
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
