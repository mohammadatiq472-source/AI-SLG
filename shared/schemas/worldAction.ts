import { z } from 'zod'
import type { WorldActionRequest } from '../contracts/game'
import { actionTypeSchema, strategicPlanSchema, planSourceSchema } from './planning'
import { civilMemoryEventTypeSchema } from './civilMemory'

const factionIdSchema = z.string().min(1).max(64)
const allianceStanceSchema = z.enum(['hold', 'support', 'harass', 'expand'])
const executionEnqueueModeSchema = z.enum(['replace', 'append', 'reject_if_active'])
const tacticalTemplateIdSchema = z.enum(['rally', 'harass', 'withdraw', 'breakthrough', 'sweep', 'garrison'])
const cityTechTrackIdSchema = z.enum(['governance', 'logistics', 'defense', 'recruitment'])
const generalTacticIdSchema = z.enum(['assault', 'guard', 'logistics'])
const aiAgendaActionIdSchema = z.enum(['agenda_expand', 'agenda_support', 'agenda_stabilize', 'agenda_recover', 'agenda_redeploy'])
const resourceTransferBundleSchema = z.object({
  food: z.number().int().positive().optional(),
  wood: z.number().int().positive().optional(),
  stone: z.number().int().positive().optional(),
  iron: z.number().int().positive().optional(),
  copper: z.number().int().positive().optional(),
}).strict().refine(
  (value) => Object.values(value).some((amount) => typeof amount === 'number' && amount > 0),
  { message: 'at least one positive resource amount is required' },
)

const generalDirectiveSchema = z.object({
  generalId: z.string().min(1),
  instruction: z.string().min(1).max(400),
  targetTileId: z.string().min(1).optional(),
  action: actionTypeSchema.optional(),
})

const mapCellCoordinateSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative(),
}).strict()

export const worldActionRequestSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('appendPlanningJobHistory'),
    payload: z.object({
      entry: z.object({
        id: z.string().min(1),
        status: z.enum(['queued', 'running', 'succeeded', 'failed', 'stale']),
        sourceMode: planSourceSchema,
        strategicCommand: z.string().min(1).max(400),
        requestedTick: z.number().int().nonnegative(),
        requestedWorldVersion: z.number().int().nonnegative(),
        message: z.string().min(1),
        resolvedSource: planSourceSchema.optional(),
        plannerNote: z.string().max(2000).optional(),
        plannerExplanation: z.string().max(1000).optional(),
        planningRationale: z.array(z.string().max(240)).max(8).optional(),
        completedTick: z.number().int().nonnegative().optional(),
        completedWorldVersion: z.number().int().nonnegative().optional(),
        plan: strategicPlanSchema.optional(),
      }),
    }),
  }),
  z.object({
    action: z.literal('queuePlanExecution'),
    payload: z.object({
      plan: strategicPlanSchema,
      source: planSourceSchema,
      strategicCommand: z.string().min(1).max(400),
      requestId: z.string().min(1),
      basedOnWorldVersion: z.number().int().nonnegative(),
      factionId: factionIdSchema.optional(),
      plannerNote: z.string().max(2000).optional(),
      plannerExplanation: z.string().max(1000).optional(),
      planningRationale: z.array(z.string().max(240)).max(8).optional(),
      dispatchGenerals: z.boolean().optional(),
      generalConcurrency: z.number().int().min(1).max(32).optional(),
      generalSide: factionIdSchema.optional(),
      generalDirectives: z.array(generalDirectiveSchema).max(32).optional(),
      executionMode: executionEnqueueModeSchema.optional(),
      expectedExecutionRequestId: z.string().min(1).optional(),
    }),
  }),
  z.object({
    action: z.literal('previewGeneralDirectives'),
    payload: z.object({
      directives: z.array(generalDirectiveSchema).min(1).max(32),
      side: factionIdSchema.optional(),
      basePlan: strategicPlanSchema.optional(),
    }),
  }),
  z.object({
    action: z.literal('previewDomainAgenda'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      domainId: z.string().min(1).max(128).optional(),
      includeMessages: z.boolean().optional(),
    }).optional(),
  }),
  z.object({
    action: z.literal('previewNationalAgenda'),
    payload: z.object({
      maxOptions: z.number().int().min(1).max(9).optional(),
    }).optional(),
  }),
  z.object({
    action: z.literal('previewCourtSession'),
    payload: z.object({
      maxProposals: z.number().int().min(1).max(9).optional(),
      maxOptions: z.number().int().min(1).max(9).optional(),
    }).optional(),
  }),
  z.object({
    action: z.literal('queryCivilMemory'),
    payload: z.object({
      limit: z.number().int().min(1).max(500).optional(),
      type: civilMemoryEventTypeSchema.optional(),
      tickFrom: z.number().int().nonnegative().optional(),
      tickTo: z.number().int().nonnegative().optional(),
      factionId: factionIdSchema.optional(),
      relatedId: z.string().min(1).max(128).optional(),
    }).optional(),
  }),
  z.object({
    action: z.literal('setGeneralTactic'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      heroId: z.string().min(1).max(128),
      tacticId: generalTacticIdSchema,
    }),
  }),
  z.object({
    action: z.literal('upgradeTacticalSkill'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      heroId: z.string().min(1).max(128),
      skillId: z.string().min(1).max(128),
    }),
  }),
  z.object({
    action: z.literal('setGeneralActiveHero'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      heroId: z.string().min(1).max(128),
    }),
  }),
  z.object({
    action: z.literal('queueAiAgendaAction'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      agendaActionId: aiAgendaActionIdSchema,
    }),
  }),
  z.object({
    action: z.literal('setAiContextFocus'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      contextFocusId: z.enum(['focus_city', 'focus_troop', 'focus_alliance', 'focus_team']),
      teamId: z.string().min(1).max(128).optional(),
      teamIndex: z.number().int().min(1).max(999).optional(),
      aiPlayerId: z.string().min(1).max(128).optional(),
      teamName: z.string().min(1).max(128).optional(),
      ownerType: z.string().min(1).max(64).optional(),
      heroNames: z.array(z.string().min(1).max(64)).max(3).optional(),
    }),
  }),
  z.object({ action: z.literal('advanceTick') }),
  z.object({ action: z.literal('clearPlanExecution'), payload: z.object({ factionId: factionIdSchema.optional() }).optional() }),
  z.object({
    action: z.literal('moveUnit'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      unitId: z.string().min(1),
      targetTileId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('previewMovementGeography'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      unitId: z.string().min(1).optional(),
      fromTileId: z.string().min(1),
      targetTileId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('deployReserveHero'),
    payload: z.object({
      factionId: factionIdSchema,
      heroId: z.string().min(1),
      coHeroIds: z.array(z.string().min(1).max(128)).max(2).optional(),
      tileId: z.string().min(1),
      aiPlayerId: z.string().min(1).max(128).optional(),
      teamId: z.string().min(1).max(128).optional(),
      teamIndex: z.number().int().min(1).max(999).optional(),
    }),
  }),
  z.object({
    action: z.literal('configureDeployedUnitFormation'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      unitId: z.string().min(1).max(128).optional(),
      teamId: z.string().min(1).max(128).optional(),
      teamIndex: z.number().int().min(1).max(999).optional(),
      heroIds: z.array(z.string().max(128)).min(3).max(3),
    }),
  }),
  z.object({
    action: z.literal('upgradeHeroStar'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      heroId: z.string().min(1).max(128),
    }),
  }),
  z.object({
    action: z.literal('upgradeCity'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      tileId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('upgradeCityTech'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      tileId: z.string().min(1),
      techId: cityTechTrackIdSchema,
    }),
  }),
  z.object({
    action: z.literal('promoteCityBuilding'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      cityId: z.string().min(1),
      groupId: z.string().min(1),
      buildingId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('queueTacticalOverride'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      unitId: z.string().min(1),
      templateId: tacticalTemplateIdSchema,
      targetTileId: z.string().min(1),
      summary: z.string().min(1).max(400),
    }),
  }),
  z.object({
    action: z.literal('updateAllianceDirective'),
    payload: z.object({
      regionId: z.string().min(1),
      stance: allianceStanceSchema,
    }),
  }),
  z.object({
    action: z.literal('updateAllianceFrontlineMarker'),
    payload: z.object({
      markerId: z.string().trim().min(1).max(128),
      factionId: factionIdSchema.optional(),
      label: z.string().trim().min(1).max(48),
      fromCell: mapCellCoordinateSchema,
      toCell: mapCellCoordinateSchema,
      actorCommanderId: z.string().trim().min(1).max(128).optional(),
      note: z.string().trim().max(160).optional(),
      visibility: z.literal('alliance').optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('allianceHelp'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      regionId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('claimReward'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      rewardId: z.string().min(1).max(128).optional(),
    }).optional(),
  }),
  z.object({
    action: z.literal('achieveWorldAffairsNode'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      scenarioId: z.string().trim().min(1).max(128),
      scenarioVersion: z.string().trim().min(1).max(128),
      seasonRunId: z.string().trim().min(1).max(128).optional(),
      nodeId: z.string().trim().min(1).max(128),
    }).strict(),
  }),
  z.object({
    action: z.literal('claimWorldAffairsNodeReward'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      scenarioId: z.string().trim().min(1).max(128),
      scenarioVersion: z.string().trim().min(1).max(128),
      seasonRunId: z.string().trim().min(1).max(128).optional(),
      nodeId: z.string().trim().min(1).max(128),
    }).strict(),
  }),
  z.object({
    action: z.literal('achieveTaskPrototype'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      scenarioId: z.string().trim().min(1).max(128),
      scenarioVersion: z.string().trim().min(1).max(128),
      seasonRunId: z.string().trim().min(1).max(128).optional(),
      taskId: z.string().trim().min(1).max(128),
    }).strict(),
  }),
  z.object({
    action: z.literal('claimTaskReward'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      scenarioId: z.string().trim().min(1).max(128),
      scenarioVersion: z.string().trim().min(1).max(128),
      seasonRunId: z.string().trim().min(1).max(128).optional(),
      taskId: z.string().trim().min(1).max(128),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordWorldTaskEvent'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      scenarioId: z.string().trim().min(1).max(128),
      scenarioVersion: z.string().trim().min(1).max(128),
      seasonRunId: z.string().trim().min(1).max(128).optional(),
      taskId: z.string().trim().min(1).max(128),
      kind: z.enum([
        'main_city_opened',
        'resource_stockpile_ready',
        'resource_scouted',
        'troop_formation_viewed',
        'troop_formation_prepared',
        'ai_activity_observed',
        'battle_report_opened',
      ]),
      source: z.enum(['player_ui', 'ai_trace', 'battle_report', 'system']).optional(),
      sourceId: z.string().trim().min(1).max(160).optional(),
      summary: z.string().trim().min(1).max(240).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('issueClaimableReward'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      rewardId: z.string().min(1).max(128).optional(),
      ledgerKey: z.string().trim().min(1).max(160).optional(),
      source: z.enum(['daily_welfare', 'event_reward']),
      label: z.string().trim().min(1).max(80).optional(),
      summary: z.string().trim().min(1).max(240).optional(),
      reward: z.object({
        food: z.number().int().nonnegative(),
        ap: z.number().int().nonnegative(),
      }).strict().refine(
        (reward) => reward.food + reward.ap > 0,
        { message: 'reward must include food or action points' },
      ),
    }).strict(),
  }),
  z.object({
    action: z.literal('transferFactionResourcesToGovernor'),
    payload: z.object({
      sourceFactionId: factionIdSchema,
      sourceAiPlayerId: z.string().min(1).max(80),
      governorPlayerId: z.string().min(1).max(80),
      resources: resourceTransferBundleSchema,
      reason: z.string().min(1).max(400),
      approvedBy: z.string().min(1).max(80),
    }).strict(),
  }),
  z.object({
    action: z.literal('seaPatrolScout'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      routeId: z.string().min(1).max(160),
      sourceDockId: z.string().min(1).max(160),
      overseasContactId: z.string().min(1).max(160),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
      inventoryFleetId: z.string().min(1).max(160).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('seaPatrolIntercept'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      routeId: z.string().min(1).max(160),
      sourceDockId: z.string().min(1).max(160),
      overseasContactId: z.string().min(1).max(160),
      attackerVesselType: z.enum(['light_patrol_warship', 'interceptor_warship', 'transport_warship']),
      defenderVesselType: z.enum(['light_patrol_warship', 'interceptor_warship', 'transport_warship']),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
      inventoryFleetId: z.string().min(1).max(160).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('createNavalFleet'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      routeId: z.string().min(1).max(160),
      sourceDockId: z.string().min(1).max(160),
      overseasContactId: z.string().min(1).max(160),
      vesselType: z.enum(['light_patrol_warship', 'interceptor_warship', 'transport_warship']),
      carriedUnitIds: z.array(z.string().min(1).max(120)).max(3).optional(),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('sailNavalRoute'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      fleetId: z.string().min(1).max(160),
      routeId: z.string().min(1).max(160),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('resolveNavalCombatSettlement'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      routeId: z.string().min(1).max(160),
      attackerFleetId: z.string().min(1).max(160),
      defenderFleetId: z.string().min(1).max(160),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
      inventoryFleetId: z.string().min(1).max(160).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('repairNavalFleetDamage'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      fleetId: z.string().min(1).max(160),
      routeId: z.string().min(1).max(160),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('buildNavalWarshipAtHarbor'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      routeId: z.string().min(1).max(160),
      sourceDockId: z.string().min(1).max(160),
      overseasContactId: z.string().min(1).max(160),
      shipClass: z.enum(['light_patrol_warship', 'interceptor_warship', 'transport_warship']),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('openNavalHarborInventory'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      harborId: z.string().min(1).max(160),
      inventoryFleetId: z.string().min(1).max(180).optional(),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('readNavalRouteEncounter'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      routeId: z.string().min(1).max(160),
      harborId: z.string().min(1).max(160),
      inventoryFleetId: z.string().min(1).max(180).optional(),
      missionType: z.enum(['patrol', 'intercept', 'escort', 'hold']),
      routeRisk: z.number().min(0).max(100).optional(),
      seaWeatherRisk: z.number().min(0).max(100).optional(),
      enemyPresence: z.enum(['none', 'scout', 'raider', 'fleet', 'convoy']),
      enemyStrength: z.number().min(0).max(100).optional(),
      fleetStrength: z.number().min(0).max(100).optional(),
      durabilityPercent: z.number().min(0).max(100).optional(),
      supplyReadiness: z.number().min(0).max(100).optional(),
      patrolIntensity: z.number().min(0).max(100).optional(),
      allySupport: z.number().min(0).max(100).optional(),
      distanceFromHarbor: z.number().min(0).max(100).optional(),
      actorAiPlayerId: z.string().min(1).max(120).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('setAiResourceTransferPolicy'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      dailyQuotaTotal: z.number().int().positive().max(10_000).optional(),
      dailyWindowTicks: z.number().int().positive().max(365).optional(),
      cooldownTicks: z.number().int().nonnegative().max(365).optional(),
    }).strict().refine(
      (value) =>
        value.dailyQuotaTotal !== undefined ||
        value.dailyWindowTicks !== undefined ||
        value.cooldownTicks !== undefined,
      { message: 'at least one resource transfer policy field is required' },
    ),
  }),
  z.object({
    action: z.literal('claimGovernorResourceInbox'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      governorPlayerId: z.string().min(1).max(80),
      transferId: z.string().min(1).max(160).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('gatherAiResourceTile'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      aiPlayerId: z.string().min(1).max(80),
      unitId: z.string().min(1).max(120),
      tileId: z.string().min(1).max(120),
    }).strict(),
  }),
  z.object({
    action: z.literal('occupyTile'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      aiPlayerId: z.string().min(1).max(80).optional(),
      unitId: z.string().min(1).max(120),
      tileId: z.string().min(1).max(120),
    }).strict(),
  }),
  z.object({
    action: z.literal('seedBattleReportClosure'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      aiPlayerId: z.string().min(1).max(80).optional(),
      organizationId: z.string().min(1).max(120).optional(),
      organizationName: z.string().min(1).max(120).optional(),
      organizationKind: z.enum(['alliance', 'nation']).optional(),
      repeatCount: z.number().int().min(1).max(16).optional(),
      allowReusableSeedTargets: z.boolean().optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('seedRecruitDrawFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      minimumDrawCount: z.number().int().min(1).max(10).optional(),
      minimumProspectCount: z.number().int().min(1).max(20).optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('seedNationEmpireSuccessFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('issueNationMidgameLuoyangAuthorityClaim'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      sourcePageId: z.literal('nation/midgame'),
      targetLabel: z.literal('洛阳'),
      organizationId: z.string().min(1).max(120).optional(),
      nationObjectiveId: z.string().min(1).max(160).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordNationMidgameLuoyangBattleReportFeedback'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      sourceLuoyangContestId: z.string().min(1).max(220),
      sourcePageId: z.literal('nation/midgame'),
      targetLabel: z.literal('洛阳'),
      organizationId: z.string().min(1).max(120).optional(),
      reportStatus: z.literal('recorded').optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordNationMidgameLuoyangControlAuthority'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      sourceLuoyangContestId: z.string().min(1).max(220),
      sourceOrganizationReportId: z.string().min(1).max(220).optional(),
      sourcePageId: z.literal('nation/midgame'),
      targetLabel: z.literal('洛阳'),
      organizationId: z.string().min(1).max(120).optional(),
      controlStatus: z.literal('recorded').optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordNationMidgameLuoyangPrefectureControlJudgment'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      sourceControlAuthorityId: z.string().min(1).max(220),
      sourceLuoyangControlProgressId: z.string().min(1).max(220),
      sourcePageId: z.literal('nation/midgame'),
      targetLabel: z.literal('洛阳'),
      organizationId: z.string().min(1).max(120).optional(),
      nextStepLabel: z.string().min(1).max(80).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordNationMidgameCityControlJudgment'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      cityId: z.string().min(1).max(160),
      cityName: z.string().min(1).max(80),
      administrativeRole: z.union([
        z.literal('state_government'),
        z.literal('commandery_seat'),
        z.literal('city'),
      ]).optional(),
      sourceControlAuthorityId: z.string().min(1).max(220),
      sourceControlProgressId: z.string().min(1).max(220),
      sourcePageId: z.literal('nation/midgame'),
      organizationId: z.string().min(1).max(120).optional(),
      nextStepLabel: z.string().min(1).max(80).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordNationMidgameRealmObjectiveBridge'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      sourceControlAuthorityId: z.string().min(1).max(220),
      sourceLuoyangControlProgressId: z.string().min(1).max(220),
      sourcePageId: z.literal('nation/midgame'),
      targetLabel: z.union([
        z.literal('王国目标'),
        z.literal('帝国目标'),
        z.literal('洛阳前置'),
      ]),
      organizationId: z.string().min(1).max(120).optional(),
      nextStepLabel: z.string().min(1).max(80).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('recordNationMidgameLongTermControlTickPrecondition'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      cityId: z.string().min(1).max(160),
      cityName: z.string().min(1).max(80),
      administrativeRole: z.union([
        z.literal('state_government'),
        z.literal('commandery_seat'),
        z.literal('city'),
      ]).optional(),
      sourceControlAuthorityId: z.string().min(1).max(220),
      sourceControlProgressId: z.string().min(1).max(220),
      sourcePageId: z.literal('nation/midgame'),
      organizationId: z.string().min(1).max(120).optional(),
      tickAdvanceCount: z.number().int().min(1).max(30).optional(),
      nextStepLabel: z.string().min(1).max(80).optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('seedMapUnitVisualSouthExitFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      originTileId: z.string().min(1).max(120).optional(),
      targetTileId: z.string().min(1).max(120).optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('seedTileActionHudExpeditionFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      tileId: z.string().min(1).max(120).optional(),
      unitId: z.string().min(1).max(120).optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('seedProductionResourceTileActionHudFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      tileId: z.string().min(1).max(120).optional(),
      unitId: z.string().min(1).max(120).optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('seedZeroLevelSubstrateTileActionHudFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      tileId: z.string().min(1).max(120).optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('buildResourceTileCoverageMatrixFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('seedMainCityTroopFormationMultiTeamFixture'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      aiPlayerId: z.string().min(1).max(80).optional(),
      firstTeamId: z.string().min(1).max(128).optional(),
      secondTeamId: z.string().min(1).max(128).optional(),
      firstTeamIndex: z.number().int().min(1).max(999).optional(),
      secondTeamIndex: z.number().int().min(1).max(999).optional(),
      teamCount: z.number().int().min(2).max(12).optional(),
      forceInvalidPortraitAssetKey: z.boolean().optional(),
      forceEmptyTeamSlots: z.boolean().optional(),
    }).strict().optional(),
  }),
  z.object({
    action: z.literal('claimMainMapCell'),
    payload: z.object({
      worldId: z.string().min(1).max(128),
      coordinateSpace: z.string().min(1).max(128).optional(),
      factionId: factionIdSchema,
      requestId: z.string().min(1).max(160),
      cellX: z.number().int().nonnegative(),
      cellY: z.number().int().nonnegative(),
      expectedOwner: z.string().min(1).max(128).optional(),
      expectedCellVersion: z.number().int().nonnegative().optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('releaseMainMapCell'),
    payload: z.object({
      worldId: z.string().min(1).max(128),
      coordinateSpace: z.string().min(1).max(128).optional(),
      factionId: factionIdSchema,
      requestId: z.string().min(1).max(160),
      cellX: z.number().int().nonnegative(),
      cellY: z.number().int().nonnegative(),
      expectedOwner: z.string().min(1).max(128).optional(),
      expectedCellVersion: z.number().int().nonnegative().optional(),
    }).strict(),
  }),
  z.object({
    action: z.literal('healTroop'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      aiPlayerId: z.string().min(1).max(80),
      unitId: z.string().min(1).max(120),
    }).strict(),
  }),
  z.object({
    action: z.literal('promoteTroopFacilityBuilding'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      unitId: z.string().min(1),
      facilityId: z.string().min(1),
      buildingId: z.string().min(1),
    }),
  }),
  z.object({
    action: z.literal('setRecruitSelectedPool'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      poolId: z.string().min(1).max(64),
    }),
  }),
  z.object({
    action: z.literal('recruitProspectHero'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      count: z.number().int().min(1).max(10).optional(),
      poolId: z.string().min(1).max(64).optional(),
    }),
  }),
  z.object({
    action: z.literal('enqueueAffair'),
    payload: z.object({
      factionId: factionIdSchema.optional(),
      cityId: z.string().min(1),
      affairId: z.string().min(1),
    }),
  }),
])

export function parseWorldActionRequest(input: unknown): WorldActionRequest {
  return worldActionRequestSchema.parse(input) as WorldActionRequest
}
