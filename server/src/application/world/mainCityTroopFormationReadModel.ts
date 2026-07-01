import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { GovernedAiPlayerRuntime, GovernedAiPlayerRuntimeDetail } from '../../../../shared/contracts/aiPlayer'
import type { Unit, WorldState } from '../../../../shared/contracts/game/world'
import { listGovernedAiPlayers } from '../ai/AIPlayerGovernanceService'

const TROOP_FORMATION_READ_MODEL_PATH = resolve(
  process.cwd(),
  'godot-client',
  'data',
  'ui',
  'main_city_troop_formation_read_model.json',
)

const AI_SLOT_IDS = ['camp', 'mid', 'front'] as const
const AI_SLOT_LABELS = ['大营', '中军', '前锋'] as const

const FORMAL_PACK_PORTRAIT_BY_HERO_ID: Record<string, string> = {
  '100013': 'formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1',
  '100016': 'formal_pack.portrait.liu_bei_mature_hanzhong_sworddance_face_smile_v2',
  '100017': 'formal_pack.portrait.zhuge_liang_mature_beifa_v1',
  '100021': 'formal_pack.portrait.zhao_yun_youth_changban_rescue_v1',
  '100023': 'formal_pack.portrait.cao_cao_fate_v1',
  '100027': 'formal_pack.portrait.zhang_liao_mature_hefei_v1',
  '100031': 'formal_pack.portrait.zhou_yu_mature_chibi_v1',
  '100090': 'formal_pack.portrait.tai_shi_ci_mature_yishi_v1',
  '100451': 'formal_pack.portrait.guan_yu_mature_mounted_jingzhou_v1',
  '100452': 'formal_pack.portrait.zhang_fei_mature_baxi_v1',
  '100661': 'formal_pack.portrait.lu_bu_mature_wenhou_v1',
  '100708': 'formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1',
  '100710': 'formal_pack.portrait.sun_ce_young_founder_v1',
}

const FORMAL_PACK_PORTRAIT_BY_HERO_NAME: Record<string, string> = {
  曹操: 'formal_pack.portrait.cao_cao_fate_v1',
  刘备: 'formal_pack.portrait.liu_bei_mature_hanzhong_sworddance_face_smile_v2',
  诸葛亮: 'formal_pack.portrait.zhuge_liang_mature_beifa_v1',
  赵云: 'formal_pack.portrait.zhao_yun_youth_changban_rescue_v1',
  张辽: 'formal_pack.portrait.zhang_liao_mature_hefei_v1',
  周瑜: 'formal_pack.portrait.zhou_yu_mature_chibi_v1',
  太史慈: 'formal_pack.portrait.tai_shi_ci_mature_yishi_v1',
  关羽: 'formal_pack.portrait.guan_yu_mature_mounted_jingzhou_v1',
  吕布: 'formal_pack.portrait.lu_bu_mature_wenhou_v1',
  马超: 'formal_pack.portrait.ma_chao_mature_xiliang_retreat_v1',
  孙策: 'formal_pack.portrait.sun_ce_young_founder_v1',
  孙权: 'formal_pack.portrait.sun_quan_mature_successor_v1',
  张飞: 'formal_pack.portrait.zhang_fei_mature_baxi_v1',
  司马懿: 'formal_pack.portrait.sima_yi_fate_gaopingling_v1',
  郭嘉: 'formal_pack.portrait.guo_jia_mature_fate_liaodong_v1',
  荀彧: 'formal_pack.portrait.xun_yu_youth_wangzuo_v1',
}

type MutableJsonObject = Record<string, unknown>

type HeroSlotSource = Unit['hero'] | NonNullable<Unit['coHeroes']>[number]

type FormalUnitBindingSource = 'unit_ai_player_id' | 'faction_ai_player_unit_ids' | 'none'

type FormalUnitBinding = {
  unit?: Unit
  source: FormalUnitBindingSource
}

type FormalUnitLister = (aiPlayerId: string) => FormalUnitBinding[]

type AiTeamIdentity = {
  teamId: string
  teamIndex: number
}

export type MainCityTroopFormationReadModelOptions = {
  world?: WorldState
  factionId?: string
  playerId?: string
  governorPlayerId?: string
  observedAiPlayer?: GovernedAiPlayerRuntimeDetail
  now?: Date
}

export function getMainCityTroopFormationReadModelResponse(
  options: MainCityTroopFormationReadModelOptions = {},
) {
  const raw = readFileSync(TROOP_FORMATION_READ_MODEL_PATH, 'utf-8')
  const template = JSON.parse(raw) as MutableJsonObject
  return {
    mainCityTroopFormation: buildMainCityTroopFormationReadModel(template, options),
  }
}

function buildMainCityTroopFormationReadModel(
  template: MutableJsonObject,
  options: MainCityTroopFormationReadModelOptions,
): MutableJsonObject {
  const factionId = normalizeText(options.factionId) || normalizeText(options.observedAiPlayer?.factionId) || 'player'
  const governorPlayerId =
    normalizeText(options.governorPlayerId) ||
    normalizeText(options.playerId) ||
    normalizeText(options.observedAiPlayer?.governorPlayerId) ||
    'human_alpha'
  const now = options.now ?? new Date()
  const templateTeams = toRecordArray(template.teams)
  const humanTeams = templateTeams
    .filter((team) => normalizeText(team.owner_type) === 'human')
    .map((team, index) => personalizeHumanTeam(team, factionId, governorPlayerId, resolveHumanFormalUnit(options.world, factionId, team, index)))
  const aiPlayers = resolveGovernedAiPlayers(options, factionId, governorPlayerId)
  const listFormalUnits = createFormalUnitLister(options.world, factionId)
  const aiTeams = aiPlayers.flatMap((aiPlayer, aiPlayerIndex) => {
    const formalBindings = listFormalUnits(aiPlayer.aiPlayerId)
    const bindings = formalBindings.length > 0 ? formalBindings : [{ source: 'none' as const }]
    return bindings.map((formalBinding, bindingIndex) => {
      const teamIdentity = resolveAiTeamIdentity(aiPlayerIndex, bindingIndex, formalBinding)
      return buildAiTeamFromRuntime(
        aiPlayer,
        selectAiTemplateTeam(templateTeams, aiPlayerIndex + bindingIndex),
        factionId,
        teamIdentity,
        formalBinding,
      )
    })
  })
  const fallbackAiTeams =
    aiTeams.length > 0
      ? []
      : templateTeams
          .filter((team) => normalizeText(team.owner_type) === 'ai')
          .map((team, index) => {
            const teamIdentity = resolveAiTeamIdentity(index)
            return {
              ...team,
              team_id: normalizeText(team.id) || teamIdentity.teamId,
              team_index: teamIdentity.teamIndex,
              team_bind_source: 'none',
              read_model_source: 'static_visual_fallback_no_governed_ai_player',
              source_warning: 'No governed AI player runtime was registered for this faction.',
            }
          })

  return {
    ...template,
    schema_version: normalizeText(template.schema_version) || 'main_city_troop_formation_read_model_v4',
    data_source: 'backend_ai_player_main_city_state_v1',
    read_model_authority_source: 'backend_ai_player_main_city_state_v1',
    generated_at: now.toISOString(),
    faction_id: factionId,
    governor_player_id: governorPlayerId,
    teams: [...humanTeams, ...aiTeams, ...fallbackAiTeams],
  }
}

function personalizeHumanTeam(
  team: MutableJsonObject,
  factionId: string,
  governorPlayerId: string,
  formalUnit?: Unit,
): MutableJsonObject {
  return {
    ...team,
    faction_id: factionId,
    governor_player_id: governorPlayerId,
    controller_label: '真人玩家',
    source_unit_id: formalUnit?.id,
    source_team_id: formalUnit?.teamId,
    source_team_index: formalUnit?.teamIndex,
    team_bind_source: formalUnit ? 'world_player_unit_team_id' : 'none',
    read_model_source: formalUnit ? 'world_player_unit_coheroes' : 'world_faction_main_city_state',
    slots: formalUnit
      ? buildAiSlotsFromFormalUnit(formalUnit, team, '真人玩家')
      : toRecordArray(team.slots).map((slot) => ({
          ...slot,
          controller_label: '真人玩家',
        })),
  }
}

function resolveHumanFormalUnit(
  world: WorldState | undefined,
  factionId: string,
  templateTeam: MutableJsonObject,
  index: number,
): Unit | undefined {
  if (!world) {
    return undefined
  }
  const teamId = normalizeText(templateTeam.id) || `team_${String(index + 1).padStart(2, '0')}`
  const teamIndex = index + 1
  return world.units.find((unit) =>
    unit.faction === factionId &&
    normalizeText(unit.aiPlayerId) === '' &&
    (normalizeText(unit.teamId) === teamId || unit.teamIndex === teamIndex)
  )
}

function resolveGovernedAiPlayers(
  options: MainCityTroopFormationReadModelOptions,
  factionId: string,
  governorPlayerId: string,
): GovernedAiPlayerRuntime[] {
  if (options.observedAiPlayer) {
    return [options.observedAiPlayer]
  }
  return listGovernedAiPlayers({
    factionId,
    governorPlayerId,
  })
}

function createFormalUnitLister(world: WorldState | undefined, factionId: string): FormalUnitLister {
  const usedUnitIds = new Set<string>()
  const eligibleUnits = (world?.units ?? [])
    .filter((unit) => unit.faction === factionId)
    .filter(hasThreeHeroFormation)
  const unitsById = new Map(eligibleUnits.map((unit) => [unit.id, unit]))
  const factionAiPlayers = world?.factions?.[factionId]?.aiPlayers ?? []

  return (aiPlayerId: string): FormalUnitBinding[] => {
    const bindings: FormalUnitBinding[] = []
    for (const unit of eligibleUnits) {
      if (unit.aiPlayerId !== aiPlayerId || usedUnitIds.has(unit.id)) {
        continue
      }
      usedUnitIds.add(unit.id)
      bindings.push({ unit, source: 'unit_ai_player_id' })
    }

    const aiPlayerGroup = factionAiPlayers.find((candidate) => candidate.id === aiPlayerId)
    const groupedUnits = (aiPlayerGroup?.unitIds ?? [])
      .map((unitId) => unitsById.get(unitId))
      .filter(isUnit)
    for (const unit of groupedUnits) {
      if (usedUnitIds.has(unit.id)) {
        continue
      }
      usedUnitIds.add(unit.id)
      bindings.push({ unit, source: 'faction_ai_player_unit_ids' })
    }

    return bindings.sort(compareFormalUnitBindings)
  }
}

function hasThreeHeroFormation(unit: Unit): boolean {
  return [unit.hero, ...(unit.coHeroes ?? [])].length >= 3
}

function isUnit(unit: Unit | undefined): unit is Unit {
  return Boolean(unit)
}

function compareFormalUnitBindings(left: FormalUnitBinding, right: FormalUnitBinding): number {
  const leftUnit = left.unit
  const rightUnit = right.unit
  const leftTeamIndex = typeof leftUnit?.teamIndex === 'number' ? leftUnit.teamIndex : Number.MAX_SAFE_INTEGER
  const rightTeamIndex = typeof rightUnit?.teamIndex === 'number' ? rightUnit.teamIndex : Number.MAX_SAFE_INTEGER
  if (leftTeamIndex !== rightTeamIndex) {
    return leftTeamIndex - rightTeamIndex
  }
  const leftTeamId = normalizeText(leftUnit?.teamId)
  const rightTeamId = normalizeText(rightUnit?.teamId)
  if (leftTeamId !== rightTeamId) {
    return leftTeamId.localeCompare(rightTeamId)
  }
  return normalizeText(leftUnit?.id).localeCompare(normalizeText(rightUnit?.id))
}

function resolveAiTeamIdentity(aiPlayerIndex: number, bindingIndex = 0, formalBinding?: FormalUnitBinding): AiTeamIdentity {
  const unitTeamId = normalizeText(formalBinding?.unit?.teamId)
  const unitTeamIndex = formalBinding?.unit?.teamIndex
  if (unitTeamId !== '' && typeof unitTeamIndex === 'number' && unitTeamIndex > 0) {
    return { teamId: unitTeamId, teamIndex: unitTeamIndex }
  }
  const teamIndex = aiPlayerIndex + bindingIndex + 2
  return {
    teamId: aiPlayerIndex === 0 && bindingIndex === 0 ? 'team_02' : `ai_team_${teamIndex}`,
    teamIndex,
  }
}

function selectAiTemplateTeam(templateTeams: MutableJsonObject[], index: number): MutableJsonObject {
  const aiTemplates = templateTeams.filter((team) => normalizeText(team.owner_type) === 'ai')
  if (aiTemplates.length > 0) {
    return aiTemplates[index % aiTemplates.length]
  }
  const fallback = templateTeams[index % Math.max(templateTeams.length, 1)]
  return fallback ?? {}
}

function buildAiTeamFromRuntime(
  aiPlayer: GovernedAiPlayerRuntime,
  templateTeam: MutableJsonObject,
  fallbackFactionId: string,
  teamIdentity: AiTeamIdentity,
  formalBinding: FormalUnitBinding,
): MutableJsonObject {
  const aiPlayerName = normalizeText(aiPlayer.displayName) || aiPlayer.aiPlayerId
  const teamName = formalBinding.unit ? `第${teamIdentity.teamIndex}队` : normalizeText(templateTeam.name) || `第${teamIdentity.teamIndex}队`
  const controllerLabel = `AI玩家 / ${aiPlayerName}`
  return {
    ...templateTeam,
    id: teamIdentity.teamId,
    team_id: teamIdentity.teamId,
    team_index: teamIdentity.teamIndex,
    name: teamName,
    title: teamName,
    owner_type: 'ai',
    faction_id: normalizeText(aiPlayer.factionId) || fallbackFactionId,
    governor_player_id: aiPlayer.governorPlayerId,
    ai_player_id: aiPlayer.aiPlayerId,
    ai_player_name: aiPlayerName,
    controller_label: controllerLabel,
    status: normalizeText(templateTeam.status) || 'AI托管',
    read_model_source: 'governed_ai_player_runtime',
    home_city_id: aiPlayer.homeCityId,
    home_city_tile_id: aiPlayer.homeCityTileId,
    home_city_binding_status: aiPlayer.homeCityBindingStatus,
    source_unit_id: formalBinding.unit?.id,
    source_team_id: formalBinding.unit?.teamId,
    source_team_index: formalBinding.unit?.teamIndex,
    team_bind_source: formalBinding.source,
    slots: formalBinding.unit
      ? buildAiSlotsFromFormalUnit(formalBinding.unit, templateTeam, controllerLabel)
      : buildAiSlotsFromTemplate(templateTeam, controllerLabel),
  }
}

function buildAiSlotsFromFormalUnit(
  unit: Unit,
  templateTeam: MutableJsonObject,
  controllerLabel: string,
): MutableJsonObject[] {
  const templateSlots = toRecordArray(templateTeam.slots)
  const heroes: HeroSlotSource[] = [unit.hero, ...(unit.coHeroes ?? [])].slice(0, 3)
  return heroes.map((hero, index) => {
    const templateSlot = templateSlots[index] ?? {}
    const hasHero = normalizeHeroId(hero.id) !== '' || normalizeText(hero.name) !== ''
    const troopType = normalizeTroopType(hero.troopType)
    const portraitAssetKey = resolveFormalPackPortraitAssetKey(hero)
    return {
      ...templateSlot,
      slot: AI_SLOT_IDS[index] ?? `slot_${index + 1}`,
      label: AI_SLOT_LABELS[index] ?? `第${index + 1}位`,
      hero_id: normalizeHeroId(hero.id),
      general_name: hero.name,
      level: hero.level,
      troop_type: troopType,
      soldiers_current: hasHero ? templateSlot.soldiers_current : 0,
      soldiers_max: hasHero ? templateSlot.soldiers_max : 0,
      slot_state: hasHero ? 'assigned' : 'empty',
      portrait_asset_key: hasHero ? portraitAssetKey : '',
      asset_ref: hasHero ? mergeHeroAssetRef(templateSlot.asset_ref, hero, portraitAssetKey) : {},
      unit_asset_ref: hasHero ? resolveUnitAssetRef(templateSlot.unit_asset_ref, troopType) : {},
      controller_label: controllerLabel,
      read_model_source: 'world_unit_coheroes',
      source_unit_id: unit.id,
    }
  })
}

function buildAiSlotsFromTemplate(templateTeam: MutableJsonObject, controllerLabel: string): MutableJsonObject[] {
  const fallbackSlots = toRecordArray(templateTeam.slots)
  const normalizedSlots = fallbackSlots.length > 0 ? fallbackSlots : [{ slot: 'camp' }, { slot: 'mid' }, { slot: 'front' }]
  return normalizedSlots.slice(0, 3).map((slot, index) => ({
    ...slot,
    slot: normalizeText(slot.slot) || AI_SLOT_IDS[index] || `slot_${index + 1}`,
    label: normalizeText(slot.label) || AI_SLOT_LABELS[index] || `第${index + 1}位`,
    general_name: normalizeText(slot.general_name) || ['刘备', '关羽', '张飞'][index] || '未配置',
    controller_label: controllerLabel,
    read_model_source: 'static_visual_template_pending_formal_unit',
  }))
}

function mergeHeroAssetRef(value: unknown, hero: HeroSlotSource, portraitAssetKey = resolveFormalPackPortraitAssetKey(hero)): MutableJsonObject {
  const assetRef = isRecord(value) ? { ...value } : {}
  return {
    ...assetRef,
    assetKind: normalizeText(assetRef.assetKind) || 'hero_portrait',
    heroId: normalizeHeroId(hero.id),
    portraitAssetKey,
  }
}

function resolveUnitAssetRef(value: unknown, troopType: string): unknown {
  if (isRecord(value)) {
    return value
  }
  return {
    kind: 'unit_frame_manifest_visual_type',
    visualType: resolveUnitVisualType(troopType),
    manifest: 'res://assets/themes/slgclient/manifests/unit_frames_manifest.json',
    direction: 'r',
    sequence: 7,
  }
}

function resolveUnitVisualType(troopType: string): string {
  switch (troopType) {
    case '骑兵':
      return 'cavalry'
    case '弓兵':
      return 'archer'
    default:
      return 'infantry'
  }
}

function normalizeTroopType(troopType: string): string {
  switch (troopType) {
    case '':
      return ''
    case 'cavalry':
      return '骑兵'
    case 'archer':
      return '弓兵'
    default:
      return '步兵'
  }
}

function normalizeHeroId(heroId: string): string {
  return heroId.startsWith('hero_') ? heroId.slice('hero_'.length) : heroId
}

function resolveFormalPackPortraitAssetKey(hero: HeroSlotSource): string {
  const existingKey = normalizeText(hero.portraitKey)
  if (existingKey.startsWith('formal_pack.portrait.')) {
    return existingKey
  }
  const heroId = normalizeHeroId(hero.id)
  return FORMAL_PACK_PORTRAIT_BY_HERO_ID[heroId] ?? FORMAL_PACK_PORTRAIT_BY_HERO_NAME[normalizeText(hero.name)] ?? existingKey
}

function toRecordArray(value: unknown): MutableJsonObject[] {
  if (!Array.isArray(value)) {
    return []
  }
  return value.filter((item): item is MutableJsonObject => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
}

function isRecord(value: unknown): value is MutableJsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
