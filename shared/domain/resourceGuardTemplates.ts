import type { ResourceGuardReadModel, Tile, Unit } from '../contracts/game'

export type ResourceGuardLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type NpcGuardMainSkillTemplate = {
  id: string
  name: string
  power: number
  summary: string
}

export type NpcGuardOrdinarySkillTemplate = {
  id: string
  name: string
  power: number
}

export type NpcGuardUnitTemplate = {
  id: string
  name: string
  title: string
  assetKey: string
  portraitAssetKey: string
  level: number
  cardType: Unit['hero']['cardType']
  troopType: Unit['hero']['troopType']
  archetype: Unit['hero']['archetype']
  strength: number
  mobility: number
  supply: number
  force: number
  command: number
  intelligence: number
  charisma: number
  speed: number
  mainSkill: NpcGuardMainSkillTemplate
  ordinarySkillIds: string[]
}

export type ResourceGuardTemplate = {
  id: string
  resourceLevel: ResourceGuardLevel
  label: string
  unitTemplateIds: string[]
  recommendedAttackerStrength: number
}

export const NPC_GUARD_ORDINARY_SKILL_TEMPLATES: Record<string, NpcGuardOrdinarySkillTemplate> = {
  lib_a_chase_opportunistic_follow: {
    id: 'lib_a_chase_opportunistic_follow',
    name: '乘势追击',
    power: 4,
  },
  lib_a_active_feint_sweep: {
    id: 'lib_a_active_feint_sweep',
    name: '佯攻扫营',
    power: 5,
  },
  lib_a_passive_reserve_guard: {
    id: 'lib_a_passive_reserve_guard',
    name: '守备整训',
    power: 5,
  },
  lib_a_command_vanguard_order: {
    id: 'lib_a_command_vanguard_order',
    name: '先登号令',
    power: 6,
  },
  lib_a_command_archer_drill: {
    id: 'lib_a_command_archer_drill',
    name: '弓阵整备',
    power: 6,
  },
  lib_a_active_crossbow_volley: {
    id: 'lib_a_active_crossbow_volley',
    name: '连弩齐射',
    power: 7,
  },
  lib_s_passive_fortified_mind: {
    id: 'lib_s_passive_fortified_mind',
    name: '固本守心',
    power: 8,
  },
  lib_s_chase_rending_charge: {
    id: 'lib_s_chase_rending_charge',
    name: '破阵追袭',
    power: 9,
  },
}

export const NPC_GUARD_UNIT_TEMPLATES: Record<string, NpcGuardUnitTemplate> = {
  yellow_turban_footman_l1: {
    id: 'yellow_turban_footman_l1',
    name: '黄巾小卒',
    title: '散兵',
    assetKey: 'npc_guard_yellow_turban_recruit',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_yellow_turban_recruit.v2',
    level: 2,
    cardType: '步',
    troopType: 'infantry',
    archetype: 'reserve',
    strength: 16,
    mobility: 3,
    supply: 3,
    force: 38,
    command: 36,
    intelligence: 32,
    charisma: 28,
    speed: 34,
    mainSkill: {
      id: 'npc_guard_scattered_blade',
      name: '乱兵挥砍',
      power: 2,
      summary: '低级守军小额兵刃压制。',
    },
    ordinarySkillIds: [],
  },
  yellow_turban_spearman_l2: {
    id: 'yellow_turban_spearman_l2',
    name: '黄巾枪卒',
    title: '乡勇',
    assetKey: 'npc_guard_yellow_turban_spearman',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_yellow_turban_spearman.v2',
    level: 6,
    cardType: '步',
    troopType: 'infantry',
    archetype: 'guard',
    strength: 24,
    mobility: 3,
    supply: 4,
    force: 42,
    command: 40,
    intelligence: 34,
    charisma: 30,
    speed: 36,
    mainSkill: {
      id: 'npc_guard_rough_charge',
      name: '粗阵冲击',
      power: 3,
      summary: '低级守军单体冲击。',
    },
    ordinarySkillIds: ['lib_a_chase_opportunistic_follow'],
  },
  bandit_scout_l3: {
    id: 'bandit_scout_l3',
    name: '流寇斥候',
    title: '探哨',
    assetKey: 'npc_guard_bandit_scout',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_bandit_scout.v2',
    level: 10,
    cardType: '骑',
    troopType: 'cavalry',
    archetype: 'recon',
    strength: 34,
    mobility: 5,
    supply: 5,
    force: 46,
    command: 42,
    intelligence: 38,
    charisma: 32,
    speed: 48,
    mainSkill: {
      id: 'npc_guard_raid_signal',
      name: '流寇突袭',
      power: 4,
      summary: '守军小额追击压制。',
    },
    ordinarySkillIds: ['lib_a_chase_opportunistic_follow'],
  },
  yellow_turban_archer_l3: {
    id: 'yellow_turban_archer_l3',
    name: '黄巾弓手',
    title: '散射',
    assetKey: 'npc_guard_yellow_turban_archer',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_yellow_turban_archer.v2',
    level: 9,
    cardType: '弓',
    troopType: 'mixed',
    archetype: 'assault',
    strength: 32,
    mobility: 4,
    supply: 5,
    force: 44,
    command: 40,
    intelligence: 40,
    charisma: 32,
    speed: 42,
    mainSkill: {
      id: 'npc_guard_rough_volley',
      name: '粗劣齐射',
      power: 4,
      summary: '守军小额群体箭雨。',
    },
    ordinarySkillIds: ['lib_a_active_feint_sweep'],
  },
  mountain_bandit_leader_l4: {
    id: 'mountain_bandit_leader_l4',
    name: '山贼头目',
    title: '寨主',
    assetKey: 'npc_guard_bandit_leader',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_bandit_leader.v2',
    level: 16,
    cardType: '步',
    troopType: 'mixed',
    archetype: 'heavy',
    strength: 44,
    mobility: 4,
    supply: 6,
    force: 50,
    command: 46,
    intelligence: 40,
    charisma: 38,
    speed: 40,
    mainSkill: {
      id: 'npc_guard_bandit_order',
      name: '贼首号令',
      power: 5,
      summary: '守军小额攻击提升。',
    },
    ordinarySkillIds: ['lib_a_command_vanguard_order'],
  },
  yellow_turban_lifter_l4: {
    id: 'yellow_turban_lifter_l4',
    name: '黄巾力士',
    title: '悍卒',
    assetKey: 'npc_guard_yellow_turban_brute',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_yellow_turban_brute.v2',
    level: 15,
    cardType: '步',
    troopType: 'shield',
    archetype: 'guard',
    strength: 46,
    mobility: 3,
    supply: 6,
    force: 52,
    command: 48,
    intelligence: 36,
    charisma: 34,
    speed: 36,
    mainSkill: {
      id: 'npc_guard_heavy_smash',
      name: '悍卒猛击',
      power: 5,
      summary: '守军单体兵刃压制。',
    },
    ordinarySkillIds: ['lib_a_passive_reserve_guard'],
  },
  local_militia_l5: {
    id: 'local_militia_l5',
    name: '豪强私兵',
    title: '部曲',
    assetKey: 'npc_guard_local_militia',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_local_militia.v2',
    level: 22,
    cardType: '步',
    troopType: 'mixed',
    archetype: 'guard',
    strength: 52,
    mobility: 4,
    supply: 7,
    force: 54,
    command: 52,
    intelligence: 42,
    charisma: 40,
    speed: 42,
    mainSkill: {
      id: 'npc_guard_local_drill',
      name: '私兵列阵',
      power: 6,
      summary: '中级守军列阵压制。',
    },
    ordinarySkillIds: ['lib_a_command_vanguard_order', 'lib_a_passive_reserve_guard'],
  },
  rebel_vanguard_l6: {
    id: 'rebel_vanguard_l6',
    name: '叛军先锋',
    title: '前锋',
    assetKey: 'npc_guard_rebel_vanguard',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_rebel_vanguard.v2',
    level: 29,
    cardType: '骑',
    troopType: 'cavalry',
    archetype: 'mobile',
    strength: 60,
    mobility: 6,
    supply: 7,
    force: 58,
    command: 54,
    intelligence: 44,
    charisma: 40,
    speed: 54,
    mainSkill: {
      id: 'npc_guard_vanguard_raid',
      name: '先锋突阵',
      power: 7,
      summary: '中级守军突击压制。',
    },
    ordinarySkillIds: ['lib_a_active_feint_sweep', 'lib_a_chase_opportunistic_follow'],
  },
  border_hardened_soldier_l7: {
    id: 'border_hardened_soldier_l7',
    name: '边郡悍卒',
    title: '老卒',
    assetKey: 'npc_guard_border_veteran',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_border_veteran.v2',
    level: 35,
    cardType: '步',
    troopType: 'shield',
    archetype: 'heavy',
    strength: 68,
    mobility: 4,
    supply: 8,
    force: 60,
    command: 58,
    intelligence: 46,
    charisma: 42,
    speed: 42,
    mainSkill: {
      id: 'npc_guard_hardened_wall',
      name: '残阵死守',
      power: 8,
      summary: '高级守军防御压制。',
    },
    ordinarySkillIds: ['lib_s_passive_fortified_mind', 'lib_a_command_vanguard_order'],
  },
  rebel_crossbow_l8: {
    id: 'rebel_crossbow_l8',
    name: '乱军弩手',
    title: '强弩',
    assetKey: 'npc_guard_elite_rebel',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_elite_rebel.v2',
    level: 40,
    cardType: '弓',
    troopType: 'mixed',
    archetype: 'assault',
    strength: 74,
    mobility: 4,
    supply: 8,
    force: 62,
    command: 58,
    intelligence: 52,
    charisma: 42,
    speed: 48,
    mainSkill: {
      id: 'npc_guard_crossbow_salvo',
      name: '乱军劲射',
      power: 9,
      summary: '高级守军弩阵压制。',
    },
    ordinarySkillIds: ['lib_a_command_archer_drill', 'lib_a_active_crossbow_volley'],
  },
  elite_rebel_l9: {
    id: 'elite_rebel_l9',
    name: '精锐叛军',
    title: '劲旅',
    assetKey: 'npc_guard_elite_rebel',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_elite_rebel.v2',
    level: 45,
    cardType: '骑',
    troopType: 'cavalry',
    archetype: 'assault',
    strength: 84,
    mobility: 6,
    supply: 9,
    force: 66,
    command: 62,
    intelligence: 50,
    charisma: 46,
    speed: 58,
    mainSkill: {
      id: 'npc_guard_elite_assault',
      name: '乱世强袭',
      power: 10,
      summary: '九级资源地守军压制技。',
    },
    ordinarySkillIds: ['lib_s_chase_rending_charge', 'lib_s_passive_fortified_mind'],
  },
  yellow_turban_commander_l9: {
    id: 'yellow_turban_commander_l9',
    name: '黄巾渠帅',
    title: '渠帅',
    assetKey: 'npc_guard_elite_rebel',
    portraitAssetKey: 'npc_guard.portrait.npc_guard_elite_rebel.v2',
    level: 44,
    cardType: '弓',
    troopType: 'mixed',
    archetype: 'logistics',
    strength: 78,
    mobility: 4,
    supply: 9,
    force: 58,
    command: 64,
    intelligence: 56,
    charisma: 50,
    speed: 46,
    mainSkill: {
      id: 'npc_guard_channel_command',
      name: '渠帅督阵',
      power: 10,
      summary: '九级资源地守军号令技。',
    },
    ordinarySkillIds: ['lib_a_command_archer_drill', 'lib_a_active_crossbow_volley'],
  },
}

export const RESOURCE_GUARD_TEMPLATES: Record<ResourceGuardLevel, ResourceGuardTemplate> = {
  1: {
    id: 'resource_guard_level_1',
    resourceLevel: 1,
    label: '一级资源地守军',
    unitTemplateIds: ['yellow_turban_footman_l1'],
    recommendedAttackerStrength: 20,
  },
  2: {
    id: 'resource_guard_level_2',
    resourceLevel: 2,
    label: '二级资源地守军',
    unitTemplateIds: ['yellow_turban_spearman_l2'],
    recommendedAttackerStrength: 35,
  },
  3: {
    id: 'resource_guard_level_3',
    resourceLevel: 3,
    label: '三级资源地守军',
    unitTemplateIds: ['bandit_scout_l3', 'yellow_turban_archer_l3'],
    recommendedAttackerStrength: 60,
  },
  4: {
    id: 'resource_guard_level_4',
    resourceLevel: 4,
    label: '四级资源地守军',
    unitTemplateIds: ['mountain_bandit_leader_l4', 'yellow_turban_lifter_l4'],
    recommendedAttackerStrength: 85,
  },
  5: {
    id: 'resource_guard_level_5',
    resourceLevel: 5,
    label: '五级资源地守军',
    unitTemplateIds: ['local_militia_l5', 'yellow_turban_lifter_l4', 'bandit_scout_l3'],
    recommendedAttackerStrength: 120,
  },
  6: {
    id: 'resource_guard_level_6',
    resourceLevel: 6,
    label: '六级资源地守军',
    unitTemplateIds: ['rebel_vanguard_l6', 'local_militia_l5', 'yellow_turban_lifter_l4'],
    recommendedAttackerStrength: 155,
  },
  7: {
    id: 'resource_guard_level_7',
    resourceLevel: 7,
    label: '七级资源地守军',
    unitTemplateIds: ['border_hardened_soldier_l7', 'rebel_vanguard_l6', 'local_militia_l5'],
    recommendedAttackerStrength: 190,
  },
  8: {
    id: 'resource_guard_level_8',
    resourceLevel: 8,
    label: '八级资源地守军',
    unitTemplateIds: ['rebel_crossbow_l8', 'border_hardened_soldier_l7', 'rebel_vanguard_l6'],
    recommendedAttackerStrength: 225,
  },
  9: {
    id: 'resource_guard_level_9',
    resourceLevel: 9,
    label: '九级资源地守军',
    unitTemplateIds: ['elite_rebel_l9', 'yellow_turban_commander_l9', 'rebel_crossbow_l8'],
    recommendedAttackerStrength: 260,
  },
}

export function resolveResourceGuardLevel(resourceLevel: number | undefined): ResourceGuardLevel {
  const normalized = Math.max(1, Math.min(9, Math.round(resourceLevel ?? 1)))
  return normalized as ResourceGuardLevel
}

export function resolveResourceGuardTemplateForTile(
  tile: Pick<Tile, 'type' | 'resourceLevel'>,
): ResourceGuardTemplate | null {
  if (tile.type !== 'resource') {
    return null
  }
  return RESOURCE_GUARD_TEMPLATES[resolveResourceGuardLevel(tile.resourceLevel)]
}

export function listResourceGuardTemplates(): ResourceGuardTemplate[] {
  return Object.values(RESOURCE_GUARD_TEMPLATES)
}

export function buildNpcGuardUnitsForResourceTile(tile: Tile): Unit[] {
  const template = resolveResourceGuardTemplateForTile(tile)
  if (!template) {
    return []
  }

  return template.unitTemplateIds.map((unitTemplateId) => {
    const unitTemplate = NPC_GUARD_UNIT_TEMPLATES[unitTemplateId]
    return {
      id: `npc_guard_${tile.id}_${unitTemplate.id}`,
      name: `${unitTemplate.name}所部`,
      faction: 'system_guard',
      corps: {
        name: template.label,
        doctrine: 'resource_guard_fixed_template',
        specialty: 'resource_guard',
        readiness: 100,
        roster: [unitTemplate.name],
      },
      hero: {
        id: `npc_${unitTemplate.id}`,
        name: unitTemplate.name,
        title: unitTemplate.title,
        faction: '群',
        cardType: unitTemplate.cardType,
        quality: '1-N',
        archetype: unitTemplate.archetype,
        level: unitTemplate.level,
        troopType: unitTemplate.troopType,
        avatarKey: unitTemplate.portraitAssetKey,
        portraitKey: unitTemplate.portraitAssetKey,
        force: unitTemplate.force,
        command: unitTemplate.command,
        intelligence: unitTemplate.intelligence,
        charisma: unitTemplate.charisma,
        speed: unitTemplate.speed,
        traits: ['系统守军', `资源地${template.resourceLevel}级`],
        signatureSkill: {
          name: unitTemplate.mainSkill.name,
          detail: unitTemplate.mainSkill.summary,
        },
        growthFocus: '资源地固定系统守军，不进入玩家武将池。',
      },
      tileId: tile.id,
      strength: unitTemplate.strength,
      mobility: unitTemplate.mobility,
      supply: unitTemplate.supply,
      status: '驻防中',
      currentTask: `驻守${tile.name}`,
      coHeroes: [],
    }
  })
}

export function resolveNpcGuardOrdinarySkills(unitTemplate: NpcGuardUnitTemplate): NpcGuardOrdinarySkillTemplate[] {
  return unitTemplate.ordinarySkillIds
    .map((skillId) => NPC_GUARD_ORDINARY_SKILL_TEMPLATES[skillId])
    .filter((skill): skill is NpcGuardOrdinarySkillTemplate => Boolean(skill))
}

export function summarizeNpcGuardUnitTemplate(unitTemplate: NpcGuardUnitTemplate): string {
  const ordinarySkills = resolveNpcGuardOrdinarySkills(unitTemplate)
  const skillNames = [unitTemplate.mainSkill.name, ...ordinarySkills.map((skill) => skill.name)]
  return `${unitTemplate.name} Lv.${unitTemplate.level}[${skillNames.join('/')}]`
}

export function summarizeResourceGuardTemplate(template: ResourceGuardTemplate): string {
  return template.unitTemplateIds
    .map((unitTemplateId) => NPC_GUARD_UNIT_TEMPLATES[unitTemplateId])
    .filter((unitTemplate): unitTemplate is NpcGuardUnitTemplate => Boolean(unitTemplate))
    .map(summarizeNpcGuardUnitTemplate)
    .join('、')
}

export function buildResourceGuardReadModelForTile(
  tile: Pick<Tile, 'type' | 'resourceLevel'>,
): ResourceGuardReadModel | undefined {
  const template = resolveResourceGuardTemplateForTile(tile)
  if (!template) {
    return undefined
  }

  const units = template.unitTemplateIds
    .map((unitTemplateId) => NPC_GUARD_UNIT_TEMPLATES[unitTemplateId])
    .filter((unitTemplate): unitTemplate is NpcGuardUnitTemplate => Boolean(unitTemplate))
    .map((unitTemplate) => {
      const ordinarySkillNames = resolveNpcGuardOrdinarySkills(unitTemplate).map((skill) => skill.name)
      const skillNames = [unitTemplate.mainSkill.name, ...ordinarySkillNames]
      return {
        name: unitTemplate.name,
        assetKey: unitTemplate.assetKey,
        portraitAssetKey: unitTemplate.portraitAssetKey,
        level: unitTemplate.level,
        mainSkillName: unitTemplate.mainSkill.name,
        ordinarySkillNames,
        fixedSkillSummary: `${unitTemplate.name}：${skillNames.join(' / ')}`,
      }
    })

  return {
    templateId: template.id,
    resourceLevel: template.resourceLevel,
    label: template.label,
    recommendedAttackerStrength: template.recommendedAttackerStrength,
    guardNames: units.map((unit) => unit.name),
    skillSummary: units.map((unit) => unit.fixedSkillSummary).join('；'),
    units,
  }
}
