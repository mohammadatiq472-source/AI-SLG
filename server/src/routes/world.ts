import type { IncomingMessage, ServerResponse } from 'node:http'
import type { GovernedAiPlayerRuntimeDetail } from '../../../shared/contracts/aiPlayer'
import type { WorldMapLayoutLayerRequest, WorldState } from '../../../shared/contracts/game'
import { parseWorldActionRequest } from '../../../shared/schemas/worldAction'
import {
  allianceHelpAction,
  appendPlanningJobHistoryAction,
  achieveTaskPrototypeAction,
  achieveWorldAffairsNodeAction,
  advanceTickAction,
  claimMainMapCellAction,
  claimGovernorResourceInboxAction,
  claimTaskRewardAction,
  claimWorldAffairsNodeRewardAction,
  clearPlanExecutionAction,
  buildNavalWarshipAtHarborAction,
  configureDeployedUnitFormationAction,
  createNavalFleetAction,
  deployReserveHeroAction,
  gatherAiResourceTileAction,
  getWorldStateReadonly,
  getWorldAffairsReadModel,
  getWorldMapLayout,
  getWorldSummary,
  getWorldTasksReadModel,
  healTroopAction,
  issueClaimableRewardAction,
  issueNationMidgameLuoyangAuthorityClaimAction,
  moveUnitAction,
  occupyTileAction,
  openNavalHarborInventoryAction,
  openSeaRouteAction,
  previewMovementGeographyAction,
  promoteCityBuildingAction,
  promoteTroopFacilityBuildingAction,
  recordNationMidgameLuoyangControlAuthorityAction,
  recordNationMidgameLuoyangPrefectureControlJudgmentAction,
  recordNationMidgameCityControlJudgmentAction,
  recordNationMidgameLuoyangBattleReportFeedbackAction,
  recordNationMidgameLongTermControlTickPreconditionAction,
  recordNationMidgameRealmObjectiveBridgeAction,
  rewardClaimAction,
  recruitProspectHeroAction,
  recordWorldTaskEventAction,
  repairNavalFleetDamageAction,
  readNavalRouteEncounterAction,
  resolveNavalCombatSettlementAction,
  releaseMainMapCellAction,
  setAiResourceTransferPolicyAction,
  seedBattleReportClosureAction,
  seedNationEmpireSuccessFixtureAction,
  seedRecruitDrawFixtureAction,
  seedMainCityTroopFormationMultiTeamFixtureAction,
  seedMapUnitVisualSouthExitFixtureAction,
  buildResourceTileCoverageMatrixFixtureAction,
  seedProductionResourceTileActionHudFixtureAction,
  seedTileActionHudExpeditionFixtureAction,
  seedZeroLevelSubstrateTileActionHudFixtureAction,
  seaPatrolInterceptAction,
  seaPatrolScoutAction,
  sailNavalRouteAction,
  setAiContextFocusAction,
  setGeneralActiveHeroAction,
  setGeneralTacticAction,
  transferFactionResourcesToGovernorAction,
  upgradeHeroStarAction,
  upgradeTacticalSkillAction,
  upgradeCityAction,
  upgradeCityTechAction,
  queuePlanExecutionAction,
  queueAiAgendaActionAction,
  previewGeneralDirectivesAction,
  previewDomainAgendaAction,
  previewNationalAgendaAction,
  previewCourtSessionAction,
  queryCivilMemoryAction,
  queueTacticalOverrideAction,
  enqueueAffairAction,
  setRecruitSelectedPoolAction,
  updateAllianceDirectiveAction,
  updateAllianceFrontlineMarkerAction,
} from '../application/world/WorldService'
import { buildCurrentGoalsReadModel } from '../../../shared/domain/worldTasks'
import { getMainCityFacilityTreeReadModelResponse } from '../application/world/mainCityFacilityTreeReadModel'
import { getMainCityFacilityEntryReadModelResponse } from '../application/world/mainCityFacilityEntryReadModel'
import {
  getMainCityInteriorReadModelResponse,
  handleMainCityInteriorWorkOrderAction,
} from '../application/world/mainCityInteriorReadModel'
import { getMainCityTroopFormationReadModelResponse } from '../application/world/mainCityTroopFormationReadModel'
import { getGovernedAiPlayerRuntime, listGovernedAiPlayers } from '../application/ai/AIPlayerGovernanceService'
import { isHttpBodyError, readJsonBody, writeJson } from './http'
import { getSessionControlContextByToken, type SessionControlContext } from '../multiplayer/SessionManager'

type WorldSummaryRouteOptions = {
  sinceWorldVersion?: number
  planningHistoryLimit?: number
  replayLimit?: number
  replayFrameLimit?: number
  intelMode?: 'sparse' | 'full'
  asAiPlayerId?: string
  governorPlayerId?: string
}

type WorldMapLayoutRouteOptions = {
  scope?: 'full' | 'bootstrap' | 'province' | 'region' | 'viewport'
  provinceId?: string
  regionId?: string
  stateDetailStateId?: string
  centerX?: number
  centerY?: number
  visibleCells?: {
    width: number
    height: number
  }
  preloadMarginCells?: number
  chunkSizeCells?: {
    width: number
    height: number
  }
  layer?: 'nation' | 'province' | 'region' | 'tile' | 'layered'
  worldId?: string
  coordinateSpace?: string
  visibleSizeCells?: {
    width: number
    height: number
  }
  includeLayers?: WorldMapLayoutLayerRequest[]
  loadedChunkIds?: string[]
  tianxiaYutuScalePreset?: string
}

type WorldActionRouteOptions = {
  includeWorld?: boolean
  asAiPlayerId?: string
  governorPlayerId?: string
}

type WorldTasksRouteOptions = {
  factionId?: string
}

function readBearerToken(req: IncomingMessage): string {
  const raw = req.headers.authorization
  const value = Array.isArray(raw) ? raw[0] : raw
  if (!value) {
    return ''
  }
  const match = /^Bearer\s+(.+)$/i.exec(value.trim())
  return match?.[1]?.trim() ?? ''
}

function resolveWorldActionSessionContext(req: IncomingMessage): SessionControlContext | undefined {
  const token = readBearerToken(req)
  if (!token) {
    return undefined
  }
  return getSessionControlContextByToken(token) ?? undefined
}

function buildObservedAiPlayerReadModel(observedPlayer: GovernedAiPlayerRuntimeDetail) {
  return {
    aiPlayerId: observedPlayer.aiPlayerId,
    displayName: observedPlayer.displayName,
    governorPlayerId: observedPlayer.governorPlayerId,
    factionId: observedPlayer.factionId,
    mode: 'ai_player_readonly' as const,
    homeCityBindingStatus: observedPlayer.homeCityBindingStatus,
    homeCityId: observedPlayer.homeCityId,
    homeCityTileId: observedPlayer.homeCityTileId,
    homeCityPlacement: observedPlayer.homeCityPlacement,
  }
}

export function handleWorldSummaryRoute(
  req: IncomingMessage,
  res: ServerResponse,
  options?: WorldSummaryRouteOptions,
) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const includeCurrentGoals = requestUrl.searchParams.get('currentGoals') === 'true'
  const currentGoalsFactionId = requestUrl.searchParams.get('factionId')?.trim() || options?.governorPlayerId || 'player'
  const asAiPlayerId = options?.asAiPlayerId?.trim()
  if (!asAiPlayerId) {
    writeJson(res, 200, {
      ...getWorldSummary(options),
      ...(includeCurrentGoals
        ? { currentGoals: buildCurrentGoalsReadModel(getWorldStateReadonly() as WorldState, currentGoalsFactionId) }
        : {}),
    })
    return
  }

  const observedPlayer = getGovernedAiPlayerRuntime(asAiPlayerId)
  if (!observedPlayer) {
    writeJson(res, 404, { error: `ai player not found: ${asAiPlayerId}` })
    return
  }

  const governorPlayerId = options?.governorPlayerId?.trim()
  if (!governorPlayerId || observedPlayer.governorPlayerId !== governorPlayerId) {
    writeJson(res, 403, { error: 'AI player observation is limited to the owning governor.' })
    return
  }

  const governedPlayers = listGovernedAiPlayers({
    governorPlayerId,
    factionId: observedPlayer.factionId,
  })
  if (!governedPlayers.some((player) => player.aiPlayerId === observedPlayer.aiPlayerId)) {
    writeJson(res, 403, { error: 'AI player observation is limited to governed AI players in the same faction.' })
    return
  }

  writeJson(res, 200, {
    ...getWorldSummary(options),
    ...(includeCurrentGoals
      ? { currentGoals: buildCurrentGoalsReadModel(getWorldStateReadonly() as WorldState, currentGoalsFactionId) }
      : {}),
    observedAiPlayerId: observedPlayer.aiPlayerId,
    observedAiPlayer: buildObservedAiPlayerReadModel(observedPlayer),
  })
}

export function handleWorldMapLayoutRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  options?: WorldMapLayoutRouteOptions,
) {
  writeJson(res, 200, getWorldMapLayout(options))
}

export function handleWorldAffairsRoute(_req: IncomingMessage, res: ServerResponse) {
  writeJson(res, 200, getWorldAffairsReadModel())
}

export function handleWorldTasksRoute(_req: IncomingMessage, res: ServerResponse, options?: WorldTasksRouteOptions) {
  writeJson(res, 200, getWorldTasksReadModel(options?.factionId))
}

export function handleMainCityFacilityTreeReadModelRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  writeJson(
    res,
    200,
    getMainCityFacilityTreeReadModelResponse({
      world: getWorldStateReadonly(),
      cityId: requestUrl.searchParams.get('cityId') ?? undefined,
    }),
  )
}

export function handleMainCityFacilityEntryReadModelRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const asAiPlayerId = requestUrl.searchParams.get('asAiPlayerId')?.trim()
  const governorPlayerId = requestUrl.searchParams.get('governorPlayerId')?.trim()

  if (asAiPlayerId) {
    const observedPlayer = getGovernedAiPlayerRuntime(asAiPlayerId)
    if (!observedPlayer) {
      writeJson(res, 404, { error: `ai player not found: ${asAiPlayerId}` })
      return
    }

    if (!governorPlayerId || observedPlayer.governorPlayerId !== governorPlayerId) {
      writeJson(res, 403, { error: 'AI player main city observation is limited to the owning governor.' })
      return
    }

    const governedPlayers = listGovernedAiPlayers({
      governorPlayerId,
      factionId: observedPlayer.factionId,
    })
    if (!governedPlayers.some((player) => player.aiPlayerId === observedPlayer.aiPlayerId)) {
      writeJson(res, 403, { error: 'AI player main city observation is limited to governed AI players in the same faction.' })
      return
    }

    writeJson(
      res,
      200,
      getMainCityFacilityEntryReadModelResponse({
        world: getWorldStateReadonly(),
        cityId: requestUrl.searchParams.get('cityId') ?? undefined,
        observedAiPlayer: buildObservedAiPlayerReadModel(observedPlayer),
      }),
    )
    return
  }

  writeJson(
    res,
    200,
    getMainCityFacilityEntryReadModelResponse({
      world: getWorldStateReadonly(),
      factionId: requestUrl.searchParams.get('factionId') ?? undefined,
      playerId: requestUrl.searchParams.get('playerId') ?? requestUrl.searchParams.get('governorPlayerId') ?? undefined,
      cityId: requestUrl.searchParams.get('cityId') ?? undefined,
    }),
  )
}

export function handleMainCityInteriorReadModelRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  writeJson(
    res,
    200,
    getMainCityInteriorReadModelResponse({
      playerId:
        requestUrl.searchParams.get('playerId') ?? requestUrl.searchParams.get('factionId') ?? undefined,
      cityStateId: requestUrl.searchParams.get('cityStateId') ?? undefined,
      cityLabel: requestUrl.searchParams.get('cityLabel') ?? undefined,
    }),
  )
}

export async function handleMainCityInteriorWorkOrderActionRoute(
  req: IncomingMessage,
  res: ServerResponse,
  params: {
    queueItemId: string
    actionId: string
  },
) {
  const body = await readJsonBody(req)
  const payload = body && typeof body === 'object' && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {}
  writeJson(
    res,
    200,
    handleMainCityInteriorWorkOrderAction({
      playerId: typeof payload.playerId === 'string' ? payload.playerId : undefined,
      cityStateId: typeof payload.cityStateId === 'string' ? payload.cityStateId : undefined,
      cityLabel: typeof payload.cityLabel === 'string' ? payload.cityLabel : undefined,
      queueItemId: params.queueItemId,
      actionId: params.actionId,
    }),
  )
}

export function handleMainCityTroopFormationReadModelRoute(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? '/', 'http://localhost')
  const asAiPlayerId = requestUrl.searchParams.get('asAiPlayerId')?.trim()
  const governorPlayerId = requestUrl.searchParams.get('governorPlayerId')?.trim()

  if (asAiPlayerId) {
    const observedPlayer = getGovernedAiPlayerRuntime(asAiPlayerId)
    if (!observedPlayer) {
      writeJson(res, 404, { error: `ai player not found: ${asAiPlayerId}` })
      return
    }

    if (!governorPlayerId || observedPlayer.governorPlayerId !== governorPlayerId) {
      writeJson(res, 403, { error: 'AI player troop formation observation is limited to the owning governor.' })
      return
    }

    writeJson(
      res,
      200,
      getMainCityTroopFormationReadModelResponse({
        world: getWorldStateReadonly(),
        factionId: observedPlayer.factionId,
        governorPlayerId,
        observedAiPlayer: observedPlayer,
      }),
    )
    return
  }

  writeJson(
    res,
    200,
    getMainCityTroopFormationReadModelResponse({
      world: getWorldStateReadonly(),
      factionId: requestUrl.searchParams.get('factionId') ?? undefined,
      playerId: requestUrl.searchParams.get('playerId') ?? requestUrl.searchParams.get('governorPlayerId') ?? undefined,
      governorPlayerId: requestUrl.searchParams.get('governorPlayerId') ?? requestUrl.searchParams.get('playerId') ?? undefined,
    }),
  )
}

export async function handleWorldActionRoute(
  req: IncomingMessage,
  res: ServerResponse,
  options?: WorldActionRouteOptions,
) {
  const asAiPlayerId = options?.asAiPlayerId?.trim()
  if (asAiPlayerId) {
    writeJson(res, 403, {
      error: 'World actions are blocked while observing an AI player.',
      observedAiPlayerId: asAiPlayerId,
    })
    return
  }

  const includeWorld = options?.includeWorld === true

  try {
    const payload = await readJsonBody(req)
    if (isOpenSeaRouteActionRequest(payload)) {
      writeJson(res, 200, openSeaRouteAction(payload.payload, includeWorld))
      return
    }
    const request = parseWorldActionRequest(payload)
    const sessionContext = resolveWorldActionSessionContext(req)

    switch (request.action) {
      case 'appendPlanningJobHistory':
        writeJson(res, 200, appendPlanningJobHistoryAction(request.payload.entry, includeWorld))
        return
      case 'queuePlanExecution':
        writeJson(res, 200, await queuePlanExecutionAction(request.payload, includeWorld))
        return
      case 'previewGeneralDirectives':
        writeJson(res, 200, previewGeneralDirectivesAction(request.payload))
        return
      case 'previewDomainAgenda':
        writeJson(res, 200, previewDomainAgendaAction(request.payload, includeWorld))
        return
      case 'previewNationalAgenda':
        writeJson(res, 200, previewNationalAgendaAction(request.payload, includeWorld))
        return
      case 'previewCourtSession':
        writeJson(res, 200, previewCourtSessionAction(request.payload, includeWorld))
        return
      case 'queryCivilMemory':
        writeJson(res, 200, queryCivilMemoryAction(request.payload, includeWorld))
        return
      case 'setGeneralActiveHero':
        writeJson(res, 200, setGeneralActiveHeroAction(request.payload.heroId, includeWorld, request.payload.factionId))
        return
      case 'setGeneralTactic':
        writeJson(
          res,
          200,
          setGeneralTacticAction(
            request.payload.heroId,
            request.payload.tacticId,
            includeWorld,
            request.payload.factionId,
          ),
        )
        return
      case 'upgradeTacticalSkill':
        writeJson(
          res,
          200,
          upgradeTacticalSkillAction(
            request.payload.heroId,
            request.payload.skillId,
            includeWorld,
            request.payload.factionId,
          ),
        )
        return
      case 'queueAiAgendaAction':
        writeJson(res, 200, queueAiAgendaActionAction(request.payload.agendaActionId, includeWorld, request.payload.factionId))
        return
      case 'setAiContextFocus':
        {
        const payload = request.payload as {
          factionId?: string
          contextFocusId: 'focus_city' | 'focus_troop' | 'focus_alliance' | 'focus_team'
          teamId?: string
          aiPlayerId?: string
          teamIndex?: number
          teamName?: string
          ownerType?: string
          heroNames?: string[]
        }
        writeJson(
          res,
          200,
          setAiContextFocusAction(
            payload.contextFocusId as 'focus_city' | 'focus_troop' | 'focus_alliance' | 'focus_team',
            includeWorld,
            payload.factionId,
            {
              teamId: payload.teamId,
              teamIndex: payload.teamIndex,
              aiPlayerId: payload.aiPlayerId,
              teamName: payload.teamName,
              ownerType: payload.ownerType,
              heroNames: payload.heroNames,
            },
          ),
        )
        return
        }
      case 'advanceTick':
        writeJson(res, 200, await advanceTickAction(includeWorld))
        return
      case 'clearPlanExecution':
        writeJson(res, 200, clearPlanExecutionAction(includeWorld, request.payload?.factionId))
        return
      case 'moveUnit':
        writeJson(
          res,
          200,
          moveUnitAction(
            request.payload.unitId,
            request.payload.targetTileId,
            includeWorld,
            request.payload.factionId,
          ),
        )
        return
      case 'previewMovementGeography':
        writeJson(
          res,
          200,
          previewMovementGeographyAction(
            {
              factionId: request.payload.factionId,
              unitId: request.payload.unitId,
              fromTileId: request.payload.fromTileId,
              targetTileId: request.payload.targetTileId,
            },
            includeWorld,
          ),
        )
        return
      case 'deployReserveHero':
        writeJson(
          res,
          200,
          deployReserveHeroAction(
            request.payload.factionId,
            request.payload.heroId,
            request.payload.tileId,
            includeWorld,
            request.payload.coHeroIds,
            request.payload.aiPlayerId,
            request.payload.teamId,
            request.payload.teamIndex,
          ),
        )
        return
      case 'configureDeployedUnitFormation':
        writeJson(
          res,
          200,
          configureDeployedUnitFormationAction(
            {
              factionId: request.payload.factionId,
              unitId: request.payload.unitId,
              teamId: request.payload.teamId,
              teamIndex: request.payload.teamIndex,
              heroIds: request.payload.heroIds,
            },
            includeWorld,
          ),
        )
        return
      case 'upgradeHeroStar':
        writeJson(
          res,
          200,
          upgradeHeroStarAction(request.payload.heroId, includeWorld, request.payload.factionId),
        )
        return
      case 'upgradeCity':
        writeJson(res, 200, upgradeCityAction(request.payload.tileId, includeWorld, request.payload.factionId))
        return
      case 'upgradeCityTech':
        writeJson(
          res,
          200,
          upgradeCityTechAction(request.payload.tileId, request.payload.techId, includeWorld, request.payload.factionId),
        )
        return
      case 'promoteCityBuilding':
        writeJson(
          res,
          200,
          promoteCityBuildingAction(
            request.payload.cityId,
            request.payload.groupId,
            request.payload.buildingId,
            includeWorld,
            request.payload.factionId,
          ),
        )
        return
      case 'queueTacticalOverride':
        writeJson(
          res,
          200,
          queueTacticalOverrideAction(
            request.payload.unitId,
            request.payload.templateId,
            request.payload.targetTileId,
            request.payload.summary,
            includeWorld,
            request.payload.factionId,
          ),
        )
        return
      case 'updateAllianceDirective':
        writeJson(
          res,
          200,
          updateAllianceDirectiveAction(request.payload.regionId, request.payload.stance, includeWorld),
        )
        return
      case 'updateAllianceFrontlineMarker':
        writeJson(
          res,
          200,
          updateAllianceFrontlineMarkerAction(request.payload, includeWorld, sessionContext),
        )
        return
      case 'allianceHelp':
        writeJson(
          res,
          200,
          allianceHelpAction(request.payload.regionId, includeWorld, request.payload.factionId),
        )
        return
      case 'claimReward':
        writeJson(
          res,
          200,
          rewardClaimAction(request.payload?.rewardId, includeWorld, request.payload?.factionId),
        )
        return
      case 'achieveWorldAffairsNode':
        writeJson(res, 200, achieveWorldAffairsNodeAction(request.payload, includeWorld))
        return
      case 'claimWorldAffairsNodeReward':
        writeJson(res, 200, claimWorldAffairsNodeRewardAction(request.payload, includeWorld))
        return
      case 'achieveTaskPrototype':
        writeJson(res, 200, achieveTaskPrototypeAction(request.payload, includeWorld))
        return
      case 'recordWorldTaskEvent':
        writeJson(res, 200, recordWorldTaskEventAction(request.payload, includeWorld))
        return
      case 'claimTaskReward':
        writeJson(res, 200, claimTaskRewardAction(request.payload, includeWorld))
        return
      case 'issueClaimableReward':
        writeJson(res, 200, issueClaimableRewardAction(request.payload, includeWorld))
        return
      case 'transferFactionResourcesToGovernor':
        writeJson(res, 200, transferFactionResourcesToGovernorAction(request.payload, includeWorld))
        return
      case 'openSeaRoute':
        writeJson(res, 200, openSeaRouteAction(request.payload, includeWorld))
        return
      case 'seaPatrolScout':
        writeJson(res, 200, seaPatrolScoutAction(request.payload, includeWorld))
        return
      case 'seaPatrolIntercept':
        writeJson(res, 200, seaPatrolInterceptAction(request.payload, includeWorld))
        return
      case 'createNavalFleet':
        writeJson(res, 200, createNavalFleetAction(request.payload, includeWorld))
        return
      case 'sailNavalRoute':
        writeJson(res, 200, sailNavalRouteAction(request.payload, includeWorld))
        return
      case 'resolveNavalCombatSettlement':
        writeJson(res, 200, resolveNavalCombatSettlementAction(request.payload, includeWorld))
        return
      case 'repairNavalFleetDamage':
        writeJson(res, 200, repairNavalFleetDamageAction(request.payload, includeWorld))
        return
      case 'buildNavalWarshipAtHarbor':
        writeJson(res, 200, buildNavalWarshipAtHarborAction(request.payload, includeWorld))
        return
      case 'openNavalHarborInventory':
        writeJson(res, 200, openNavalHarborInventoryAction(request.payload, includeWorld))
        return
      case 'readNavalRouteEncounter':
        writeJson(res, 200, readNavalRouteEncounterAction(request.payload, includeWorld))
        return
      case 'setAiResourceTransferPolicy':
        writeJson(res, 200, setAiResourceTransferPolicyAction(request.payload, includeWorld))
        return
      case 'claimGovernorResourceInbox':
        writeJson(res, 200, claimGovernorResourceInboxAction(request.payload, includeWorld))
        return
      case 'gatherAiResourceTile':
        writeJson(res, 200, gatherAiResourceTileAction(request.payload, includeWorld))
        return
      case 'occupyTile':
        writeJson(res, 200, occupyTileAction(request.payload, includeWorld))
        return
      case 'seedBattleReportClosure':
        writeJson(res, 200, seedBattleReportClosureAction(request.payload, includeWorld))
        return
      case 'seedRecruitDrawFixture':
        writeJson(res, 200, seedRecruitDrawFixtureAction(request.payload, includeWorld))
        return
      case 'seedNationEmpireSuccessFixture':
        writeJson(res, 200, seedNationEmpireSuccessFixtureAction(request.payload, includeWorld))
        return
      case 'issueNationMidgameLuoyangAuthorityClaim':
        writeJson(res, 200, issueNationMidgameLuoyangAuthorityClaimAction(request.payload, includeWorld))
        return
      case 'recordNationMidgameLuoyangBattleReportFeedback':
        writeJson(res, 200, recordNationMidgameLuoyangBattleReportFeedbackAction(request.payload, includeWorld))
        return
      case 'recordNationMidgameLuoyangControlAuthority':
        writeJson(res, 200, recordNationMidgameLuoyangControlAuthorityAction(request.payload, includeWorld))
        return
      case 'recordNationMidgameLuoyangPrefectureControlJudgment':
        writeJson(res, 200, recordNationMidgameLuoyangPrefectureControlJudgmentAction(request.payload, includeWorld))
        return
      case 'recordNationMidgameCityControlJudgment':
        writeJson(res, 200, recordNationMidgameCityControlJudgmentAction(request.payload, includeWorld))
        return
      case 'recordNationMidgameRealmObjectiveBridge':
        writeJson(res, 200, recordNationMidgameRealmObjectiveBridgeAction(request.payload, includeWorld))
        return
      case 'recordNationMidgameLongTermControlTickPrecondition':
        writeJson(res, 200, recordNationMidgameLongTermControlTickPreconditionAction(request.payload, includeWorld))
        return
      case 'seedMapUnitVisualSouthExitFixture':
        writeJson(res, 200, seedMapUnitVisualSouthExitFixtureAction(request.payload, includeWorld))
        return
      case 'seedTileActionHudExpeditionFixture':
        writeJson(res, 200, seedTileActionHudExpeditionFixtureAction(request.payload, includeWorld))
        return
      case 'seedProductionResourceTileActionHudFixture':
        writeJson(res, 200, seedProductionResourceTileActionHudFixtureAction(request.payload, includeWorld))
        return
      case 'seedZeroLevelSubstrateTileActionHudFixture':
        writeJson(res, 200, seedZeroLevelSubstrateTileActionHudFixtureAction(request.payload, includeWorld))
        return
      case 'buildResourceTileCoverageMatrixFixture':
        writeJson(res, 200, buildResourceTileCoverageMatrixFixtureAction(request.payload, includeWorld))
        return
      case 'seedMainCityTroopFormationMultiTeamFixture':
        writeJson(res, 200, seedMainCityTroopFormationMultiTeamFixtureAction(request.payload, includeWorld))
        return
      case 'claimMainMapCell':
        writeJson(res, 200, claimMainMapCellAction(request.payload, includeWorld))
        return
      case 'releaseMainMapCell':
        writeJson(res, 200, releaseMainMapCellAction(request.payload, includeWorld))
        return
      case 'healTroop':
        writeJson(res, 200, healTroopAction(request.payload, includeWorld))
        return
      case 'promoteTroopFacilityBuilding':
        writeJson(
          res,
          200,
          promoteTroopFacilityBuildingAction(
            request.payload.unitId,
            request.payload.facilityId,
            request.payload.buildingId,
            includeWorld,
            request.payload.factionId,
          ),
        )
        return
      case 'setRecruitSelectedPool':
        writeJson(
          res,
          200,
          setRecruitSelectedPoolAction(request.payload.poolId, includeWorld, request.payload.factionId),
        )
        return
      case 'recruitProspectHero':
        writeJson(
          res,
          200,
          recruitProspectHeroAction(
            includeWorld,
            request.payload.factionId,
            request.payload.count ?? 1,
            request.payload.poolId ?? 'pool_standard',
          ),
        )
        return
      case 'enqueueAffair':
        writeJson(
          res,
          200,
          enqueueAffairAction(request.payload.cityId, request.payload.affairId, includeWorld, request.payload.factionId),
        )
        return
      default:
        writeJson(res, 400, { error: 'Unknown world action.' })
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError' && 'issues' in error) {
      const issues = (error as unknown as { issues: Array<{ path?: PropertyKey[]; message?: string }> }).issues
      const details = issues.map((issue) => ({
        path: (issue.path ?? []).join('.') || 'root',
        message: issue.message ?? 'Validation error',
      }))
      writeJson(res, 400, { error: 'Invalid request payload.', details })
      return
    }
    if (isHttpBodyError(error)) {
      writeJson(res, error.statusCode, { error: error.message })
      return
    }

    const message = error instanceof Error ? error.message : 'Unknown server error.'
    writeJson(res, 500, { error: message })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

function isOpenSeaRouteActionRequest(input: unknown): input is {
  action: 'openSeaRoute'
  payload: {
    factionId?: string
    sourceDockId: string
    overseasContactId: string
    actorAiPlayerId?: string
  }
} {
  if (!isRecord(input) || input.action !== 'openSeaRoute') {
    return false
  }
  const payload = input.payload
  if (!isRecord(payload)) {
    return false
  }
  const sourceDockId = readOptionalString(payload.sourceDockId)
  const overseasContactId = readOptionalString(payload.overseasContactId)
  if (!sourceDockId || !overseasContactId) {
    return false
  }
  payload.sourceDockId = sourceDockId
  payload.overseasContactId = overseasContactId
  const factionId = readOptionalString(payload.factionId)
  if (factionId) {
    payload.factionId = factionId
  }
  const actorAiPlayerId = readOptionalString(payload.actorAiPlayerId)
  if (actorAiPlayerId) {
    payload.actorAiPlayerId = actorAiPlayerId
  }
  return true
}
