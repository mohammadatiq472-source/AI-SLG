import type {
  ScenarioNode,
  ScenarioNodeClaimState,
  ScenarioNodeStatus,
  ScenarioScript,
  SeasonScenarioState,
  WorldAffairsReadModel,
  WorldAffairsReadModelNode,
  WorldState,
} from '../contracts/game'

export const DEFAULT_WORLD_AFFAIRS_SCENARIO_ID = 'huangtian_dangli'
export const DEFAULT_WORLD_AFFAIRS_SCENARIO_VERSION = 'huangtian_dangli_v1'
export const DEFAULT_WORLD_AFFAIRS_SEASON_RUN_ID = 'season_run_proto_2026_04'

const WORLD_AFFAIRS_SCENARIO_CATALOG: ScenarioScript[] = [
  {
    scriptId: 'yellow_turban_rising',
    scenarioId: DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_AFFAIRS_SCENARIO_VERSION,
    title: '黄天当立',
    subtitle: '一赛季一剧本：太平道起势，州郡秩序开始松动。',
    nodes: [
      {
        nodeId: 'huangtian_dangli_01_gather',
        title: '流民聚众',
        objectiveText: '完成开局集结，确认主城、部队与周边资源带。',
        progressText: '太平道风声初起，州郡仍在观望，局势尚未明朗。',
        rewardPreview: [
          { kind: 'food', label: '粮草', amount: 1200 },
          { kind: 'wood', label: '木材', amount: 400 },
          { kind: 'copper', label: '铜钱', amount: 600 },
        ],
        assetSlot: 'world_affairs_node_huangtian_01',
      },
      {
        nodeId: 'huangtian_dangli_02_banner',
        title: '揭竿立旗',
        objectiveText: '推进州郡据点控制，形成第一条稳定补给线。',
        progressText: '等待后续世界目标结算器接入据点控制与补给线判定。',
        rewardPreview: [
          { kind: 'food', label: '粮草', amount: 1800 },
          { kind: 'stone', label: '石料', amount: 350 },
          { kind: 'iron', label: '铁矿', amount: 250 },
        ],
        assetSlot: 'world_affairs_node_huangtian_02',
      },
      {
        nodeId: 'huangtian_dangli_03_regional_pressure',
        title: '州郡震动',
        objectiveText: '压制敌方前沿要塞，触发区域大势推进。',
        progressText: '等待后续区域压力与战略节点达成规则接入。',
        rewardPreview: [
          { kind: 'jade', label: '玉符', amount: 20 },
          { kind: 'copper', label: '铜钱', amount: 1200 },
        ],
        assetSlot: 'world_affairs_node_huangtian_03',
      },
    ],
  },
]

export function listScenarioScripts(): ScenarioScript[] {
  return WORLD_AFFAIRS_SCENARIO_CATALOG.map(cloneScenarioScript)
}

export function getScenarioScriptByIdAndVersion(
  scenarioId: string,
  scenarioVersion: string,
): ScenarioScript | null {
  const script = resolveScenarioScript(scenarioId, scenarioVersion)
  return script ? cloneScenarioScript(script) : null
}

export function createInitialSeasonScenarioState(
  overrides?: Partial<SeasonScenarioState>,
): SeasonScenarioState {
  return normalizeSeasonScenarioState({
    activeScenarioId: overrides?.activeScenarioId ?? DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
    scenarioVersion: overrides?.scenarioVersion ?? DEFAULT_WORLD_AFFAIRS_SCENARIO_VERSION,
    seasonRunId: overrides?.seasonRunId ?? DEFAULT_WORLD_AFFAIRS_SEASON_RUN_ID,
    achievedNodeIds: overrides?.achievedNodeIds ?? [],
    claimedNodeIds: overrides?.claimedNodeIds ?? [],
  })
}

export function normalizeWorldAffairsStateForWorld(world: WorldState): { world: WorldState; changed: boolean } {
  const normalized = normalizeSeasonScenarioState(world.worldAffairs)
  if (isSameSeasonScenarioState(world.worldAffairs, normalized)) {
    return { world, changed: false }
  }

  return {
    world: {
      ...world,
      worldAffairs: normalized,
    },
    changed: true,
  }
}

export function buildWorldAffairsReadModel(world: Pick<WorldState, 'worldAffairs'>): WorldAffairsReadModel {
  const state = normalizeSeasonScenarioState(world.worldAffairs)
  const script = resolveScenarioScript(state.activeScenarioId, state.scenarioVersion)

  if (!script) {
    return {
      scriptId: 'unknown',
      scenarioId: state.activeScenarioId,
      scenarioVersion: state.scenarioVersion,
      seasonRunId: state.seasonRunId,
      title: '未知剧本',
      subtitle: '当前赛季锁定的剧本版本未在后端 catalog 中找到；不会回退到新默认配置。',
      activeNodeId: null,
      nodes: [],
    }
  }

  const achievedNodeIds = new Set(state.achievedNodeIds)
  const claimedNodeIds = new Set(state.claimedNodeIds)
  const activeNodeId = resolveActiveNodeId(script.nodes, achievedNodeIds)

  return {
    scriptId: script.scriptId,
    scenarioId: script.scenarioId,
    scenarioVersion: script.scenarioVersion,
    seasonRunId: state.seasonRunId,
    title: script.title,
    subtitle: script.subtitle,
    activeNodeId,
    nodes: script.nodes.map((node) => buildReadModelNode(node, activeNodeId, achievedNodeIds, claimedNodeIds)),
  }
}

function buildReadModelNode(
  node: ScenarioNode,
  activeNodeId: string | null,
  achievedNodeIds: ReadonlySet<string>,
  claimedNodeIds: ReadonlySet<string>,
): WorldAffairsReadModelNode {
  const status = resolveNodeStatus(node.nodeId, activeNodeId, achievedNodeIds, claimedNodeIds)
  const claimState = resolveClaimState(status)

  return {
    ...node,
    rewardPreview: node.rewardPreview.map((reward) => ({ ...reward })),
    status,
    achievedAt: null,
    claimState,
    canClaim: claimState === 'claimable',
  }
}

function resolveNodeStatus(
  nodeId: string,
  activeNodeId: string | null,
  achievedNodeIds: ReadonlySet<string>,
  claimedNodeIds: ReadonlySet<string>,
): ScenarioNodeStatus {
  if (claimedNodeIds.has(nodeId)) {
    return 'claimed'
  }
  if (achievedNodeIds.has(nodeId)) {
    return 'achieved'
  }
  if (activeNodeId === nodeId) {
    return 'active'
  }
  return 'locked'
}

function resolveClaimState(status: ScenarioNodeStatus): ScenarioNodeClaimState {
  if (status === 'claimed') {
    return 'claimed'
  }
  if (status === 'achieved') {
    return 'claimable'
  }
  return 'unavailable'
}

function resolveActiveNodeId(nodes: readonly ScenarioNode[], achievedNodeIds: ReadonlySet<string>): string | null {
  return nodes.find((node) => !achievedNodeIds.has(node.nodeId))?.nodeId ?? null
}

function resolveScenarioScript(scenarioId: string, scenarioVersion: string): ScenarioScript | null {
  return (
    WORLD_AFFAIRS_SCENARIO_CATALOG.find(
      (script) => script.scenarioId === scenarioId && script.scenarioVersion === scenarioVersion,
    ) ?? null
  )
}

function normalizeSeasonScenarioState(input: SeasonScenarioState | undefined): SeasonScenarioState {
  return {
    activeScenarioId: normalizeNonEmptyString(input?.activeScenarioId) ?? DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
    scenarioVersion: normalizeNonEmptyString(input?.scenarioVersion) ?? DEFAULT_WORLD_AFFAIRS_SCENARIO_VERSION,
    seasonRunId: normalizeNonEmptyString(input?.seasonRunId) ?? DEFAULT_WORLD_AFFAIRS_SEASON_RUN_ID,
    achievedNodeIds: uniqueNonEmptyStrings(input?.achievedNodeIds),
    claimedNodeIds: uniqueNonEmptyStrings(input?.claimedNodeIds),
  }
}

function cloneScenarioScript(script: ScenarioScript): ScenarioScript {
  return {
    ...script,
    nodes: script.nodes.map((node) => ({
      ...node,
      rewardPreview: node.rewardPreview.map((reward) => ({ ...reward })),
    })),
  }
}

function isSameSeasonScenarioState(
  current: SeasonScenarioState | undefined,
  normalized: SeasonScenarioState,
): boolean {
  if (!current) {
    return false
  }

  return (
    current.activeScenarioId === normalized.activeScenarioId &&
    current.scenarioVersion === normalized.scenarioVersion &&
    current.seasonRunId === normalized.seasonRunId &&
    current.achievedNodeIds.length === normalized.achievedNodeIds.length &&
    current.claimedNodeIds.length === normalized.claimedNodeIds.length &&
    current.achievedNodeIds.every((nodeId, index) => nodeId === normalized.achievedNodeIds[index]) &&
    current.claimedNodeIds.every((nodeId, index) => nodeId === normalized.claimedNodeIds[index])
  )
}

function normalizeNonEmptyString(value: string | undefined): string | null {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : null
}

function uniqueNonEmptyStrings(values: readonly string[] | undefined): string[] {
  const unique = new Set<string>()
  for (const value of values ?? []) {
    const normalized = normalizeNonEmptyString(value)
    if (normalized) {
      unique.add(normalized)
    }
  }
  return Array.from(unique)
}
