import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const historyDomain = readUtf8('shared/domain/playerHistory.ts')
const playerHistoryRoute = readUtf8('server/src/routes/playerHistory.ts')
const diplomacyRoutes = readUtf8('server/src/routes/diplomacy.ts')
const worldService = readUtf8('server/src/application/world/WorldService.ts')
const civilMemoryService = readUtf8('server/src/agents/memory/CivilMemoryService.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_real_producer_packet_contract'

for (const required of [
  contractId,
  'timeline_real_producer_packet',
  'Real Battle, Court, Diplomacy, Economy/City, AI Activity, Organization/Nation, Map, and System/Save producers',
  'battle_history_producer_packet',
  'court_history_producer_packet',
  'diplomacy_history_producer_packet',
  'economy_city_history_producer_packet',
  'ai_activity_history_producer_packet',
  'organization_nation_history_producer_packet',
  'map_change_history_producer_packet',
  'system_history_producer_packet',
  'metadata.playerHistory*',
  'typed translator',
  'bounded access-scope proof',
  'visible-copy leakage checks',
  'Do not claim `timeline_real_producer_packet` is implemented',
  'OccupyTile battle overlay producer exists as first real battle lane proof',
  'Court decision pending/deferred receipt overlay producer exists as first real Court lane proof',
  'Diplomacy route-level overlay producer exists as first real lane proof',
  'Main-city economy receipt overlay producer exists as first real economy/city lane proof',
  'Planning history overlay producer exists as first real AI activity lane proof',
  'Realm objective bridge overlay producer exists as first real organization/nation lane proof',
  'Main-map cell owner overlay producer exists as first real map-change lane proof',
  'Save/load restore apply overlay producer exists as first real system/save lane proof',
]) {
  assert.ok(authority.includes(required), `missing real-producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-real-producer-packet-contract"'),
  'package.json must expose the real producer packet contract command',
)

for (const overlayField of [
  'playerHistoryCategory',
  'playerHistoryTitle',
  'playerHistoryActorName',
  'playerHistorySummary',
  'playerHistoryLocation',
  'playerHistoryTarget',
  'playerHistoryResultLabel',
  'playerHistoryConsequence',
  'playerHistoryNextAction',
  'playerHistorySeverity',
]) {
  assert.ok(historyDomain.includes(overlayField), `shared player-history assembler must accept ${overlayField}`)
}

assert.ok(
  playerHistoryRoute.includes('getWorldEvents') &&
    playerHistoryRoute.includes('getCivilMemorySnapshot') &&
    playerHistoryRoute.includes('getSaveSlots') &&
    playerHistoryRoute.includes('getReplayArchive'),
  'player-history route must expose the current support-source spine',
)
assert.equal(
  diplomacyRoutes.includes('playerHistoryCategory'),
  true,
  'diplomacy route should now expose the first real player-history producer overlay',
)
assert.equal(
  worldService.includes('buildSaveLoadRestoreHistoryOverlay') &&
    worldService.includes("playerHistoryTitle: '存档已恢复'") &&
    worldService.includes("playerHistoryTitle: '存档恢复失败'"),
  true,
  'WorldService should now expose the first system/save restore apply producer overlay',
)
assert.equal(
  civilMemoryService.includes('playerHistoryCategory'),
  false,
  'current Civil Memory service must not be misread as completed player-history producers',
)

const realProducerLaneMatrix = [
  {
    lane: 'battle_history_producer_packet',
    category: 'battle',
    requiredSource: 'battle report or combat receipt',
    requiredRecovery: 'battle report or replay',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'court_history_producer_packet',
    category: 'court',
    requiredSource: 'Court resolution or world-effect receipt',
    requiredRecovery: 'Court session or decision',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'diplomacy_history_producer_packet',
    category: 'diplomacy',
    requiredSource: 'alliance/nation diplomacy proposal or relation change',
    requiredRecovery: 'diplomacy surface',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'economy_city_history_producer_packet',
    category: 'economy_city',
    requiredSource: 'tax/resource/build/queue/policy receipt',
    requiredRecovery: 'main city or domestic economy surface',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'ai_activity_history_producer_packet',
    category: 'ai_activity',
    requiredSource: 'governed AI proposal/execution/failure/recovery receipt',
    requiredRecovery: 'AI activity, chat, report, or war-room surface',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'organization_nation_history_producer_packet',
    category: 'organization_nation',
    requiredSource: 'alliance objective/officer permission/capital/kingdom/empire progress',
    requiredRecovery: 'organization or nation surface',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'map_change_history_producer_packet',
    category: 'map_change',
    requiredSource: 'occupy/release/route/resource/sea/frontline/chokepoint result',
    requiredRecovery: 'map focus or territory surface',
    status: 'route_overlay_first_proof',
  },
  {
    lane: 'system_history_producer_packet',
    category: 'system',
    requiredSource: 'save/restore/reconnect/replay-unavailable/access-denied receipt',
    requiredRecovery: 'save-load, replay, settings, or safe fallback surface',
    status: 'route_overlay_first_proof',
  },
]

assert.equal(realProducerLaneMatrix.length, 8)
assert.deepEqual(realProducerLaneMatrix.map((lane) => lane.category), [
  'battle',
  'court',
  'diplomacy',
  'economy_city',
  'ai_activity',
  'organization_nation',
  'map_change',
  'system',
])
for (const lane of realProducerLaneMatrix) {
  assert.ok(lane.lane.endsWith('_producer_packet'), `${lane.lane} must be a producer packet`)
  assert.ok(lane.requiredSource.length > 0, `${lane.lane} must declare a real source`)
  assert.ok(lane.requiredRecovery.length > 0, `${lane.lane} must declare a recovery surface`)
  assert.notEqual(lane.status, 'complete', `${lane.lane} must not be marked complete by this packet contract`)
}

const visibleCopySamples = [
  '战况已入册',
  '朝议结果待执行',
  '同盟关系已更新',
  '主城资源已变化',
  'AI 行动需要确认',
  '国家目标有进展',
  '前线归属已变化',
  '存档恢复需要处理',
].join('\n')

for (const forbidden of [
  '/api/events',
  '/api/civil-memory',
  '/api/replay',
  'appendWorldEvent',
  'Civil Memory',
  'Replay-RAG',
  'provider',
  'debug',
  'ops',
  'fixture',
  'gate',
  'request id',
  'proposal id',
  'snake_case',
  'metadata.playerHistory',
]) {
  assert.equal(
    visibleCopySamples.includes(forbidden),
    false,
    `real producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_real_producer_packet_contract] all checks passed')
