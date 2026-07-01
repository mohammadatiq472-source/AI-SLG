import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createInitialWorldState } from '../../shared/domain/scenario'
import { buildCurrentGoalsReadModel } from '../../shared/domain/worldTasks'

const backendApiClientSource = readFileSync('godot-client/scripts/infra/http/backend_api_client.gd', 'utf-8')
const mainSource = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const visualSmokeSource = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

function seedEmpireWorld() {
  const world = createInitialWorldState()
  const faction = world.factions.player
  assert.ok(faction, 'seed world should expose player faction')
  faction.organizationId = 'player'
  faction.organizationKind = 'nation'
  faction.organizationName = '齐国'
  faction.nationName = '齐国'
  faction.nationTier = 'empire'
  faction.nationCapitalTileId = 'tile_08'
  faction.nationCapitalName = '青石城'
  return world
}

const currentGoals = buildCurrentGoalsReadModel(seedEmpireWorld(), 'player')
const allGoals = currentGoals.layers.flatMap((layer) => layer.goals.map((goal) => ({ layerId: layer.layerId, ...goal })))
const empireGoal = allGoals.find((goal) => goal.goalId === 'empire:upgrade-and-command')
const unificationGoal = allGoals.find((goal) => goal.goalId === 'unification:east-han-thirteen-states')

assert.ok(empireGoal, 'currentGoals must expose the empire goal')
assert.ok(unificationGoal, 'currentGoals must expose the East Han unification goal')
assert.equal(empireGoal?.actionTarget?.kind, 'panel', 'empire goal should open a panel entry')
assert.equal(
  empireGoal?.actionTarget?.id,
  'nation_midgame_frontend',
  'empire goal should target the W15 nation midgame frontend skeleton',
)
assert.equal(unificationGoal?.actionTarget?.kind, 'panel', 'unification goal should open a panel entry')
assert.equal(
  unificationGoal?.actionTarget?.id,
  'nation_midgame_frontend',
  'unification goal should target the same W15 nation midgame frontend skeleton',
)
assert.match(
  `${empireGoal?.nextStep ?? ''}\n${unificationGoal?.nextStep ?? ''}`,
  /国家中局|同盟|王国|帝国|十三州/,
  'currentGoals next-step copy should name the SLG nation midgame path, not a generic quest',
)

assert.ok(
  backendApiClientSource.includes('func get_current_goals(') &&
    backendApiClientSource.includes('/api/world?currentGoals=true'),
  'BackendApiClient must expose a currentGoals read-model helper for Godot.',
)
assert.ok(
  mainSource.includes('"world_open_main_world_current_goals_nation_midgame_entry"') &&
    mainSource.includes('func _press_mainline_visual_smoke_current_goals_nation_midgame_entry(') &&
    mainSource.includes('nation_midgame_frontend') &&
    mainSource.includes('_press_mainline_visual_smoke_nation_midgame_frontend()'),
  'main.gd must expose a formal main-world/currentGoals smoke action that follows the W15 target.',
)
assert.ok(
  visualSmokeSource.includes('"world_open_main_world_current_goals_nation_midgame_entry"') &&
    visualSmokeSource.includes('seedNationMidgameFrontendFixture'),
  'run_mainline_visual_smoke.py must whitelist and seed the currentGoals -> W15 smoke action.',
)

console.log('[godot_current_goals_nation_midgame_entry_contract] all checks passed')
