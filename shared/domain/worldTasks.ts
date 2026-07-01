import type {
  ScenarioTask,
  ScenarioTaskCatalog,
  ScenarioTaskChapter,
  SeasonTaskState,
  CurrentGoalAuthority,
  CurrentGoalLayer,
  CurrentGoalSourceRef,
  CurrentGoalsReadModel,
  TaskClaimState,
  TaskRealAuthoritySignalKind,
  TaskRealAuthoritySignalRef,
  TaskSettlementAuthority,
  TaskRewardPreview,
  TaskStatus,
  WorldAffairsReadModel,
  WorldTasksReadModel,
  WorldState,
  WorldTasksReadModelTask,
} from '../contracts/game'
import {
  DEFAULT_WORLD_AFFAIRS_SCENARIO_ID,
  DEFAULT_WORLD_AFFAIRS_SCENARIO_VERSION,
  DEFAULT_WORLD_AFFAIRS_SEASON_RUN_ID,
  buildWorldAffairsReadModel,
} from './worldAffairs'

export const DEFAULT_WORLD_TASKS_SCENARIO_ID = DEFAULT_WORLD_AFFAIRS_SCENARIO_ID
export const DEFAULT_WORLD_TASKS_SCENARIO_VERSION = DEFAULT_WORLD_AFFAIRS_SCENARIO_VERSION
export const DEFAULT_WORLD_TASKS_SEASON_RUN_ID = DEFAULT_WORLD_AFFAIRS_SEASON_RUN_ID
export const DEFAULT_WORLD_TASKS_ACTIVE_CHAPTER_ID = 'huangtian_chapter_01'

type ChapterSpec = {
  chapterId: string
  title: string
  chapterIndex: number
  progressText: string
  rewardPreview: TaskRewardPreview[]
  assetSlot: string
  taskGroupId: string
  nextChapterId: string | null
  tasks: ScenarioTask[]
}

type WorldCurrentGoalsAiState = NonNullable<NonNullable<WorldState['slgDomainState']>['aiStateByFaction']>[string]

const HUANGTIAN_CHAPTER_SPECS: ChapterSpec[] = [
  {
    chapterId: DEFAULT_WORLD_TASKS_ACTIVE_CHAPTER_ID,
    title: '第一章 太平初起',
    chapterIndex: 1,
    progressText: '当前章节围绕主城确认、基础补给与周边资源侦察展开。',
    rewardPreview: [
      { kind: 'food', label: '粮草', amount: 1000 },
      { kind: 'copper', label: '铜钱', amount: 500 },
    ],
    assetSlot: 'task_chapter_huangtian_01',
    taskGroupId: 'huangtian_chapter_01_opening',
    nextChapterId: 'huangtian_chapter_02',
    tasks: [
      {
        taskId: 'huangtian_task_01_confirm_city',
        title: '整点主城',
        objectiveText: '进入主城，确认政厅、征兵与仓储入口。',
        progressText: '原型达成入口：achieveTaskPrototype；真实主城行为 authority 尚未接入。',
        rewardPreview: [
          { kind: 'food', label: '粮草', amount: 600 },
          { kind: 'wood', label: '木材', amount: 300 },
          { kind: 'copper', label: '铜钱', amount: 300 },
        ],
        actionHint: 'open_city',
        actionTarget: { kind: 'panel', id: 'main_city' },
        assetSlot: 'task_huangtian_01_confirm_city',
      },
      {
        taskId: 'huangtian_task_02_prepare_supplies',
        title: '备齐军需',
        objectiveText: '积累第一批粮木资源，支撑前线铺开。',
        progressText: '等待后续资源生产与任务目标结算器接入。',
        rewardPreview: [
          { kind: 'food', label: '粮草', amount: 800 },
          { kind: 'wood', label: '木材', amount: 500 },
        ],
        actionHint: 'open_world_map',
        actionTarget: { kind: 'world_tile', id: 'resource_nearby' },
        assetSlot: 'task_huangtian_02_prepare_supplies',
      },
      {
        taskId: 'huangtian_task_03_survey_mines',
        title: '探明矿脉',
        objectiveText: '侦察周边石铁资源，为后续城建与军备铺路。',
        progressText: '等待后续地图侦察与资源点 authority 接入。',
        rewardPreview: [
          { kind: 'stone', label: '石料', amount: 400 },
          { kind: 'iron', label: '铁矿', amount: 300 },
          { kind: 'copper', label: '铜钱', amount: 200 },
        ],
        actionHint: 'open_world_map',
        actionTarget: { kind: 'world_tile', id: 'resource_nearby' },
        assetSlot: 'task_huangtian_03_survey_mines',
      },
    ],
  },
  createStandardChapter(2, '乡勇集结', '组织乡勇、点验校场，并完成第一批预备兵调度。', [
    ['huangtian_task_04_register_militia', '登记乡勇', '完成乡勇名册整理，确认可调动预备兵。', 'open_city', 'panel', 'barracks'],
    ['huangtian_task_05_drill_ground', '整备校场', '确认校场训练入口，为后续行军提供基础训练。', 'open_city', 'panel', 'drill_ground'],
    ['huangtian_task_06_assign_patrol', '派出巡队', '派遣巡队检查主城外缘的敌情与道路。', 'open_world_map', 'world_tile', 'city_perimeter'],
  ]),
  createStandardChapter(3, '辎重成行', '整合粮车、仓储与木材运输，建立初始后勤节奏。', [
    ['huangtian_task_07_count_grain', '清点粮仓', '确认粮仓余量，建立出征前粮草底账。', 'open_city', 'panel', 'granary'],
    ['huangtian_task_08_prepare_carts', '备车集材', '调配木材与车队，为前线营地搭建做准备。', 'open_city', 'panel', 'warehouse'],
    ['huangtian_task_09_mark_supply_route', '标定粮道', '在世界地图上标定第一条短程补给路线。', 'open_world_map', 'world_tile', 'supply_route_01'],
  ]),
  createStandardChapter(4, '州郡试探', '向州郡边界施压，确认敌军前哨与资源带分布。', [
    ['huangtian_task_10_probe_border', '试探边界', '侦察州郡边界，确认敌方警戒范围。', 'open_world_map', 'world_tile', 'border_probe'],
    ['huangtian_task_11_secure_ford', '稳住渡口', '控制一处渡口或道路要点，保障小队通行。', 'open_world_map', 'world_tile', 'ford'],
    ['huangtian_task_12_report_pressure', '回报敌压', '汇总边界敌压，等待后续敌情 authority 接入。', 'open_city', 'panel', 'council'],
  ]),
  createStandardChapter(5, '据点连营', '连接周边据点，形成可持续推进的营地链。', [
    ['huangtian_task_13_raise_outpost', '立起前哨', '选择近郊据点作为前哨支点。', 'open_world_map', 'world_tile', 'outpost_01'],
    ['huangtian_task_14_stockade_timber', '备足营木', '准备加固营垒所需木材。', 'open_city', 'panel', 'warehouse'],
    ['huangtian_task_15_link_camps', '连通营地', '确认前哨与主城之间的行军线路。', 'open_world_map', 'world_tile', 'camp_link'],
  ]),
  createStandardChapter(6, '田亩复耕', '恢复粮田产出，压低长期动员的粮草风险。', [
    ['huangtian_task_16_restore_fields', '复耕近田', '整理主城周边粮田，恢复基础粮草产出。', 'open_world_map', 'world_tile', 'food_field'],
    ['huangtian_task_17_guard_harvest', '护住秋收', '安排守备队保护近郊收成。', 'open_world_map', 'world_tile', 'harvest_guard'],
    ['huangtian_task_18_balance_store', '平衡仓储', '调整粮仓与军需仓之间的资源比例。', 'open_city', 'panel', 'granary'],
  ]),
  createStandardChapter(7, '军府整编', '整理兵籍、军械与队伍职责，减少中期战线混乱。', [
    ['huangtian_task_19_reassign_units', '重编伍列', '重排基础队列，明确前锋与守备职责。', 'open_city', 'panel', 'barracks'],
    ['huangtian_task_20_check_armory', '检点军械', '检查铁矿与军械缺口。', 'open_city', 'panel', 'armory'],
    ['huangtian_task_21_set_reserve', '设立预备', '为后续据点攻防预留一支预备队。', 'open_city', 'panel', 'drill_ground'],
  ]),
  createStandardChapter(8, '关隘争锋', '围绕关隘与道路节点争夺区域主动权。', [
    ['huangtian_task_22_scout_pass', '侦察关隘', '侦察目标关隘守军与道路连接。', 'open_world_map', 'world_tile', 'pass_scout'],
    ['huangtian_task_23_prepare_stone', '备石筑垒', '准备加固攻防工事所需石料。', 'open_city', 'panel', 'warehouse'],
    ['huangtian_task_24_hold_chokepoint', '守住隘口', '建立关隘前线的临时守备点。', 'open_world_map', 'world_tile', 'chokepoint'],
  ]),
  createStandardChapter(9, '郡县震动', '让周边郡县进入高压态势，迫使敌方分兵。', [
    ['huangtian_task_25_spread_notice', '传檄郡县', '发布动员文告，扩大周边影响。', 'open_city', 'panel', 'council'],
    ['huangtian_task_26_cut_watchpost', '截断哨站', '削弱敌方外缘哨站的信息链。', 'open_world_map', 'world_tile', 'watchpost'],
    ['huangtian_task_27_secure_market', '稳住市集', '确保铜钱来源不被战线扰动。', 'open_city', 'panel', 'market'],
  ]),
  createStandardChapter(10, '联盟檄文', '与盟友形成协同目标，准备更长距离的战略动作。', [
    ['huangtian_task_28_confirm_allies', '确认盟约', '确认当前同盟可协作方向。', 'open_city', 'panel', 'alliance'],
    ['huangtian_task_29_share_supplies', '共筹军资', '为盟友协作预留一批粮木资源。', 'open_city', 'panel', 'warehouse'],
    ['huangtian_task_30_mark_joint_target', '标定共击点', '在地图上标定一个共同施压目标。', 'open_world_map', 'world_tile', 'joint_target'],
  ]),
  createStandardChapter(11, '河洛转进', '准备向河洛方向转进，压缩敌方核心空间。', [
    ['huangtian_task_31_crossing_plan', '拟定渡河', '确认渡河路线与备选退路。', 'open_world_map', 'world_tile', 'river_crossing'],
    ['huangtian_task_32_restock_iron', '补足铁矿', '补足铁矿以支撑长线战备。', 'open_world_map', 'world_tile', 'iron_resource'],
    ['huangtian_task_33_forward_cache', '前置军仓', '建立前置军仓，降低转进消耗。', 'open_world_map', 'world_tile', 'forward_cache'],
  ]),
  createStandardChapter(12, '铁骑压境', '处理强敌压境，形成防线反制与补给弹性。', [
    ['huangtian_task_34_watch_cavalry', '探马回报', '收集敌方骑兵动向。', 'open_world_map', 'world_tile', 'cavalry_watch'],
    ['huangtian_task_35_reinforce_line', '加固防线', '投入石铁资源加固关键防线。', 'open_world_map', 'world_tile', 'defense_line'],
    ['huangtian_task_36_prepare_counter', '准备反击', '整理反击队伍与补给。', 'open_city', 'panel', 'drill_ground'],
  ]),
  createStandardChapter(13, '粮道决战', '围绕核心粮道展开决战前的资源与机动准备。', [
    ['huangtian_task_37_secure_grain_road', '固守粮道', '确认核心粮道不被切断。', 'open_world_map', 'world_tile', 'grain_road'],
    ['huangtian_task_38_stock_final_food', '囤积决粮', '囤积决战所需粮草。', 'open_city', 'panel', 'granary'],
    ['huangtian_task_39_disrupt_enemy_supply', '扰乱敌粮', '对敌方补给线制造压力。', 'open_world_map', 'world_tile', 'enemy_supply'],
  ]),
  createStandardChapter(14, '洛阳围势', '形成围洛态势，准备最终区域目标结算接入。', [
    ['huangtian_task_40_map_luoyang', '测绘洛阳', '确认洛阳周边道路与据点关系。', 'open_world_map', 'world_tile', 'luoyang_ring'],
    ['huangtian_task_41_ring_outposts', '环列营垒', '在洛阳外围建立支撑营垒。', 'open_world_map', 'world_tile', 'luoyang_outpost'],
    ['huangtian_task_42_prepare_siege', '准备围攻', '整备围攻所需粮草、石料与铁矿。', 'open_city', 'panel', 'armory'],
  ]),
  createStandardChapter(15, '黄天定局', '收束赛季主线，等待后续真实大势与胜负结算接入。', [
    ['huangtian_task_43_final_muster', '终局集结', '完成终局前最后一次部队点验。', 'open_city', 'panel', 'drill_ground'],
    ['huangtian_task_44_hold_capital_ring', '稳住围势', '维持核心区域的包围压力。', 'open_world_map', 'world_tile', 'capital_ring'],
    ['huangtian_task_45_record_outcome', '记入军功', '记录赛季终局前的军功与资源清单。', 'open_city', 'panel', 'council'],
  ]),
]

const WORLD_TASKS_CATALOG: ScenarioTaskCatalog[] = [
  {
    scriptId: 'yellow_turban_rising_tasks',
    scenarioId: DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    chapters: HUANGTIAN_CHAPTER_SPECS.map(buildChapter),
  },
]

type ActionTargetKind = NonNullable<ScenarioTask['actionTarget']>['kind']
type StandardTaskRow = readonly [string, string, string, string, ActionTargetKind, string]

function createStandardChapter(
  chapterIndex: number,
  title: string,
  progressText: string,
  taskRows: readonly StandardTaskRow[],
): ChapterSpec {
  const chapterId = `huangtian_chapter_${padChapterIndex(chapterIndex)}`
  const taskGroupId = `${chapterId}_main`

  return {
    chapterId,
    title: `第${chapterIndex}章 ${title}`,
    chapterIndex,
    progressText,
    rewardPreview: createChapterRewardPreview(chapterIndex),
    assetSlot: `task_chapter_huangtian_${padChapterIndex(chapterIndex)}`,
    taskGroupId,
    nextChapterId: chapterIndex < 15 ? `huangtian_chapter_${padChapterIndex(chapterIndex + 1)}` : null,
    tasks: taskRows.map(([taskId, taskTitle, objectiveText, actionHint, targetKind, targetId], index) => ({
      taskId,
      title: taskTitle,
      objectiveText,
      progressText: '等待后续真实玩法目标结算器接入；当前可用 achieveTaskPrototype 进行后端合同验证。',
      rewardPreview: createTaskRewardPreview(chapterIndex, index),
      actionHint,
      actionTarget: { kind: targetKind, id: targetId },
      assetSlot: `task_${taskId}`,
    })),
  }
}

function buildChapter(spec: ChapterSpec): ScenarioTaskChapter {
  return {
    chapterId: spec.chapterId,
    title: spec.title,
    chapterIndex: spec.chapterIndex,
    progressText: spec.progressText,
    rewardPreview: spec.rewardPreview.map((reward) => ({ ...reward })),
    assetSlot: spec.assetSlot,
    nextChapterId: spec.nextChapterId,
    currentTaskGroupId: spec.taskGroupId,
    taskGroups: [
      {
        taskGroupId: spec.taskGroupId,
        tasks: spec.tasks.map((task) => ({
          ...task,
          rewardPreview: task.rewardPreview.map((reward) => ({ ...reward })),
          actionTarget: task.actionTarget ? { ...task.actionTarget } : undefined,
        })),
      },
    ],
  }
}

function createChapterRewardPreview(chapterIndex: number): TaskRewardPreview[] {
  const base = 800 + chapterIndex * 120
  const rewards: TaskRewardPreview[] = [
    { kind: 'food', label: '粮草', amount: base },
    { kind: 'copper', label: '铜钱', amount: 300 + chapterIndex * 60 },
  ]

  if (chapterIndex % 3 === 1) {
    rewards.push({ kind: 'wood', label: '木材', amount: 260 + chapterIndex * 40 })
  } else if (chapterIndex % 3 === 2) {
    rewards.push({ kind: 'stone', label: '石料', amount: 220 + chapterIndex * 35 })
  } else {
    rewards.push({ kind: 'iron', label: '铁矿', amount: 180 + chapterIndex * 35 })
  }

  return rewards
}

function createTaskRewardPreview(chapterIndex: number, taskOffset: number): TaskRewardPreview[] {
  const scale = chapterIndex * 80 + taskOffset * 40
  if (taskOffset === 0) {
    return [
      { kind: 'food', label: '粮草', amount: 500 + scale },
      { kind: 'copper', label: '铜钱', amount: 180 + chapterIndex * 40 },
    ]
  }
  if (taskOffset === 1) {
    return [
      { kind: 'wood', label: '木材', amount: 280 + scale },
      { kind: 'stone', label: '石料', amount: 180 + chapterIndex * 35 },
    ]
  }
  return [
    { kind: 'iron', label: '铁矿', amount: 220 + scale },
    { kind: 'copper', label: '铜钱', amount: 160 + chapterIndex * 45 },
  ]
}

function padChapterIndex(chapterIndex: number): string {
  return String(chapterIndex).padStart(2, '0')
}

export function listScenarioTaskCatalogs(): ScenarioTaskCatalog[] {
  return WORLD_TASKS_CATALOG.map(cloneScenarioTaskCatalog)
}

export function getScenarioTaskCatalogByIdAndVersion(
  scenarioId: string,
  scenarioVersion: string,
): ScenarioTaskCatalog | null {
  const catalog = resolveScenarioTaskCatalog(scenarioId, scenarioVersion)
  return catalog ? cloneScenarioTaskCatalog(catalog) : null
}

export function createInitialSeasonTaskState(overrides?: Partial<SeasonTaskState>): SeasonTaskState {
  return normalizeSeasonTaskState({
    activeScenarioId: overrides?.activeScenarioId ?? DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: overrides?.scenarioVersion ?? DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: overrides?.seasonRunId ?? DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: overrides?.activeChapterId ?? DEFAULT_WORLD_TASKS_ACTIVE_CHAPTER_ID,
    achievedTaskIds: overrides?.achievedTaskIds ?? [],
    claimedTaskIds: overrides?.claimedTaskIds ?? [],
  })
}

export function normalizeWorldTasksStateForWorld(world: WorldState): { world: WorldState; changed: boolean } {
  const normalized = normalizeSeasonTaskState(world.worldTasks)
  if (isSameSeasonTaskState(world.worldTasks, normalized)) {
    return { world, changed: false }
  }

  return {
    world: {
      ...world,
      worldTasks: normalized,
    },
    changed: true,
  }
}

export function buildWorldTasksReadModel(world: WorldState, factionId: string): WorldTasksReadModel {
  const state = normalizeSeasonTaskState(world.worldTasks)
  const catalog = resolveScenarioTaskCatalog(state.activeScenarioId, state.scenarioVersion)

  if (!catalog) {
    return {
      factionId,
      scenarioId: state.activeScenarioId,
      scenarioVersion: state.scenarioVersion,
      seasonRunId: state.seasonRunId,
      activeChapterId: state.activeChapterId,
      activeChapterTitle: '未知章节',
      chapterIndex: 0,
      chapterProgressText: '当前赛季锁定的任务剧本版本未在后端 catalog 中找到；不会回退到新默认配置。',
      chapterRewardPreview: [],
      currentTaskGroupId: '',
      tasks: [],
    }
  }

  const chapter = resolveChapter(catalog, state.activeChapterId)
  if (!chapter) {
    return {
      factionId,
      scenarioId: catalog.scenarioId,
      scenarioVersion: catalog.scenarioVersion,
      seasonRunId: state.seasonRunId,
      activeChapterId: state.activeChapterId,
      activeChapterTitle: '未知章节',
      chapterIndex: 0,
      chapterProgressText: '当前赛季锁定的章节未在任务 catalog 中找到；不会复制 catalog 修复运行态。',
      chapterRewardPreview: [],
      currentTaskGroupId: '',
      tasks: [],
    }
  }

  const taskGroup = resolveTaskGroup(chapter)
  const tasks = taskGroup?.tasks ?? []
  const achievedTaskIds = new Set(state.achievedTaskIds)
  const claimedTaskIds = new Set(state.claimedTaskIds)
  const realAuthoritySignalsByTaskId = buildFirstHourRealAuthoritySignals(world, factionId)
  const activeTaskId = resolveActiveTaskId(tasks, claimedTaskIds, realAuthoritySignalsByTaskId)

  return {
    factionId,
    scenarioId: catalog.scenarioId,
    scenarioVersion: catalog.scenarioVersion,
    seasonRunId: state.seasonRunId,
    activeChapterId: chapter.chapterId,
    activeChapterTitle: chapter.title,
    chapterIndex: chapter.chapterIndex,
    chapterProgressText: chapter.progressText,
    chapterRewardPreview: chapter.rewardPreview.map((reward) => ({ ...reward })),
    currentTaskGroupId: chapter.currentTaskGroupId,
    tasks: tasks.map((task) => buildReadModelTask(task, activeTaskId, achievedTaskIds, claimedTaskIds, realAuthoritySignalsByTaskId)),
    assetSlot: chapter.assetSlot,
  }
}

export function buildCurrentGoalsReadModel(world: WorldState, factionId: string): CurrentGoalsReadModel {
  const tasks = buildWorldTasksReadModel(world, factionId)
  const affairs = buildWorldAffairsReadModel(world)
  const faction = world.factions[factionId]
  const aiState = world.slgDomainState?.aiStateByFaction?.[factionId]
  const latestReport = world.reports[0]

  return {
    contractId: 'current_goals_guidance_v1',
    factionId,
    generatedAtWorldVersion: world.worldVersion,
    layers: [
      buildFirstHourGoalLayer(tasks, affairs),
      buildGrowthGoalLayer(tasks, aiState, latestReport),
      buildAllianceGoalLayer(world),
      buildKingdomGoalLayer(faction),
      buildEmpireGoalLayer(faction),
      buildUnificationGoalLayer(faction),
    ],
  }
}

function buildFirstHourGoalLayer(tasks: WorldTasksReadModel, affairs: WorldAffairsReadModel): CurrentGoalLayer {
  const activeTask = tasks.tasks.find((task) => task.status === 'active') ?? tasks.tasks[0]
  const activeAffair = affairs.nodes.find((node) => node.nodeId === affairs.activeNodeId) ?? affairs.nodes[0]
  const refs = compactSourceRefs([
    activeTask ? { kind: 'worldTasks', id: activeTask.taskId } : null,
    activeAffair ? { kind: 'worldAffairs', id: activeAffair.nodeId } : null,
  ])
  const authority = resolveTaskAuthority(activeTask)

  return {
    layerId: 'firstHour',
    title: '第一小时开荒目标',
    goals: [
      {
        goalId: 'firstHour:opening-spine',
        title: activeTask ? `开荒：${activeTask.title}` : '开荒：确认主城与周边资源',
        description: activeTask
          ? `${activeTask.objectiveText} 当前天下大事同步到：${activeAffair?.title ?? affairs.title}。`
          : '玩家和 AI 玩家先确认主城、资源和最近的行动目标。',
        nextStep: activeTask?.actionHint ?? 'open_world_map',
        authority,
        sourceRefs: refs,
        actionTarget: activeTask?.actionTarget ? { ...activeTask.actionTarget } : undefined,
      },
    ],
  }
}

function buildGrowthGoalLayer(
  tasks: WorldTasksReadModel,
  aiState: WorldCurrentGoalsAiState | undefined,
  latestReport: WorldState['reports'][number] | undefined,
): CurrentGoalLayer {
  const realAuthorityTask = tasks.tasks.find((task) => task.settlementAuthority === 'real_authority' && task.status === 'achieved')
  const currentTask = realAuthorityTask ?? tasks.tasks.find((task) => task.status === 'active') ?? tasks.tasks[0]
  const aiRecord = aiState as {
    agenda?: { summary?: string; focus?: string }
    execution?: { summary?: string; target?: string; currentActionId?: string; requestId?: string; strategicCommand?: string }
  } | undefined
  const traceId = aiRecord?.execution?.currentActionId ?? aiRecord?.execution?.requestId ?? 'ai_trace_current_goal_read_model'
  const reportId = latestReport?.id ?? 'battle_report_pending'
  const reportSummary = readReportSummary(latestReport)

  return {
    layerId: 'growth',
    title: '发育与战斗准备',
    goals: [
      {
        goalId: 'growth:ai-development-combat-loop',
        title: '发育：让 AI 玩家继续开荒、补兵和战斗准备',
        description: aiRecord?.execution?.summary
          ?? aiRecord?.execution?.strategicCommand
          ?? aiRecord?.agenda?.summary
          ?? 'AI 玩家需要围绕资源、队伍和下一场战斗形成可追踪行动。',
        nextStep: reportSummary
          ? `读取战报建议：${reportSummary}`
          : `跟进任务：${currentTask?.title ?? '资源与队伍发育'}`,
        authority: aiRecord || latestReport || realAuthorityTask ? 'real_authority' : 'read_model_only',
        sourceRefs: compactSourceRefs([
          { kind: 'aiTrace', id: traceId },
          { kind: 'battleReport', id: reportId },
          currentTask ? { kind: 'worldTasks', id: currentTask.taskId } : null,
        ]),
        actionTarget: currentTask?.actionTarget ? { ...currentTask.actionTarget } : undefined,
      },
    ],
  }
}

function readReportSummary(report: WorldState['reports'][number] | undefined): string {
  if (!report) {
    return ''
  }
  const record = report as unknown as { summary?: unknown; detail?: unknown; title?: unknown }
  return normalizeNonEmptyString(record.summary as string | undefined)
    ?? normalizeNonEmptyString(record.detail as string | undefined)
    ?? normalizeNonEmptyString(record.title as string | undefined)
    ?? ''
}

function buildAllianceGoalLayer(world: WorldState): CurrentGoalLayer {
  const directive = Object.entries(world.alliance.directives ?? {})[0]
  const directiveId = directive?.[0] ?? 'alliance_directive_read_model'
  const directiveSummary = directive?.[1]?.summary

  return {
    layerId: 'alliance',
    title: '同盟协作目标',
    goals: [
      {
        goalId: 'alliance:frontline-coordination',
        title: '同盟：组织成员协同开荒与前线支援',
        description: directiveSummary ?? '把 AI 玩家、玩家队伍和同盟前线目标放到同一个协作栈里。',
        nextStep: '查看同盟前线、战报建议和可协作目标。',
        authority: 'read_model_only',
        sourceRefs: [{ kind: 'alliance', id: directiveId }],
        actionTarget: { kind: 'panel', id: 'alliance' },
      },
    ],
  }
}

function buildKingdomGoalLayer(faction: WorldState['factions'][string] | undefined): CurrentGoalLayer {
  const hasKingdom = Boolean(faction?.nationName)
  return {
    layerId: 'kingdom',
    title: '王国阶段目标',
    goals: [
      {
        goalId: 'kingdom:found-and-stabilize',
        title: '王国：从同盟治理升级到立国目标',
        description: hasKingdom
          ? `${faction?.nationName} 已进入王国治理阶段，继续绑定成员、都城和区域目标。`
          : '尚未完成立国，当前只能作为目标栈提示，不把王国当成已达成事实。',
        nextStep: hasKingdom ? '检查王国都城、成员归属与区域攻伐目标。' : '先完成同盟组织和立国前置条件。',
        authority: hasKingdom ? 'real_authority' : 'locked',
        sourceRefs: [{ kind: 'nation', id: faction?.nationName ?? 'kingdom_locked' }],
        actionTarget: { kind: 'panel', id: 'nation' },
      },
    ],
  }
}

function buildEmpireGoalLayer(faction: WorldState['factions'][string] | undefined): CurrentGoalLayer {
  const isEmpire = faction?.nationTier === 'empire'
  return {
    layerId: 'empire',
    title: '帝国阶段目标',
    goals: [
      {
        goalId: 'empire:upgrade-and-command',
        title: '帝国：升级帝国并统合多线战场',
        description: isEmpire
          ? '帝国 authority 已成立，可把多州战线、AI 玩家和战报建议纳入帝国目标。'
          : '帝国能力尚未解锁；当前只显示升级方向，不能宣称帝国已成立。',
        nextStep: isEmpire ? '打开国家中局，检查同盟、王国、帝国和跨州攻伐建议。' : '打开国家中局，确认王国治理和帝国升级条件。',
        authority: isEmpire ? 'real_authority' : 'locked',
        sourceRefs: [{ kind: 'nation', id: isEmpire ? `${faction?.id ?? 'player'}_empire` : 'empire_locked' }],
        actionTarget: { kind: 'panel', id: 'nation_midgame_frontend' },
      },
    ],
  }
}

function buildUnificationGoalLayer(faction: WorldState['factions'][string] | undefined): CurrentGoalLayer {
  const isEmpire = faction?.nationTier === 'empire'
  return {
    layerId: 'unification',
    title: '东汉十三州统一目标',
    goals: [
      {
        goalId: 'unification:east-han-thirteen-states',
        title: '东汉十三州：区域攻伐与统一路线',
        description: '统一目标必须服务于玩家 + AI 玩家在东汉十三州内的开荒、发育、战斗、同盟、王国和帝国推进。',
        nextStep: isEmpire ? '打开国家中局，选择下一州攻伐目标并同步 AI 玩家行动。' : '打开国家中局，先完成王国 / 帝国阶段，再进入十三州统一 authority。',
        authority: isEmpire ? 'read_model_only' : 'locked',
        sourceRefs: [
          { kind: 'eastHanThirteenStates', id: 'east_han_thirteen_states_unification' },
          { kind: 'nation', id: faction?.nationTier ?? 'nation_tier_locked' },
        ],
        actionTarget: { kind: 'panel', id: 'nation_midgame_frontend' },
      },
    ],
  }
}

function resolveTaskAuthority(task: WorldTasksReadModelTask | undefined): CurrentGoalAuthority {
  if (!task) {
    return 'read_model_only'
  }
  if (/achieveTaskPrototype|真实.*authority 尚未接入|等待后续真实玩法目标结算器接入/.test(task.progressText)) {
    return 'prototype_only'
  }
  return 'real_authority'
}

function compactSourceRefs(values: readonly (CurrentGoalSourceRef | null)[]): CurrentGoalSourceRef[] {
  return values.filter((value): value is CurrentGoalSourceRef => value !== null)
}

function buildFirstHourRealAuthoritySignals(
  world: WorldState,
  factionId: string,
): Map<string, TaskRealAuthoritySignalRef[]> {
  const faction = world.factions[factionId]
  const homeCityId = faction?.heroCommand.homeTileId ?? 'main_city'
  const cityGroups = world.slgDomainState?.cityBuildingGroupsByCity ?? {}
  const mainCityOpened = Boolean(cityGroups[homeCityId]) || Object.keys(cityGroups).length > 0
  const resourceStockpileReady = Boolean(
    faction
    && faction.food >= 1000
    && (faction.wood ?? 0) >= 500
  )
  const resourceSurveyed = world.map.tiles.some((tile) => (
    tile.owner === factionId
    && tile.type === 'resource'
    && (tile.resourceKind === 'stone' || tile.resourceKind === 'iron')
    && /第一小时开荒矿脉目标/.test(world.intel[tile.id]?.summary ?? '')
  ))
  const troopFormationViewed = hasTroopFormationStatus(world, /编队已查看|校场.*已查看|formation_viewed/)
  const troopFormationPrepared = hasTroopFormationStatus(world, /编队已准备|校场.*已准备|formation_prepared/)
  const aiActivityObserved = hasAiActivityObserved(world, factionId)
  const chapterThreeFoodReady = Boolean(faction && faction.food >= 2000)
  const chapterThreeCartReady = Boolean(faction && (faction.wood ?? 0) >= 1000 && (faction.stone ?? 0) >= 800)
  const battleReportOpened = hasBattleReportOpened(world)

  return new Map([
    [
      'huangtian_task_01_confirm_city',
      [
        buildRealAuthoritySignal(world, factionId, 'huangtian_task_01_confirm_city', 'main_city_opened', homeCityId, mainCityOpened),
      ],
    ],
    [
      'huangtian_task_02_prepare_supplies',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_02_prepare_supplies',
          'resource_stockpile_ready',
          `${factionId}:food_wood_stockpile`,
          resourceStockpileReady,
        ),
      ],
    ],
    [
      'huangtian_task_03_survey_mines',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_03_survey_mines',
          'resource_scouted',
          `${factionId}:stone_iron_resource`,
          resourceSurveyed,
        ),
      ],
    ],
    [
      'huangtian_task_04_register_militia',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_04_register_militia',
          'troop_formation_viewed',
          `${factionId}:troop_formation_viewed`,
          troopFormationViewed,
        ),
      ],
    ],
    [
      'huangtian_task_05_drill_ground',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_05_drill_ground',
          'troop_formation_prepared',
          `${factionId}:troop_formation_prepared`,
          troopFormationPrepared,
        ),
      ],
    ],
    [
      'huangtian_task_06_assign_patrol',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_06_assign_patrol',
          'ai_activity_observed',
          `${factionId}:ai_activity_observed`,
          aiActivityObserved,
        ),
      ],
    ],
    [
      'huangtian_task_07_count_grain',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_07_count_grain',
          'resource_stockpile_ready',
          `${factionId}:food_stockpile`,
          chapterThreeFoodReady,
        ),
      ],
    ],
    [
      'huangtian_task_08_prepare_carts',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_08_prepare_carts',
          'resource_stockpile_ready',
          `${factionId}:wood_stone_cart_stockpile`,
          chapterThreeCartReady,
        ),
      ],
    ],
    [
      'huangtian_task_09_mark_supply_route',
      [
        buildRealAuthoritySignal(
          world,
          factionId,
          'huangtian_task_09_mark_supply_route',
          'battle_report_opened',
          'battle_report_opened_first_hour_supply_route',
          battleReportOpened,
        ),
      ],
    ],
  ])
}

function buildRealAuthoritySignal(
  world: WorldState,
  factionId: string,
  taskId: string,
  kind: TaskRealAuthoritySignalKind,
  fallbackId: string,
  fallbackSatisfied: boolean,
): TaskRealAuthoritySignalRef {
  const ledgerEvent = world.worldTaskEvents?.events.find((event) => (
    event.factionId === factionId
    && event.taskId === taskId
    && event.kind === kind
    && event.authority === 'real_authority'
  ))
  if (ledgerEvent) {
    return {
      kind,
      id: ledgerEvent.eventId,
      satisfied: true,
    }
  }

  return {
    kind,
    id: fallbackId,
    satisfied: fallbackSatisfied,
  }
}

function hasTroopFormationStatus(world: WorldState, pattern: RegExp): boolean {
  const facilitiesByUnit = world.slgDomainState?.troopFacilitiesByUnit ?? {}
  return Object.values(facilitiesByUnit).some((facilityGroups) => (
    Object.values(facilityGroups).some((buildings) => (
      Object.values(buildings).some((building) => pattern.test(building.statusText))
    ))
  ))
}

function hasAiActivityObserved(world: WorldState, factionId: string): boolean {
  const aiState = world.slgDomainState?.aiStateByFaction?.[factionId]
  const agendaSummary = aiState?.agenda?.summary ?? ''
  const executionSummary = aiState?.execution?.strategicCommand ?? ''
  return /AI 活动已观察|巡队正在|派出巡队|ai_activity_observed/.test(`${agendaSummary}\n${executionSummary}`)
}

function hasBattleReportOpened(world: WorldState): boolean {
  return world.reports.some((report) => (
    /战报已打开|battle_report_opened/.test(`${report.id}\n${report.title}\n${report.detail}`)
  ))
}

function resolveTaskSettlementAuthority(
  task: ScenarioTask,
  realAuthoritySignals: readonly TaskRealAuthoritySignalRef[],
  status: TaskStatus,
): TaskSettlementAuthority {
  if (status === 'locked') {
    return 'locked'
  }
  if (realAuthoritySignals.length > 0) {
    return realAuthoritySignals.every((signal) => signal.satisfied) ? 'real_authority' : 'prototype_only'
  }
  if (/achieveTaskPrototype|真实.*authority 尚未接入|等待后续真实玩法目标结算器接入/.test(task.progressText)) {
    return 'prototype_only'
  }
  return 'real_authority'
}

function buildTaskProgressText(task: ScenarioTask, settlementAuthority: TaskSettlementAuthority): string {
  if (settlementAuthority === 'real_authority') {
    switch (task.taskId) {
      case 'huangtian_task_01_confirm_city':
        return '真实达成：已读取主城设施 / 政务状态，确认玩家进入主城并完成第一小时主城检查。'
      case 'huangtian_task_02_prepare_supplies':
        return '真实达成：已读取势力粮草与木材储备，军需达到第一小时开荒阈值。'
      case 'huangtian_task_03_survey_mines':
        return '真实达成：已读取玩家占有的石铁资源点，周边矿脉侦察目标成立。'
      case 'huangtian_task_04_register_militia':
        return '真实达成：已读取校场 / 编队查看状态，确认乡勇名册进入可调动队伍视图。'
      case 'huangtian_task_05_drill_ground':
        return '真实达成：已读取校场编队准备状态，第一批预备兵训练入口成立。'
      case 'huangtian_task_06_assign_patrol':
        return '真实达成：已读取 AI 活动观察记录，巡队正在检查主城外缘。'
      case 'huangtian_task_07_count_grain':
        return '真实达成：已读取粮草储备，出征前粮草底账达到第一小时阈值。'
      case 'huangtian_task_08_prepare_carts':
        return '真实达成：已读取木材 / 石料储备，粮车和前线搭建材料已准备。'
      case 'huangtian_task_09_mark_supply_route':
        return '真实达成：已读取打开过的战报回执，短程补给路线已由战报建议标定。'
      default:
        return task.progressText
    }
  }

  if (settlementAuthority === 'locked') {
    return task.progressText
  }

  return task.progressText.replace(
    /；?当前可用 achieveTaskPrototype 进行后端合同验证。|原型达成入口：achieveTaskPrototype；/g,
    '',
  )
}

function buildReadModelTask(
  task: ScenarioTask,
  activeTaskId: string | null,
  achievedTaskIds: ReadonlySet<string>,
  claimedTaskIds: ReadonlySet<string>,
  realAuthoritySignalsByTaskId: ReadonlyMap<string, TaskRealAuthoritySignalRef[]>,
): WorldTasksReadModelTask {
  const realAuthoritySignals = realAuthoritySignalsByTaskId.get(task.taskId) ?? []
  const realAuthoritySatisfied = realAuthoritySignals.length > 0 && realAuthoritySignals.every((signal) => signal.satisfied)
  const status = resolveTaskStatus(task.taskId, activeTaskId, achievedTaskIds, claimedTaskIds, realAuthoritySatisfied)
  const claimState = resolveClaimState(status)
  const settlementAuthority = resolveTaskSettlementAuthority(task, realAuthoritySignals, status)

  return {
    ...task,
    progressText: buildTaskProgressText(task, settlementAuthority),
    rewardPreview: task.rewardPreview.map((reward) => ({ ...reward })),
    actionTarget: task.actionTarget ? { ...task.actionTarget } : undefined,
    status,
    claimState,
    canClaim: claimState === 'claimable',
    settlementAuthority,
    realAuthoritySignals: realAuthoritySignals.map((signal) => ({ ...signal })),
  }
}

function resolveTaskStatus(
  taskId: string,
  activeTaskId: string | null,
  achievedTaskIds: ReadonlySet<string>,
  claimedTaskIds: ReadonlySet<string>,
  realAuthoritySatisfied: boolean,
): TaskStatus {
  if (claimedTaskIds.has(taskId)) {
    return 'claimed'
  }
  if (achievedTaskIds.has(taskId) || realAuthoritySatisfied) {
    return 'achieved'
  }
  if (activeTaskId === taskId) {
    return 'active'
  }
  return 'locked'
}

function resolveClaimState(status: TaskStatus): TaskClaimState {
  if (status === 'claimed') {
    return 'claimed'
  }
  if (status === 'achieved') {
    return 'claimable'
  }
  return 'unavailable'
}

function resolveActiveTaskId(
  tasks: readonly ScenarioTask[],
  claimedTaskIds: ReadonlySet<string>,
  realAuthoritySignalsByTaskId: ReadonlyMap<string, TaskRealAuthoritySignalRef[]>,
): string | null {
  return tasks.find((task) => {
    if (claimedTaskIds.has(task.taskId)) {
      return false
    }
    const signals = realAuthoritySignalsByTaskId.get(task.taskId) ?? []
    return signals.length === 0 || signals.some((signal) => !signal.satisfied)
  })?.taskId ?? null
}

function resolveScenarioTaskCatalog(scenarioId: string, scenarioVersion: string): ScenarioTaskCatalog | null {
  return (
    WORLD_TASKS_CATALOG.find(
      (catalog) => catalog.scenarioId === scenarioId && catalog.scenarioVersion === scenarioVersion,
    ) ?? null
  )
}

function resolveChapter(catalog: ScenarioTaskCatalog, chapterId: string): ScenarioTaskChapter | null {
  return catalog.chapters.find((chapter) => chapter.chapterId === chapterId) ?? null
}

function resolveTaskGroup(chapter: ScenarioTaskChapter) {
  return chapter.taskGroups.find((taskGroup) => taskGroup.taskGroupId === chapter.currentTaskGroupId) ?? null
}

function normalizeSeasonTaskState(input: SeasonTaskState | undefined): SeasonTaskState {
  return {
    activeScenarioId: normalizeNonEmptyString(input?.activeScenarioId) ?? DEFAULT_WORLD_TASKS_SCENARIO_ID,
    scenarioVersion: normalizeNonEmptyString(input?.scenarioVersion) ?? DEFAULT_WORLD_TASKS_SCENARIO_VERSION,
    seasonRunId: normalizeNonEmptyString(input?.seasonRunId) ?? DEFAULT_WORLD_TASKS_SEASON_RUN_ID,
    activeChapterId: normalizeNonEmptyString(input?.activeChapterId) ?? DEFAULT_WORLD_TASKS_ACTIVE_CHAPTER_ID,
    achievedTaskIds: uniqueNonEmptyStrings(input?.achievedTaskIds),
    claimedTaskIds: uniqueNonEmptyStrings(input?.claimedTaskIds),
  }
}

function cloneScenarioTaskCatalog(catalog: ScenarioTaskCatalog): ScenarioTaskCatalog {
  return {
    ...catalog,
    chapters: catalog.chapters.map((chapter) => ({
      ...chapter,
      rewardPreview: chapter.rewardPreview.map((reward) => ({ ...reward })),
      taskGroups: chapter.taskGroups.map((taskGroup) => ({
        ...taskGroup,
        tasks: taskGroup.tasks.map((task) => ({
          ...task,
          rewardPreview: task.rewardPreview.map((reward) => ({ ...reward })),
          actionTarget: task.actionTarget ? { ...task.actionTarget } : undefined,
        })),
      })),
    })),
  }
}

function isSameSeasonTaskState(current: SeasonTaskState | undefined, normalized: SeasonTaskState): boolean {
  if (!current) {
    return false
  }

  return (
    current.activeScenarioId === normalized.activeScenarioId &&
    current.scenarioVersion === normalized.scenarioVersion &&
    current.seasonRunId === normalized.seasonRunId &&
    current.activeChapterId === normalized.activeChapterId &&
    current.achievedTaskIds.length === normalized.achievedTaskIds.length &&
    current.claimedTaskIds.length === normalized.claimedTaskIds.length &&
    current.achievedTaskIds.every((taskId, index) => taskId === normalized.achievedTaskIds[index]) &&
    current.claimedTaskIds.every((taskId, index) => taskId === normalized.claimedTaskIds[index])
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
