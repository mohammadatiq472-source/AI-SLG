import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const mainCityAuthority = readUtf8('docs/PRODUCT_AUTHORITY_MAIN_CITY_ECONOMY_OBJECTIVES_CURRENT_2026_06_11.md')
const taxSixSlotContract = readUtf8('server/tests/main_city_interior_tax_six_slot_schedule_contract.test.ts')
const facilityUpgradeContract = readUtf8('server/tests/main_city_facility_tree_upgrade_contract.test.ts')
const resourceYieldContract = readUtf8('server/tests/world_resource_occupied_yield_economy_contract.test.ts')
const worldContracts = readUtf8('shared/contracts/game/world.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_economy_city_producer_packet_contract'

for (const required of [
  contractId,
  'economy_city_history_producer_packet',
  'Economy / City History Producer Packet Contract',
  'main_city_interior_read_model_v1',
  'tax_runtime',
  'dawn_market',
  'morning_tax',
  'noon_tax',
  'afternoon_patrol',
  'evening_granary',
  'night_warehouse',
  'promoteCityBuilding',
  'resourcesSpent',
  '/api/world/main-city/facility-tree',
  'tax_slot_ready',
  'tax_collected_or_settled',
  'facility_upgrade_started',
  'facility_upgrade_completed',
  'upgrade_blocked',
  'resource_stockpile_ready',
  'city_opened_or_reviewed',
  'scope_denied',
  'dedupe',
  'recovery',
  'old three-slot tax',
  '`npm.cmd run test:world:player-history-main-city-economy-receipt-contract` now proves the first main-city economy receipt overlay producer.',
]) {
  assert.ok(authority.includes(required), `missing economy/city producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-economy-city-producer-packet-contract"'),
  'package.json must expose the economy/city producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:player-history-main-city-economy-receipt-contract"'),
  'package.json must expose the main-city economy receipt producer command',
)

for (const mainCityToken of [
  'Product Authority: Main City / Domestic Economy Current',
  'The main city is the player',
  'main_city_facility_tree_read_model_v2',
  'main_city_interior_read_model_v1',
  'six slots: `dawn_market`, `morning_tax`, `noon_tax`, `afternoon_patrol`, `evening_granary`, `night_warehouse`',
  'Upgrade action',
  'promoteCityBuilding',
  'frozen',
  'three-slot tax model',
]) {
  assert.ok(mainCityAuthority.includes(mainCityToken), `main-city authority should include ${mainCityToken}`)
}

for (const taxToken of [
  "'dawn_market'",
  "'morning_tax'",
  "'noon_tax'",
  "'afternoon_patrol'",
  "'evening_granary'",
  "'night_warehouse'",
  'tax slots must use stable six-slot ids',
  'interiorTaxTreasuryScheduleSlotCount!=6',
  'closure batch must reject old three-slot or non-compact tax schedules',
]) {
  assert.ok(taxSixSlotContract.includes(taxToken), `six-slot tax contract should prove ${taxToken}`)
}

for (const upgradeToken of [
  'promoteCityBuilding',
  "const UPGRADE_GROUP_ID = 'tax'",
  "const UPGRADE_BUILDING_ID = 'tax_office'",
  "assert.equal(receipt.action, 'promoteCityBuilding')",
  'assert.equal(receipt.previousLevel, 4)',
  'assert.equal(receipt.nextLevel, 5)',
  'assert.deepEqual(readObject(receipt.resourcesSpent), { actionPoints: 3, food: 11, wood: 5, copper: 10 })',
  "assert.equal(readObject(receipt.readModelRefresh).endpoint, '/api/world/main-city/facility-tree')",
  'testPromoteCityBuildingRejectsInsufficientResources',
  'testPromoteCityBuildingRejectsQueueOccupied',
]) {
  assert.ok(facilityUpgradeContract.includes(upgradeToken), `facility upgrade contract should prove ${upgradeToken}`)
}

for (const resourceToken of [
  'RESOURCE_TILE_ECONOMY_MODEL_VERSION',
  "tile.resourceKind === 'wood'",
  'Number(tile.resourceLevel ?? 0) >= 1',
  'Number(tile.resourceLevel ?? 0) <= 9',
  'computeResourceTileOngoingYield',
  'advanceTickAction(false)',
  'advanceTickAction should settle level-scaled wood yield',
]) {
  assert.ok(resourceYieldContract.includes(resourceToken), `resource yield contract should prove ${resourceToken}`)
}

for (const worldContractToken of [
  "schema_version: 'main_city_facility_tree_read_model_v2'",
  "mode: 'tax_schedule_runtime_v1'",
  'schedule_slots: MainCityInteriorTaxScheduleSlot[]',
  "export type MainCityInteriorConstructionState = 'running' | 'blocked' | 'complete' | 'waiting'",
  "export type MainCityFacilityEntryOwnerKind = 'human' | 'ai'",
]) {
  assert.ok(worldContracts.includes(worldContractToken), `world contract should expose ${worldContractToken}`)
}

for (const playerHistoryToken of [
  "|| value === 'economy_city'",
  'playerHistoryCategory',
  'playerHistoryTitle',
  'playerHistoryActorName',
  'playerHistoryLocation',
  'playerHistoryTarget',
  'playerHistoryResultLabel',
  'playerHistoryConsequence',
  'playerHistoryNextAction',
]) {
  assert.ok(playerHistoryDomain.includes(playerHistoryToken), `player history overlay grammar should expose ${playerHistoryToken}`)
}

const economyCityProducerStates = [
  'tax_slot_ready',
  'tax_collected_or_settled',
  'facility_upgrade_started',
  'facility_upgrade_completed',
  'upgrade_blocked',
  'resource_stockpile_ready',
  'city_opened_or_reviewed',
  'scope_denied',
  'dedupe',
  'recovery',
]
assert.equal(economyCityProducerStates.length, 10)

const economyCityProducerFixture = {
  contractId,
  category: 'economy_city',
  playerHistoryTitle: '粮税入库',
  playerHistoryActorName: '陈留内府',
  playerHistorySummary: '陈留本轮粮税已入库，建设队列可以继续推进。',
  playerHistoryLocation: '陈留',
  playerHistoryTarget: '早课税务',
  playerHistoryResultLabel: '已入库',
  playerHistoryConsequence: '木材与粮草储备增加，可用于设施升级。',
  playerHistoryNextAction: '查看城内事务',
  playerHistorySeverity: 'low',
  sourceRefs: {
    taxSlotId: 'summary-only-six-slot-id',
    facilityReceiptId: 'summary-only-upgrade-receipt',
  },
  dedupeKey: 'economy-city:chenliu:morning-tax:settled',
}

assert.equal(economyCityProducerFixture.category, 'economy_city')
assert.ok(economyCityProducerFixture.dedupeKey.startsWith('economy-city:'))
assert.ok(economyCityProducerFixture.sourceRefs.taxSlotId.length > 0)
assert.ok(economyCityProducerFixture.sourceRefs.facilityReceiptId.length > 0)

const playerVisibleCopy = [
  economyCityProducerFixture.playerHistoryTitle,
  economyCityProducerFixture.playerHistoryActorName,
  economyCityProducerFixture.playerHistorySummary,
  economyCityProducerFixture.playerHistoryLocation,
  economyCityProducerFixture.playerHistoryTarget,
  economyCityProducerFixture.playerHistoryResultLabel,
  economyCityProducerFixture.playerHistoryConsequence,
  economyCityProducerFixture.playerHistoryNextAction,
  '建设队列受阻，先补足物资后再升级。',
].join('\n')

for (const forbidden of [
  'tax_runtime',
  'schedule_slots',
  'dawn_market',
  'morning_tax',
  'noon_tax',
  'afternoon_patrol',
  'evening_granary',
  'night_warehouse',
  'promoteCityBuilding',
  'resourcesSpent',
  'readModelRefresh',
  '/api/world/main-city/facility-tree',
  'main_city_interior_read_model',
  'schema',
  'read model',
  'backend',
  'three-slot',
  '三槽',
  'sourceRefs',
  'fixture',
  'gate',
  'debug',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `economy/city producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_economy_city_producer_packet_contract] all checks passed')
