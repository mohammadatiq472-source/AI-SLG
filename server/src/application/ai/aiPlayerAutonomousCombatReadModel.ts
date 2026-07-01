import type {
  AiPlayerActionType,
  GovernedAiPlayerRuntimeDetail,
} from '../../../../shared/contracts/aiPlayer'
import type { Tile, Unit, WorldState } from '../../../../shared/contracts/game/world'
import { getWorldStateReadonly } from '../world/WorldService'
import { buildAiPlayerBattleReportReadModel } from './aiPlayerBattleReportReadModel'

type CombatUnitReadModel = Pick<Unit, 'id' | 'name' | 'tileId' | 'status' | 'strength' | 'mobility' | 'supply'> & {
  heroName: string
}

type CombatEnemyTargetReadModel = Pick<Tile, 'name' | 'type' | 'owner' | 'enemyPressure'> & {
  tileId: string
  unitId: string
  distance: 0 | 1
  defenderUnitIds: string[]
  defenderStrength: number
  risk: 'low' | 'medium' | 'high'
  canOccupyNow: boolean
  suggestedAction: Extract<AiPlayerActionType, 'tile_occupy' | 'march_move' | 'world_scout' | 'garrison_set'>
}

type CombatOwnTileThreatReadModel = Pick<Tile, 'name' | 'type' | 'owner' | 'enemyPressure'> & {
  tileId: string
  unitIds: string[]
  suggestedAction: Extract<AiPlayerActionType, 'garrison_set'>
}

type CombatRecommendedAction = {
  action: Extract<AiPlayerActionType, 'troop_heal' | 'troop_train' | 'tile_occupy' | 'city_siege' | 'march_move' | 'world_scout' | 'garrison_set' | 'alliance_help' | 'rally_launch' | 'rally_join'>
  args: Record<string, unknown>
  priority: number
  playerFacingReason: string
}

type CombatWarObjectiveReadModel = {
  kind: 'siege' | 'alliance_rally' | 'cross_player_target'
  targetTileId?: string
  regionId?: string
  owner?: string
  targetName: string
  suggestedAction: Extract<AiPlayerActionType, 'world_scout' | 'march_move' | 'city_siege' | 'alliance_help' | 'rally_launch' | 'rally_join'>
  priority: number
  playerFacingSummary: string
}

type CombatBattleDigestHotspot = {
  hotspotId: string
  coordinateSpace: 'world_tile_grid'
  center: { x: number; y: number } | null
  chunk: { x: number; y: number; size: number } | null
  regionId?: string
  targetTileIds: string[]
  targetLabels: string[]
  reportCount: number
  highSeverityCount: number
  winCount: number
  lossCount: number
  drawCount: number
  attackerFactionIds: string[]
  latestTick: number
  playerFacingSummary: string
}

type CombatBattleDigest = {
  schemaVersion: 'ai_combat_battle_digest_v1'
  coordinateSpace: 'world_tile_grid'
  source: 'retained_recent_battle_records'
  retainedBattleRecordCount: number
  relevantBattleReportCount: number
  visibleBattleReportCount: number
  omittedRelevantReportCount: number
  coordinateCoverage: {
    totalRelevantReportCount: number
    directCoordinateCount: number
    tileBackfilledCoordinateCount: number
    missingCoordinateCount: number
    coverageRateBps: number
  }
  highSeverityCount: number
  winCount: number
  lossCount: number
  drawCount: number
  latestTick: number
  targetHotspots: CombatBattleDigestHotspot[]
  ownThreatHotspots: CombatBattleDigestHotspot[]
  playerFacingSummary: string
}

export type AiPlayerAutonomousCombatObservation = {
  aiPlayerId: string
  factionId: string
  governorPlayerId: string
  tick: number
  worldVersion: number
  generatedAt: string
  ownUnits: CombatUnitReadModel[]
  battleReports: ReturnType<typeof buildAiPlayerBattleReportReadModel>['items']
  battleDigest: CombatBattleDigest
  ownTileThreats: CombatOwnTileThreatReadModel[]
  enemyTargets: CombatEnemyTargetReadModel[]
  warObjectives: CombatWarObjectiveReadModel[]
  recommendedActions: CombatRecommendedAction[]
  constraints: {
    executorAuthority: 'backend_only'
    readOnlyObservation: true
    normalPlayerSurface: 'natural_language_reports_only'
  }
}

function nowIso() {
  return new Date().toISOString()
}

function buildTargetTileIndex(world: WorldState, tileIds: ReadonlySet<string>) {
  const result = new Map<string, Tile>()
  if (tileIds.size === 0) {
    return result
  }
  for (const tile of world.map.tiles) {
    if (tileIds.has(tile.id)) {
      result.set(tile.id, tile)
      if (result.size >= tileIds.size) {
        break
      }
    }
  }
  return result
}

function normalizeCoordinate(value: unknown): number | null {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return null
  }
  return Math.trunc(numeric)
}

function resolveReportCoordinates(
  report: ReturnType<typeof buildAiPlayerBattleReportReadModel>['items'][number],
  tile: Tile | undefined,
) {
  const x = normalizeCoordinate(report.tileX) ?? normalizeCoordinate(tile?.x)
  const y = normalizeCoordinate(report.tileY) ?? normalizeCoordinate(tile?.y)
  return x === null || y === null ? null : { x, y }
}

function classifyReportCoordinateSource(
  report: ReturnType<typeof buildAiPlayerBattleReportReadModel>['items'][number],
  tile: Tile | undefined,
) {
  const hasDirectCoordinate = normalizeCoordinate(report.tileX) !== null && normalizeCoordinate(report.tileY) !== null
  if (hasDirectCoordinate) {
    return 'direct' as const
  }
  if (normalizeCoordinate(tile?.x) !== null && normalizeCoordinate(tile?.y) !== null) {
    return 'tile_backfilled' as const
  }
  return 'missing' as const
}

function buildChunkForCoordinate(coord: { x: number; y: number } | null, chunkSize = 64) {
  if (!coord) {
    return null
  }
  return {
    x: Math.floor(coord.x / chunkSize),
    y: Math.floor(coord.y / chunkSize),
    size: chunkSize,
  }
}

function formatPlayerFacingLocation(input: {
  tile?: Tile
  tileId?: string
  regionId?: string
  center?: { x: number; y: number } | null
}) {
  const tileName = formatPlayerFacingTileName(input.tile)
  const regionId = String(input.regionId ?? '').trim()
  const coord = input.center ? `坐标(${input.center.x},${input.center.y})` : ''
  if (tileName !== '' && coord !== '') {
    return `${tileName}${coord}附近`
  }
  if (coord !== '') {
    return `${coord}附近`
  }
  if (regionId !== '') {
    return `${regionId}附近`
  }
  return String(input.tileId ?? '').trim() || '未标记坐标目标'
}

function formatPlayerFacingTileName(tile?: Tile) {
  const tileName = String(tile?.name ?? '').trim()
  if (!tile) {
    return ''
  }
  if (/resource/i.test(tileName)) {
    return '资源点'
  }
  return tileName
}

function buildBattleDigestHotspotSummary(input: {
  location: string
  reportCount: number
  highSeverityCount: number
  winCount: number
  lossCount: number
  drawCount: number
  targetLabels: string[]
}) {
  const targetText = input.targetLabels.slice(0, 3).join('、') || '这一片目标'
  return `热点：${input.location}近期有${input.reportCount}条相关战报，其中高压${input.highSeverityCount}条，胜${input.winCount}、负${input.lossCount}、平${input.drawCount}；我会先盯${targetText}。`
}

function buildAiPlayerAutonomousCombatBattleDigest(params: {
  world: WorldState
  runtime: GovernedAiPlayerRuntimeDetail
  visibleBattleReports: ReturnType<typeof buildAiPlayerBattleReportReadModel>['items']
  ownTileThreats: CombatOwnTileThreatReadModel[]
}) {
  const retainedReports = [...params.world.feedback.battleRecords].sort((left, right) => right.tick - left.tick || right.id.localeCompare(left.id))
  const relevantReports = retainedReports.filter((report) => (
    report.attackerFaction === params.runtime.factionId
    || report.ownerFactionId === params.runtime.factionId
    || report.aiPlayerId === params.runtime.aiPlayerId
    || report.attackerAiPlayerId === params.runtime.aiPlayerId
    || report.defenderAiPlayerId === params.runtime.aiPlayerId
    || params.visibleBattleReports.some((visible) => visible.reportId === report.id)
  ))
  const targetTileIds = new Set<string>()
  for (const report of relevantReports) {
    if (String(report.tileId ?? '').trim() !== '') {
      targetTileIds.add(report.tileId)
    }
  }
  for (const threat of params.ownTileThreats) {
    targetTileIds.add(threat.tileId)
  }
  const tileIndex = buildTargetTileIndex(params.world, targetTileIds)
  const visibleIds = new Set(params.visibleBattleReports.map((report) => report.reportId))
  const reportSeverity = new Map(params.visibleBattleReports.map((report) => [report.reportId, report.severity] as const))
  const hotspotById = new Map<string, {
    id: string
    coords: Array<{ x: number; y: number }>
    regionId?: string
    targetTileIds: Set<string>
    targetLabels: Set<string>
    reportCount: number
    highSeverityCount: number
    winCount: number
    lossCount: number
    drawCount: number
    attackerFactionIds: Set<string>
    latestTick: number
  }>()
  const ensureHotspot = (id: string, regionId?: string) => {
    const existing = hotspotById.get(id)
    if (existing) {
      return existing
    }
    const created = {
      id,
      coords: [] as Array<{ x: number; y: number }>,
      regionId,
      targetTileIds: new Set<string>(),
      targetLabels: new Set<string>(),
      reportCount: 0,
      highSeverityCount: 0,
      winCount: 0,
      lossCount: 0,
      drawCount: 0,
      attackerFactionIds: new Set<string>(),
      latestTick: 0,
    }
    hotspotById.set(id, created)
    return created
  }

  let highSeverityCount = 0
  let winCount = 0
  let lossCount = 0
  let drawCount = 0
  let latestTick = 0
  let directCoordinateCount = 0
  let tileBackfilledCoordinateCount = 0
  let missingCoordinateCount = 0
  for (const report of relevantReports) {
    const tile = tileIndex.get(report.tileId)
    const center = resolveReportCoordinates(report as ReturnType<typeof buildAiPlayerBattleReportReadModel>['items'][number], tile)
    const coordinateSource = classifyReportCoordinateSource(report as ReturnType<typeof buildAiPlayerBattleReportReadModel>['items'][number], tile)
    if (coordinateSource === 'direct') {
      directCoordinateCount += 1
    } else if (coordinateSource === 'tile_backfilled') {
      tileBackfilledCoordinateCount += 1
    } else {
      missingCoordinateCount += 1
    }
    const chunk = buildChunkForCoordinate(center)
    const regionId = String(report.regionId ?? '').trim() || undefined
    const hotspotId = chunk ? `chunk:${chunk.x}:${chunk.y}` : regionId ? `region:${regionId}` : `tile:${report.tileId}`
    const hotspot = ensureHotspot(hotspotId, regionId)
    if (center) {
      hotspot.coords.push(center)
    }
    hotspot.targetTileIds.add(report.tileId)
    hotspot.targetLabels.add(formatPlayerFacingLocation({ tile, tileId: report.tileId, regionId, center }))
    hotspot.reportCount += 1
    const severity = reportSeverity.get(report.id)
    const high = severity === 'high' || report.outcome === 'loss' || report.attackerLoss >= Math.max(40, report.defenderLoss)
    if (high) {
      hotspot.highSeverityCount += 1
      highSeverityCount += 1
    }
    if (report.outcome === 'win') {
      hotspot.winCount += 1
      winCount += 1
    } else if (report.outcome === 'loss') {
      hotspot.lossCount += 1
      lossCount += 1
    } else {
      hotspot.drawCount += 1
      drawCount += 1
    }
    if (String(report.attackerFaction ?? '').trim() !== '') {
      hotspot.attackerFactionIds.add(report.attackerFaction)
    }
    hotspot.latestTick = Math.max(hotspot.latestTick, report.tick)
    latestTick = Math.max(latestTick, report.tick)
    void visibleIds
  }

  const toReadModel = (hotspot: ReturnType<typeof ensureHotspot>): CombatBattleDigestHotspot => {
    const center = hotspot.coords.length > 0
      ? {
          x: Math.round(hotspot.coords.reduce((sum, coord) => sum + coord.x, 0) / hotspot.coords.length),
          y: Math.round(hotspot.coords.reduce((sum, coord) => sum + coord.y, 0) / hotspot.coords.length),
        }
      : null
    const chunk = buildChunkForCoordinate(center)
    const targetLabels = [...hotspot.targetLabels].slice(0, 5)
    const location = formatPlayerFacingLocation({
      tileId: [...hotspot.targetTileIds][0],
      regionId: hotspot.regionId,
      center,
    })
    return {
      hotspotId: hotspot.id,
      coordinateSpace: 'world_tile_grid',
      center,
      chunk,
      regionId: hotspot.regionId,
      targetTileIds: [...hotspot.targetTileIds].slice(0, 8),
      targetLabels,
      reportCount: hotspot.reportCount,
      highSeverityCount: hotspot.highSeverityCount,
      winCount: hotspot.winCount,
      lossCount: hotspot.lossCount,
      drawCount: hotspot.drawCount,
      attackerFactionIds: [...hotspot.attackerFactionIds].slice(0, 8),
      latestTick: hotspot.latestTick,
      playerFacingSummary: buildBattleDigestHotspotSummary({
        location,
        reportCount: hotspot.reportCount,
        highSeverityCount: hotspot.highSeverityCount,
        winCount: hotspot.winCount,
        lossCount: hotspot.lossCount,
        drawCount: hotspot.drawCount,
        targetLabels,
      }),
    }
  }
  const targetHotspots = [...hotspotById.values()]
    .sort((left, right) => right.highSeverityCount - left.highSeverityCount || right.reportCount - left.reportCount || right.latestTick - left.latestTick || left.id.localeCompare(right.id))
    .slice(0, 6)
    .map(toReadModel)
  const ownThreatHotspots = params.ownTileThreats.slice(0, 4).map((threat) => {
    const tile = tileIndex.get(threat.tileId)
    const center = tile ? { x: tile.x, y: tile.y } : null
    const chunk = buildChunkForCoordinate(center)
    const label = formatPlayerFacingLocation({ tile, tileId: threat.tileId, center })
    return {
      hotspotId: chunk ? `own-threat:${chunk.x}:${chunk.y}` : `own-threat:${threat.tileId}`,
      coordinateSpace: 'world_tile_grid' as const,
      center,
      chunk,
      targetTileIds: [threat.tileId],
      targetLabels: [label],
      reportCount: 0,
      highSeverityCount: threat.enemyPressure >= 4 ? 1 : 0,
      winCount: 0,
      lossCount: 0,
      drawCount: 0,
      attackerFactionIds: [],
      latestTick: params.world.tick,
      playerFacingSummary: `己方压力点：${label}敌压${threat.enemyPressure}，我会优先看驻防和补给，不按固定战线猜。`,
    }
  })
  const primary = targetHotspots[0]
  const playerFacingSummary = relevantReports.length > 0
    ? `我看了一批战报，共${relevantReports.length}条；不逐条刷屏，只挑${targetHotspots.length}个坐标热点说给你听。${primary?.playerFacingSummary ?? ''}`
    : `我暂时没看到成批相关战报，会继续按坐标热点和己方压力点观察。`
  return {
    schemaVersion: 'ai_combat_battle_digest_v1' as const,
    coordinateSpace: 'world_tile_grid' as const,
    source: 'retained_recent_battle_records' as const,
    retainedBattleRecordCount: retainedReports.length,
    relevantBattleReportCount: relevantReports.length,
    visibleBattleReportCount: params.visibleBattleReports.length,
    omittedRelevantReportCount: Math.max(0, relevantReports.length - params.visibleBattleReports.length),
    coordinateCoverage: {
      totalRelevantReportCount: relevantReports.length,
      directCoordinateCount,
      tileBackfilledCoordinateCount,
      missingCoordinateCount,
      coverageRateBps: relevantReports.length > 0
        ? Math.round(((directCoordinateCount + tileBackfilledCoordinateCount) / relevantReports.length) * 10_000)
        : 10_000,
    },
    highSeverityCount,
    winCount,
    lossCount,
    drawCount,
    latestTick,
    targetHotspots,
    ownThreatHotspots,
    playerFacingSummary,
  }
}

function selectAssignedUnits(world: WorldState, runtime: GovernedAiPlayerRuntimeDetail) {
  const faction = world.factions[runtime.factionId]
  const assignedUnitIds = new Set(
    (faction?.aiPlayers ?? [])
      .find((player) => player.id === runtime.aiPlayerId)
      ?.unitIds ?? [],
  )
  return world.units.filter((unit) => assignedUnitIds.has(unit.id) || unit.aiPlayerId === runtime.aiPlayerId)
}

function resolveRisk(enemyPressure: number, defenderStrength: number, ownStrength: number): CombatEnemyTargetReadModel['risk'] {
  if (enemyPressure >= 4 || defenderStrength > ownStrength * 0.8) {
    return 'high'
  }
  if (enemyPressure >= 2 || defenderStrength > ownStrength * 0.45) {
    return 'medium'
  }
  return 'low'
}

function buildEnemyTargets(world: WorldState, runtime: GovernedAiPlayerRuntimeDetail, units: Unit[]) {
  const targets = new Map<string, CombatEnemyTargetReadModel>()
  for (const unit of units) {
    const candidateTileIds = [unit.tileId, ...(world.map.connections[unit.tileId] ?? [])]
    for (const tileId of candidateTileIds) {
      const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
      if (!tile || tile.owner === runtime.factionId || tile.owner === 'neutral') {
        continue
      }
      const distance = tile.id === unit.tileId ? 0 : 1
      const defenders = world.units.filter((candidate) => (
        candidate.faction !== runtime.factionId
        && candidate.tileId === tile.id
      ))
      const defenderStrength = defenders.reduce((sum, defender) => sum + Math.max(0, defender.strength), 0)
      const risk = resolveRisk(tile.enemyPressure, defenderStrength, unit.strength)
      const current = targets.get(tile.id)
      const next: CombatEnemyTargetReadModel = {
        tileId: tile.id,
        unitId: unit.id,
        name: tile.name,
        type: tile.type,
        owner: tile.owner,
        enemyPressure: tile.enemyPressure,
        distance,
        defenderUnitIds: defenders.map((defender) => defender.id),
        defenderStrength,
        risk,
        canOccupyNow: distance === 0 && unit.strength >= 60 && unit.supply >= 3,
        suggestedAction: distance === 0
          ? 'tile_occupy'
          : risk === 'high'
            ? 'world_scout'
            : 'march_move',
      }
      if (!current || next.distance < current.distance || next.defenderStrength < current.defenderStrength) {
        targets.set(tile.id, next)
      }
    }
  }
  return [...targets.values()].sort((left, right) => (
    left.distance - right.distance
    || left.defenderStrength - right.defenderStrength
    || right.enemyPressure - left.enemyPressure
    || left.tileId.localeCompare(right.tileId)
  )).slice(0, 8)
}

function buildOwnTileThreats(world: WorldState, runtime: GovernedAiPlayerRuntimeDetail, units: Unit[]) {
  const byTile = new Map<string, CombatOwnTileThreatReadModel>()
  for (const unit of units) {
    const tile = world.map.tiles.find((candidate) => candidate.id === unit.tileId)
    if (!tile || tile.owner !== runtime.factionId || tile.enemyPressure < 3) {
      continue
    }
    const current = byTile.get(tile.id)
    if (current) {
      current.unitIds.push(unit.id)
      continue
    }
    byTile.set(tile.id, {
      tileId: tile.id,
      name: tile.name,
      type: tile.type,
      owner: tile.owner,
      enemyPressure: tile.enemyPressure,
      unitIds: [unit.id],
      suggestedAction: 'garrison_set',
    })
  }
  return [...byTile.values()].sort((left, right) => (
    right.enemyPressure - left.enemyPressure
    || left.tileId.localeCompare(right.tileId)
  )).slice(0, 8)
}

function isOtherPlayerOwner(owner: string | undefined, factionId: string) {
  const normalized = String(owner ?? '').trim()
  return normalized !== ''
    && normalized !== factionId
    && normalized !== 'neutral'
    && normalized !== 'enemy'
    && normalized !== 'system_guard'
}

function buildWarObjectives(world: WorldState, runtime: GovernedAiPlayerRuntimeDetail, units: Unit[]) {
  const objectives: CombatWarObjectiveReadModel[] = []
  const reachableTileIds = new Set<string>()
  for (const unit of units) {
    reachableTileIds.add(unit.tileId)
    for (const tileId of world.map.connections[unit.tileId] ?? []) {
      reachableTileIds.add(tileId)
    }
  }
  for (const tileId of reachableTileIds) {
    const tile = world.map.tiles.find((candidate) => candidate.id === tileId)
    if (!tile || tile.owner === runtime.factionId || tile.owner === 'neutral') {
      continue
    }
    if (tile.type === 'city') {
      objectives.push({
        kind: 'siege',
        targetTileId: tile.id,
        owner: tile.owner,
        targetName: tile.name,
        suggestedAction: 'city_siege',
        priority: 88,
        playerFacingSummary: `发现敌城${tile.name}，纳入攻城目标，由后端攻城权限处理耐久、守军和战报。`,
      })
      continue
    }
    if (isOtherPlayerOwner(tile.owner, runtime.factionId)) {
      objectives.push({
        kind: 'cross_player_target',
        targetTileId: tile.id,
        owner: tile.owner,
        targetName: tile.name,
        suggestedAction: tile.enemyPressure >= 3 ? 'world_scout' : 'march_move',
        priority: 72,
        playerFacingSummary: `发现对手玩家前沿${tile.name}，先作为跨玩家目标评估，避免误打盟友或无主地。`,
      })
    }
  }
  for (const directive of Object.values(world.alliance.directives ?? {})) {
    if (!directive || (directive.stance !== 'support' && directive.stance !== 'expand')) {
      continue
    }
    objectives.push({
      kind: 'alliance_rally',
      regionId: directive.regionId,
      targetName: directive.regionId,
      suggestedAction: 'rally_launch',
      priority: Math.max(60, Math.min(95, 60 + Math.trunc((directive.supportLevel ?? 0) / 2))),
      playerFacingSummary: `同盟在${directive.regionId}有进攻集结需求，我会优先响应协同，并继续盯集结结果。`,
    })
  }
  return objectives.sort((left, right) => (
    right.priority - left.priority
    || left.kind.localeCompare(right.kind)
    || String(left.targetTileId ?? left.regionId ?? '').localeCompare(String(right.targetTileId ?? right.regionId ?? ''))
  )).slice(0, 8)
}

function buildRecommendedActions(
  units: Unit[],
  battleReports: ReturnType<typeof buildAiPlayerBattleReportReadModel>['items'],
  ownTileThreats: CombatOwnTileThreatReadModel[],
  enemyTargets: CombatEnemyTargetReadModel[],
  warObjectives: CombatWarObjectiveReadModel[],
): CombatRecommendedAction[] {
  const actions: CombatRecommendedAction[] = []
  const weakestUnit = [...units].sort((left, right) => (
    left.strength - right.strength
    || left.supply - right.supply
    || left.id.localeCompare(right.id)
  ))[0]
  const latestSeriousReport = battleReports.find((report) => (
    report.outcome === 'loss'
    || report.severity === 'high'
  ))
  const currentUnitNeedsRecovery = Boolean(weakestUnit && (
    weakestUnit.strength < 60
    || weakestUnit.supply < 3
    || (latestSeriousReport && (weakestUnit.strength < 80 || weakestUnit.supply < 5))
  ))
  if (weakestUnit && currentUnitNeedsRecovery) {
    actions.push({
      action: 'troop_heal',
      args: { unitId: weakestUnit.id },
      priority: 100,
      playerFacingReason: '刚有高损战报或部队补给偏低，先整补，避免继续硬打。',
    })
  }

  if (weakestUnit && latestSeriousReport && !currentUnitNeedsRecovery) {
    actions.push({
      action: 'troop_train',
      args: {},
      priority: 90,
      playerFacingReason: '最近有高损战报，当前主力已稳，补一支预备队提高容错。',
    })
  }

  const ownTileThreat = ownTileThreats[0]
  if (ownTileThreat) {
    const garrisonUnitId = ownTileThreat.unitIds[0]
    actions.push({
      action: 'garrison_set',
      args: {
        unitId: garrisonUnitId,
        targetTileId: ownTileThreat.tileId,
        summary: '己方地块敌压升高，先驻防稳住。',
      },
      priority: 85,
      playerFacingReason: '己方地块敌压升高，先驻防，不把部队盲目推走。',
    })
  }

  const allianceRally = warObjectives.find((objective) => objective.kind === 'alliance_rally' && objective.regionId)
  if (allianceRally) {
    const rallyUnit = units[0]
    if (rallyUnit) {
      actions.push({
        action: 'rally_launch',
        args: { unitId: rallyUnit.id, regionId: allianceRally.regionId },
        priority: 84,
        playerFacingReason: '同盟前线需要集结，发起后端 rally 计划，具体执行由世界队列裁决。',
      })
      actions.push({
        action: 'rally_join',
        args: { unitId: rallyUnit.id, regionId: allianceRally.regionId },
        priority: 73,
        playerFacingReason: '同盟已有集结目标时，加入 rally 计划并让后端处理行军。',
      })
    }
    actions.push({
      action: 'alliance_help',
      args: { regionId: allianceRally.regionId },
      priority: 68,
      playerFacingReason: '同盟前线需要协作，先响应集结 / 协助目标，执行仍走后端 allianceHelp authority。',
    })
  }

  const siegeObjective = warObjectives.find((objective) => objective.kind === 'siege' && objective.targetTileId)
  if (siegeObjective?.targetTileId) {
    const siegeUnit = units.find((unit) => unit.tileId === siegeObjective.targetTileId)
      ?? units.find((unit) => (unit.tileId && enemyTargets.some((target) => target.unitId === unit.id)))
      ?? units[0]
    if (siegeUnit) {
      actions.push({
        action: 'city_siege',
        args: { unitId: siegeUnit.id, targetTileId: siegeObjective.targetTileId },
        priority: 89,
        playerFacingReason: '敌城已进入可执行攻城目标，后端会按城防耐久和守军规则推进。',
      })
    }
  }

  const occupyTarget = enemyTargets.find((target) => target.canOccupyNow)
  if (occupyTarget) {
    actions.push({
      action: 'tile_occupy',
      args: { unitId: occupyTarget.unitId, tileId: occupyTarget.tileId },
      priority: 80,
      playerFacingReason: '目标就在脚下，部队状态足够，可以由后端规则发起占领。',
    })
  }

  const moveTarget = enemyTargets.find((target) => target.suggestedAction === 'march_move')
  if (moveTarget) {
    actions.push({
      action: 'march_move',
      args: { unitId: moveTarget.unitId, targetTileId: moveTarget.tileId },
      priority: 60,
      playerFacingReason: '附近有较低风险目标，可以先推进到目标地块。',
    })
  }

  const scoutTarget = enemyTargets.find((target) => target.suggestedAction === 'world_scout')
  if (scoutTarget) {
    actions.push({
      action: 'world_scout',
      args: { unitId: scoutTarget.unitId, targetTileId: scoutTarget.tileId },
      priority: 40,
      playerFacingReason: '敌压偏高，先侦察，不直接硬打。',
    })
  }

  return actions.sort((left, right) => right.priority - left.priority)
}

export function buildAiPlayerAutonomousCombatObservation(
  runtime: GovernedAiPlayerRuntimeDetail,
  requestedLimit = 8,
): AiPlayerAutonomousCombatObservation {
  const world = getWorldStateReadonly()
  const units = selectAssignedUnits(world, runtime)
  const battleReports = buildAiPlayerBattleReportReadModel(runtime, requestedLimit).items
  const ownTileThreats = buildOwnTileThreats(world, runtime, units)
  const enemyTargets = buildEnemyTargets(world, runtime, units)
  const warObjectives = buildWarObjectives(world, runtime, units)
  const battleDigest = buildAiPlayerAutonomousCombatBattleDigest({
    world,
    runtime,
    visibleBattleReports: battleReports,
    ownTileThreats,
  })
  return {
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    governorPlayerId: runtime.governorPlayerId,
    tick: world.tick,
    worldVersion: world.worldVersion,
    generatedAt: nowIso(),
    ownUnits: units.map((unit) => ({
      id: unit.id,
      name: unit.name,
      tileId: unit.tileId,
      status: unit.status,
      strength: unit.strength,
      mobility: unit.mobility,
      supply: unit.supply,
      heroName: unit.hero.name,
    })),
    battleReports,
    battleDigest,
    ownTileThreats,
    enemyTargets,
    warObjectives,
    recommendedActions: buildRecommendedActions(units, battleReports, ownTileThreats, enemyTargets, warObjectives),
    constraints: {
      executorAuthority: 'backend_only',
      readOnlyObservation: true,
      normalPlayerSurface: 'natural_language_reports_only',
    },
  }
}
