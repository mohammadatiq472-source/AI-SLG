import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const apiClient = readFileSync('godot-client/scripts/infra/http/backend_api_client.gd', 'utf-8')
const adapter = readFileSync('godot-client/scripts/app/adapters/slg_domain_action_adapter.gd', 'utf-8')
const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.match(
  apiClient,
  /func get_nation_war_objectives\(faction_id: String/,
  'Godot API client must expose the nation_war_objective_read_model_v1 route.',
)
assert.match(
  apiClient,
  /\/api\/nation\/war-objectives\?factionId=/,
  'Godot API client must call /api/nation/war-objectives.',
)
assert.match(
  adapter,
  /get_nation_war_objectives/,
  'Empire upgrade adapter must refresh nation war objectives after successful upgrade.',
)
assert.match(
  adapter,
  /nation_war_objectives_result/,
  'Empire upgrade adapter must return the refreshed nation war objective result.',
)
assert.match(
  alliancePanel,
  /organizationNationWarObjectiveContractId/,
  'Alliance panel summary must expose the nation war objective contract id.',
)
assert.match(
  alliancePanel,
  /organizationNationEmpireObjectiveStatus/,
  'Alliance panel summary must expose empire objective status.',
)
assert.match(
  alliancePanel,
  /organizationNationEmpireObjectiveAchieved/,
  'Alliance panel summary must expose whether empire_status is achieved.',
)
assert.match(
  main,
  /organizationNationEmpireSuccessStateVerified/,
  'Mainline visual smoke click action must verify the empire success state.',
)
assert.match(
  main,
  /nation_war_objective_read_model_v1/,
  'Mainline visual smoke click action must require nation_war_objective_read_model_v1.',
)
assert.match(
  main,
  /empire_status/,
  'Mainline visual smoke click action must require empire_status.',
)
assert.match(
  main,
  /world_open_main_city_organization_nation_empire_submit_success/,
  'Mainline visual smoke must expose a dedicated empire success-state click action.',
)
assert.match(
  smokeRunner,
  /world_open_main_city_organization_nation_empire_submit_success/,
  'Visual smoke runner must whitelist the dedicated empire success-state click action.',
)
assert.match(
  smokeRunner,
  /seedNationEmpireSuccessFixture/,
  'Visual smoke runner must seed an empire-ready kingdom through the formal world action route.',
)
assert.match(
  smokeRunner,
  /seed_ai_governor_player_id": "验收官员"/,
  'Empire success-state smoke must run with the officer player authority grant.',
)

console.log('[godot_nation_empire_success_state_contract] all checks passed')
