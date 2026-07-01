import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const radar = read('docs/PLAYER_HISTORY_PRODUCER_COVERAGE_RADAR_CURRENT_2026_06_13.md')
const authority = read('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const index = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const handoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const packageJson = read('package.json')

for (const required of [
  '# Player History Producer Coverage Radar Current (2026-06-13)',
  'battle',
  'court',
  'diplomacy',
  'economy_city',
  'ai_activity',
  'organization_nation',
  'map_change',
  'system',
  'Civil Memory',
  'AI player / AI switch status',
  'world_ai_switch_open_home_city',
  'ai_panel_home_city_bind_open_chain',
  'request_ai_player_runtime_refresh',
  'asAiPlayerId',
  'Next priority split',
]) {
  assert.ok(radar.includes(required), `coverage radar must include ${required}`)
}

for (const command of [
  'npm.cmd run test:world:player-history-private-organization-nation-shareability-contract',
  'npm.cmd run test:world:player-history-civil-memory-detail-access-shareability-boundary-contract',
  'npm.cmd run test:world:player-history-producer-coverage-radar-contract',
]) {
  assert.ok(packageJson.includes(command.split(' ')[2]), `package.json should expose ${command}`)
  assert.ok(radar.includes(command), `coverage radar should record ${command}`)
}

assert.ok(
  authority.includes('Stage 575 producer coverage radar') &&
    index.includes('Stage 575 update: player-history producer coverage radar') &&
    handoff.includes('Stage 575 - player-history producer coverage radar'),
  'authority, index, and CURRENT handoff must record Stage 575 radar',
)

console.log('[player_history_producer_coverage_radar_contract] all checks passed')
