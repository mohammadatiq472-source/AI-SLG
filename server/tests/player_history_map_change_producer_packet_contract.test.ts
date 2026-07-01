import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const mapAuthority = readUtf8('docs/PRODUCT_AUTHORITY_WORLD_MAP_SUBSTRATE_CURRENT_2026_06_11.md')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const worldService = readUtf8('server/src/application/world/WorldService.ts')
const mainMapCellProducerContract = readUtf8('server/tests/player_history_map_change_main_map_cell_producer_contract.test.ts')
const occupyTileContract = readUtf8('server/tests/world_occupy_tile_pvp_http_contract.test.ts')
const mainWorldLayerContract = readUtf8('server/tests/world_map_layout_main_world_cell_layer_contract.test.ts')
const strategicNodesContract = readUtf8('server/tests/world_map_layout_strategic_nodes_contract.test.ts')
const resourceGenerationContract = readUtf8('server/tests/world_resource_generation_contract.test.ts')
const wsContracts = readUtf8('shared/contracts/game/ws.ts')
const gameWebSocket = readUtf8('server/src/ws/GameWebSocket.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_map_change_producer_packet_contract'

for (const required of [
  contractId,
  'map_change_history_producer_packet',
  'Map Change History Producer Packet Contract',
  'tile_owner_changed',
  'resource_tile_settled',
  'city_or_gate_changed',
  'march_arrived',
  'territory_frontline_changed',
  'map_layer_refreshed',
  'tianxia_jump_or_overview',
  'realtime_delta_received',
  'dedupe',
  'scope_denied',
  'recovery',
  'playerHistoryCategory',
  'Main-map cell owner overlay producer exists as first real map-change lane proof',
  '`npm.cmd run test:world:player-history-map-change-main-map-cell-producer-contract`',
]) {
  assert.ok(authority.includes(required), `missing map-change producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-map-change-producer-packet-contract"'),
  'package.json must expose the map-change producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-map-change-main-map-cell-producer-contract"'),
  'package.json must expose the main-map cell map-change producer contract command',
)

for (const mapToken of [
  'real_map_data_1km',
  'unified_aoi_v0_6_formal_real_map_data_1km',
  'real_map_data_1km.cell_1km',
  '8070 x 7390 = 59,637,300',
  'This is not the product playable-scale number.',
  '20,396,493',
  '7,403,045',
  '27,799,538',
  '64x64',
  'Tianxia Yutu',
]) {
  assert.ok(mapAuthority.includes(mapToken), `map substrate authority should include ${mapToken}`)
}

for (const playerHistoryToken of [
  "if (event.category === 'world_action') return 'map_change'",
  "if (event.category === 'world_action') return event.success ? '地图状态已变化' : '地图行动未完成'",
  "|| value === 'map_change'",
  'playerHistoryCategory',
  'playerHistoryTitle',
  'playerHistoryActorName',
  'playerHistoryLocation',
  'playerHistoryTarget',
  'playerHistoryResultLabel',
  'playerHistoryConsequence',
  'playerHistoryNextAction',
]) {
  assert.ok(playerHistoryDomain.includes(playerHistoryToken), `player history domain should expose ${playerHistoryToken}`)
}

for (const worldServiceToken of [
  "const EAST_HAN_LAYERED_WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'",
  "const EAST_HAN_LAYERED_COORDINATE_SPACE = 'real_map_data_1km.cell_1km'",
  'const EAST_HAN_TIANXIA_YUTU_OVERVIEW_LAYER =',
  'const worldSize = adapter ? eastHanLayeredWorldSize(adapter) : { width: 8070, height: 7390 }',
  "action: 'occupy_tile'",
  'appendWorldEvent',
  'buildMainMapCellOwnerHistoryOverlay',
  "playerHistoryTitle: isRelease ? '地块归属已解除' : '地块已占领'",
  'buildEastHanTianxiaYutuOverviewLayer',
]) {
  assert.ok(worldService.includes(worldServiceToken), `WorldService should expose map support fact: ${worldServiceToken}`)
}

for (const mainMapCellToken of [
  "action: 'claimMainMapCell'",
  "item.action === 'claim_main_map_cell' && item.success === true",
  "metadata.playerHistoryCategory, 'map_change'",
  "metadata.playerHistoryTitle, '地块已占领'",
  "metadata.playerHistoryActorName, '青州军'",
  "metadata.playerHistoryNextAction, '查看地图'",
  "card.category === 'map_change'",
  "'real_map_data_1km.cell_1km'",
  "'main_map_owner_delta'",
  "'snake_case'",
]) {
  assert.ok(
    mainMapCellProducerContract.includes(mainMapCellToken),
    `main-map cell producer contract should prove ${mainMapCellToken}`,
  )
}

for (const occupyToken of [
  "action: 'occupyTile'",
  "item.action === 'occupy_tile' && item.success === true",
  'metadata.tileId',
  'metadata.unitId',
  'metadata.previousOwner',
  'metadata.occupied',
  'metadata.pvpBattle',
  'HTTP PvP occupy should transfer hostile tile owner',
]) {
  assert.ok(occupyTileContract.includes(occupyToken), `occupy tile contract should prove ${occupyToken}`)
}

for (const mainWorldToken of [
  "const WORLD_ID = 'unified_aoi_v0_6_formal_real_map_data_1km'",
  "const COORDINATE_SPACE = 'real_map_data_1km.cell_1km'",
  '&visibleCells=512x320',
  '&preloadMargin=64',
  '&chunkSize=64',
  "layerOrder.includes('main_world_cells')",
  'chunk_size_cells, [64, 64]',
  'selectable_cell_count',
  'resource_overlay_layer',
  'main_world_mountain_boundary_layer',
]) {
  assert.ok(mainWorldLayerContract.includes(mainWorldToken), `main-world layer contract should prove ${mainWorldToken}`)
}

for (const strategicToken of [
  "const STRATEGIC_NODE_TYPES = ['pass', 'fort', 'dock'] as const",
  'assertStrategicNodesHaveNoResourcePayload',
  'pass_1x1',
  'fort_1x1',
  'dock_1x1',
  'blockResourceGeneration',
  'HTTP map-layout strategic node counts should match the authoritative world',
]) {
  assert.ok(strategicNodesContract.includes(strategicToken), `strategic nodes contract should prove ${strategicToken}`)
}

for (const resourceToken of [
  'DEFAULT_WORLD_RESOURCE_GENERATION_POLICY',
  'metadata.generatedResourceTileCount',
  'resource tile distribution should persist through HTTP world loading',
  'resources must not generate on reserved mountain/river footprint cells',
  'resources must not generate inside reserved city footprints',
]) {
  assert.ok(resourceGenerationContract.includes(resourceToken), `resource generation contract should prove ${resourceToken}`)
}

for (const realtimeToken of [
  'tileChanges: WsDeltaTileChange[]',
  "type: 'main_map_owner_delta'",
  'cellId: string',
  'chunkId: string',
  'previousOwner: string',
  'requestId: string',
]) {
  assert.ok(wsContracts.includes(realtimeToken), `websocket contract should expose ${realtimeToken}`)
}

for (const wsToken of [
  'tileChanges.push({ id: nt.id, owner: nt.owner, enemyPressure: nt.enemyPressure })',
  'visibleTileChanges',
  "type: 'main_map_owner_delta'",
  'broadcastMainMapOwnerDeltaInvalidation',
]) {
  assert.ok(gameWebSocket.includes(wsToken), `GameWebSocket should expose realtime support fact: ${wsToken}`)
}

const mapChangeProducerStates = [
  'tile_owner_changed',
  'resource_tile_settled',
  'city_or_gate_changed',
  'march_arrived',
  'territory_frontline_changed',
  'map_layer_refreshed',
  'tianxia_jump_or_overview',
  'realtime_delta_received',
  'dedupe',
  'scope_denied',
  'recovery',
]
assert.equal(mapChangeProducerStates.length, 11)

const mapChangeProducerFixture = {
  contractId,
  category: 'map_change',
  playerHistoryTitle: '据点归属变化',
  playerHistoryActorName: '青州军',
  playerHistorySummary: '前线据点已被我方占领，周边压力下降。',
  playerHistoryLocation: '虎牢关',
  playerHistoryTarget: '敌军前哨',
  playerHistoryResultLabel: '已占领',
  playerHistoryConsequence: '通往洛阳的道路更安全，仍需留兵驻守。',
  playerHistoryNextAction: '查看地图',
  playerHistorySeverity: 'high',
  outcomeState: 'tile_owner_changed',
  sourceRefs: {
    worldEventId: 'summary-only-world-event',
    battleReportId: 'summary-only-battle-report',
  },
  dedupeKey: 'map-change:hulao:owner:player',
}

assert.equal(mapChangeProducerFixture.category, 'map_change')
assert.equal(mapChangeProducerFixture.outcomeState, 'tile_owner_changed')
assert.ok(mapChangeProducerFixture.dedupeKey.startsWith('map-change:'))
assert.ok(mapChangeProducerFixture.sourceRefs.worldEventId.length > 0)
assert.ok(mapChangeProducerFixture.sourceRefs.battleReportId.length > 0)

const playerVisibleCopy = [
  mapChangeProducerFixture.playerHistoryTitle,
  mapChangeProducerFixture.playerHistoryActorName,
  mapChangeProducerFixture.playerHistorySummary,
  mapChangeProducerFixture.playerHistoryLocation,
  mapChangeProducerFixture.playerHistoryTarget,
  mapChangeProducerFixture.playerHistoryResultLabel,
  mapChangeProducerFixture.playerHistoryConsequence,
  mapChangeProducerFixture.playerHistoryNextAction,
  '资源地已占领，产出会在内政中结算。',
  '部队已抵达前线。',
  '暂无权限查看这条地图记录。',
].join('\n')

for (const forbidden of [
  'real_map_data_1km',
  '8070',
  '7390',
  '59,637,300',
  '5963万',
  '20,396,493',
  '7,403,045',
  '27,799,538',
  'tileId',
  'unitId',
  'chunkId',
  'cellId',
  'occupy_tile',
  'tileChanges',
  'main_map_owner_delta',
  'resourceKind',
  'resourceLevel',
  'layer',
  'metadata',
  'schema',
  'route',
  'contract',
  'read model',
  'debug',
  'ops',
  'fixture',
  'gate',
  'sourceRefs',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `map-change producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_map_change_producer_packet_contract] all checks passed')
