import type { IncomingMessage, ServerResponse } from 'node:http'
import { z } from 'zod'
import {
  bindAiPlayerHomeCity,
  createAiPlayerActionProposal,
  getGovernedAiPlayerRuntime,
  listAiPlayerHomeCityCandidates,
  listAiPlayerActionCatalog,
  listAiPlayerActionReceipts,
  listGovernedAiPlayers,
  pauseGovernedAiPlayer,
  registerGovernedAiPlayer,
  resumeGovernedAiPlayer,
  updateGovernedAiPlayerProfile,
  upsertGovernedAiPlayerContextDocument,
} from '../application/ai/AIPlayerGovernanceService'
import {
  bindAiPlayerHomeCityRequestSchema,
  createGovernedAiPlayerRequestSchema,
  refineAiPlayerContextDocumentRequestSchema,
  uploadAiPlayerAvatarImageRequestSchema,
  updateGovernedAiPlayerProfileRequestSchema,
  updateGovernedAiPlayerStatusRequestSchema,
  upsertAiPlayerContextDocumentRequestSchema,
} from '../../../shared/schemas/aiPlayer'
import { getWorldStateReadonly } from '../application/world/WorldService'
import {
  parseAiPlayerRuntimeProposalJson,
  requestAiPlayerRuntimeProposalFromCandidateTargets,
  toAiPlayerActionProposalRequests,
} from '../application/ai/aiPlayerRuntimeProposalModel'
import {
  clearAiPlayerRuntimeModelFallbackReasonForOwner,
  recordAiPlayerRuntimeModelFallbackFailuresForOwner,
  recordAiPlayerRuntimeModelFallbackReasonForOwner,
  resolveAiPlayerRuntimeModelTargetCandidates,
} from '../application/ai/aiPlayerRuntimeModelTarget'
import {
  commitAiPlayerProviderBudgetReservation,
  releaseAiPlayerProviderAiCommandCreditReservation,
  releaseAiPlayerProviderBudgetReservation,
  recordAiPlayerProviderModelRequestAccounting,
  reserveAiPlayerProviderAiCommandCredits,
  reserveAiPlayerProviderBudget,
} from '../application/ai/aiPlayerProviderAccountStore'
import { buildAiPlayerBattleReportReadModel } from '../application/ai/aiPlayerBattleReportReadModel'
import {
  recordAiPlayerAutonomousCombatDefaultEventInChat,
  recordAiPlayerAutonomousCombatWarRoomReportInChat,
} from '../application/ai/aiPlayerChatCommandService'
import {
  buildAiPlayerAutonomousDevelopmentObservation,
  AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MAX_STEPS,
  listAiPlayerAutonomousDevelopmentPlayerReports,
  listAiPlayerAutonomousDevelopmentPersonalReports,
  runAiPlayerAutonomousDevelopment,
} from '../application/ai/aiPlayerAutonomousDevelopmentService'
import { buildAiPlayerAutonomousCombatObservation } from '../application/ai/aiPlayerAutonomousCombatReadModel'
import { buildAiPlayerDevelopmentPlan } from '../application/ai/aiPlayerDevelopmentPlanReadModel'
import { buildAiPlayerListReadModelSummary } from '../application/ai/aiPlayerGovernanceRuntimeView'
import { listAiPlayerExecutionTrace } from '../application/ai/aiPlayerExecutionTraceReadModel'
import { refineAiPlayerContextDocumentPreview } from '../application/ai/aiPlayerIdentityRefineService'
import { storeAiPlayerAvatarImageAsset } from '../application/ai/aiPlayerAvatarImageAssetStore'
import { buildAiPlayerSubjectReadModel } from '../application/ai/aiPlayerSubjectReadModel'
import {
  AI_PLAYER_AUTONOMOUS_COMBAT_MAX_STEPS,
  buildAiPlayerAutonomousCombatCampaignArchive,
  buildAiPlayerAutonomousCombatDailySummary,
  buildAiPlayerAutonomousCombatWarRoomLiveRefresh,
  getAiPlayerAutonomousCombatWarRoomUiState,
  listAiPlayerAutonomousCombatPersonalReports,
  listAiPlayerAutonomousCombatPlayerReports,
  runAiPlayerAutonomousCombat,
  upsertAiPlayerAutonomousCombatWarRoomUiState,
} from '../application/ai/aiPlayerAutonomousCombatService'
import { writeJson } from './http'
import { parseBody, parseBooleanFlag, parseOptionalLimit } from './aiPlayerRouteShared'
import { broadcastWarRoomLiveRefresh } from '../ws/GameWebSocket'

const aiPlayerWarRoomUiStateRequestSchema = z.object({
  selectedEnemyId: z.string().optional(),
  enemyHistoryPage: z.number().int().positive().optional(),
})

const runAiPlayerAutonomousDevelopmentRequestSchema = z.object({
  maxSteps: z.number().int().min(1).max(AI_PLAYER_AUTONOMOUS_DEVELOPMENT_MAX_STEPS).optional(),
  goalPower: z.number().int().min(1).max(100000).optional(),
  targetDevelopmentPoints: z.number().int().min(1).max(100000).optional(),
  triggeredBy: z.string().trim().min(1).max(120).optional(),
  plannerMode: z.enum(['rule', 'llm']).optional(),
}).strict()

const runAiPlayerAutonomousCombatRequestSchema = z.object({
  maxSteps: z.number().int().min(1).max(AI_PLAYER_AUTONOMOUS_COMBAT_MAX_STEPS).optional(),
  limit: z.number().int().min(1).max(50).optional(),
  plannerMode: z.enum(['rule', 'llm']).optional(),
}).strict()

async function handleRegisterRoute(req: IncomingMessage, res: ServerResponse) {
  const parsed = await parseBody(req, createGovernedAiPlayerRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = registerGovernedAiPlayer(parsed.data)
  if (result.error) {
    writeJson(res, result.error.startsWith('ai player already exists') ? 409 : 400, {
      ok: false,
      error: result.error,
    })
    return
  }

  writeJson(res, 200, {
    ok: true,
    player: result.player,
  })
}

function handleHomeCityCandidatesRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const result = listAiPlayerHomeCityCandidates({
    aiPlayerId,
    governorPlayerId: url.searchParams.get('governorPlayerId')?.trim() ?? '',
    radiusLimit: Number(url.searchParams.get('radiusLimit') ?? 10),
  })
  if ('error' in result) {
    writeJson(res, result.statusCode, {
      ok: false,
      error: result.error,
      failureCode: result.failureCode,
    })
    return
  }

  writeJson(res, 200, result)
}

async function handleBindHomeCityRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, bindAiPlayerHomeCityRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = bindAiPlayerHomeCity(aiPlayerId, parsed.data)
  if (result.error) {
    writeJson(res, result.statusCode ?? 400, {
      ok: false,
      error: result.error,
      failureCode: result.failureCode,
    })
    return
  }

  writeJson(res, 200, {
    ok: true,
    player: result.player,
    binding: result.binding,
  })
}

function handleListPlayersRoute(_req: IncomingMessage, res: ServerResponse, url: URL) {
  const governorPlayerId = url.searchParams.get('governorPlayerId')?.trim() || undefined
  const factionId = url.searchParams.get('factionId')?.trim() || undefined
  const includeDisabled = parseBooleanFlag(url.searchParams.get('includeDisabled'))
  const items = listGovernedAiPlayers({
    governorPlayerId,
    factionId,
    includeDisabled,
  })

  writeJson(res, 200, {
    items,
    count: items.length,
    listSummary: buildAiPlayerListReadModelSummary(items),
  })
}

function handleGetPlayerRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const player = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!player) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  writeJson(res, 200, player)
}

async function handleProfileRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, updateGovernedAiPlayerProfileRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = updateGovernedAiPlayerProfile(aiPlayerId, parsed.data)
  if (result.error) {
    writeJson(res, result.error.includes('not found') ? 404 : 400, { ok: false, error: result.error })
    return
  }

  writeJson(res, 200, {
    ok: true,
    player: result.player,
  })
}

async function handleAvatarImageRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, uploadAiPlayerAvatarImageRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const stored = storeAiPlayerAvatarImageAsset(aiPlayerId, parsed.data)
  if ('error' in stored) {
    writeJson(res, stored.statusCode, { ok: false, error: stored.error })
    return
  }

  const profileResult = updateGovernedAiPlayerProfile(aiPlayerId, {
    avatarId: stored.asset.assetId,
    avatarImagePath: stored.asset.avatarImagePath,
    updatedBy: parsed.data.updatedBy,
  })
  if (profileResult.error) {
    writeJson(res, profileResult.error.includes('not found') ? 404 : 400, {
      ok: false,
      error: profileResult.error,
    })
    return
  }

  writeJson(res, 200, {
    ok: true,
    asset: stored.asset,
    player: profileResult.player,
  })
}

async function handleContextDocumentRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, upsertAiPlayerContextDocumentRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = upsertGovernedAiPlayerContextDocument(aiPlayerId, parsed.data)
  if (result.error) {
    writeJson(res, result.error.includes('not found') ? 404 : 400, { ok: false, error: result.error })
    return
  }

  writeJson(res, 200, {
    ok: true,
    document: result.document,
    player: result.player,
  })
}

async function handleContextDocumentRefineRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, refineAiPlayerContextDocumentRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  const result = refineAiPlayerContextDocumentPreview({
    aiPlayerId,
    displayName: runtime.displayName,
    request: parsed.data,
  })
  writeJson(res, 200, {
    ok: true,
    refined: result.refined,
    suggestedUpsertRequest: result.suggestedUpsertRequest,
    persisted: false,
  })
}

async function handlePauseRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, updateGovernedAiPlayerStatusRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = pauseGovernedAiPlayer(aiPlayerId, parsed.data.updatedBy)
  if (result.error) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }

  writeJson(res, 200, {
    ok: true,
    player: result.player,
  })
}

async function handleResumeRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, updateGovernedAiPlayerStatusRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = resumeGovernedAiPlayer(aiPlayerId, parsed.data.updatedBy)
  if (result.error) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }

  writeJson(res, 200, {
    ok: true,
    player: result.player,
  })
}

function handleReceiptsRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const player = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!player) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  const limit = parseOptionalLimit(url.searchParams.get('limit'))
  const items = listAiPlayerActionReceipts(aiPlayerId, limit)
  writeJson(res, 200, {
    items,
    count: items.length,
  })
}

function parseTargetDevelopmentPoints(url: URL): number | undefined {
  const raw = url.searchParams.get('goalPower') ?? url.searchParams.get('targetDevelopmentPoints')
  const value = Number(raw ?? Number.NaN)
  if (!Number.isFinite(value)) {
    return undefined
  }
  return Math.max(1, Math.min(100000, Math.trunc(value)))
}

function handleDevelopmentPlanRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  writeJson(res, 200, buildAiPlayerDevelopmentPlan(runtime, {
    targetDevelopmentPoints: parseTargetDevelopmentPoints(url),
  }))
}

function handleSubjectRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }
  const governorPlayerId = url.searchParams.get('governorPlayerId')?.trim()
  if (governorPlayerId && governorPlayerId !== runtime.governorPlayerId) {
    writeJson(res, 403, { ok: false, error: 'ai_player_subject_governor_mismatch' })
    return
  }

  writeJson(res, 200, {
    ok: true,
    subject: buildAiPlayerSubjectReadModel(runtime, {
      targetDevelopmentPoints: parseTargetDevelopmentPoints(url),
      receiptLimit: parseOptionalLimit(url.searchParams.get('receiptLimit'), 12),
    }),
  })
}

function handleBattleReportsRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  writeJson(res, 200, buildAiPlayerBattleReportReadModel(
    runtime,
    parseOptionalLimit(url.searchParams.get('limit'), 8),
  ))
}

function handleExecutionTraceRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string, url: URL) {
  const result = listAiPlayerExecutionTrace(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  if (!result.ok) {
    writeJson(res, 404, result)
    return
  }
  writeJson(res, 200, result)
}

async function handleAutonomousDevelopmentRunRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, runAiPlayerAutonomousDevelopmentRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }

  const result = await runAiPlayerAutonomousDevelopment(aiPlayerId, parsed.data)
  if (result.error || !result.run) {
    const status = result.error?.includes('not found') ? 404 : 409
    writeJson(res, status, {
      ok: false,
      error: result.error ?? 'autonomous_development_failed',
    })
    return
  }

  writeJson(res, 200, {
    ok: true,
    run: result.run,
  })
}

function handleAutonomousDevelopmentPersonalReportsRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  const items = listAiPlayerAutonomousDevelopmentPersonalReports(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  writeJson(res, 200, {
    ok: true,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    items,
    count: items.length,
  })
}

function handleAutonomousDevelopmentPlayerReportsRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const result = listAiPlayerAutonomousDevelopmentPlayerReports(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  if ('error' in result) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }
  writeJson(res, 200, result)
}

function handleAutonomousDevelopmentObservationRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const result = buildAiPlayerAutonomousDevelopmentObservation(aiPlayerId, {
    goalPower: parseTargetDevelopmentPoints(url),
  })
  if (result.error || !result.observation) {
    writeJson(res, result.error?.includes('not found') ? 404 : 409, {
      ok: false,
      error: result.error ?? 'autonomous_observation_failed',
    })
    return
  }
  writeJson(res, 200, {
    ok: true,
    observation: result.observation,
  })
}

function handleAutonomousCombatObservationRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }
  writeJson(res, 200, {
    ok: true,
    observation: buildAiPlayerAutonomousCombatObservation(
      runtime,
      parseOptionalLimit(url.searchParams.get('limit'), 8),
    ),
  })
}

async function handleAutonomousCombatRunRoute(req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const parsed = await parseBody(req, runAiPlayerAutonomousCombatRequestSchema)
  if (!parsed.ok) {
    writeJson(res, 422, { ok: false, error: parsed.error })
    return
  }
  const result = await runAiPlayerAutonomousCombat(aiPlayerId, parsed.data)
  if (result.error || !result.run) {
    writeJson(res, result.error?.includes('not found') ? 404 : 409, {
      ok: false,
      error: result.error ?? 'autonomous_combat_failed',
    })
    return
  }
  writeJson(res, 200, {
    ok: true,
    run: result.run,
  })
}

function handleAutonomousCombatPersonalReportsRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }
  const items = listAiPlayerAutonomousCombatPersonalReports(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  writeJson(res, 200, {
    ok: true,
    aiPlayerId,
    ownerPlayerId: runtime.governorPlayerId,
    items,
    count: items.length,
  })
}

function handleAutonomousCombatPlayerReportsRoute(
  _req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const result = listAiPlayerAutonomousCombatPlayerReports(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  if ('error' in result) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }
  writeJson(res, 200, result)
}

async function handleAutonomousCombatDailySummaryRoute(
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const result = buildAiPlayerAutonomousCombatDailySummary(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  if ('error' in result) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  const reportName = runtime?.displayName?.trim() || 'AI玩家'
  const summary = result.summary as Record<string, unknown>
  const summaryText = String(summary.summary ?? '').trim()
  const resultText = String(summary.result ?? '').trim()
  await recordAiPlayerAutonomousCombatDefaultEventInChat({
    aiPlayerId,
    source: 'autonomous_combat_daily_summary_report',
    eventKey: `daily:${new Date().toISOString().slice(0, 10)}`,
    body: [
      `${reportName}：我看了一轮战况。`,
      summaryText,
      resultText && resultText !== summaryText ? resultText : '',
    ].filter(Boolean).join(' '),
    rewriteContext: {
      battleDigest: summary.battleDigest ?? null,
    },
    metadata: {
      reportKind: 'daily_summary',
    },
  })
  writeJson(res, 200, result)
}

async function recordAutonomousCombatCampaignArchiveEventsInChat(aiPlayerId: string, archive: Record<string, unknown>) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  const reportName = runtime?.displayName?.trim() || 'AI玩家'
  const campaigns = Array.isArray(archive.campaigns)
    ? archive.campaigns.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    : []
  const campaign = campaigns.find((item) => String(item.stateKind ?? '') === 'ai_rally_campaign_archive') ?? campaigns[0]
  if (!campaign) {
    return
  }
  const campaignId = String(campaign.campaignId ?? campaign.regionId ?? 'campaign').trim()
  const regionId = String(campaign.regionId ?? '').trim()
  const longTermMemory = String(campaign.longTermMemory ?? campaign.playerFacingSummary ?? '').trim()
  const battleDigest = campaign.battleDigest && typeof campaign.battleDigest === 'object'
    ? campaign.battleDigest as Record<string, unknown>
    : null
  const siegeText = [
    `${reportName}战况：攻城结束，城防和耐久变化已进入战报复盘。`,
    longTermMemory,
    String(battleDigest?.playerFacingSummary ?? '').trim(),
  ].filter(Boolean).join(' ')
  await recordAiPlayerAutonomousCombatDefaultEventInChat({
    aiPlayerId,
    source: 'autonomous_combat_siege_report',
    eventKey: `siege:${campaignId}:${regionId}`,
    body: siegeText,
    rewriteContext: {
      battleDigest,
    },
    metadata: {
      reportKind: 'siege_finished',
      campaignId,
      regionId,
    },
  })

  const incomingReports = Array.isArray(campaign.incomingAttackReports)
    ? campaign.incomingAttackReports.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    : []
  const incoming = incomingReports[0]
  if (incoming) {
    await recordAiPlayerAutonomousCombatDefaultEventInChat({
      aiPlayerId,
      source: 'autonomous_combat_incoming_attack_report',
      eventKey: `incoming:${campaignId}:${String(incoming.enemyId ?? incoming.enemyLabel ?? regionId).trim()}`,
      body: [
        `${reportName}战况：敌军来袭。`,
        String(incoming.playerFacingSummary ?? '').trim(),
        String(battleDigest?.playerFacingSummary ?? '').trim(),
      ].filter(Boolean).join(' '),
      rewriteContext: {
        battleDigest,
      },
      metadata: {
        reportKind: 'incoming_attack',
        campaignId,
        regionId,
      },
    })
  }

  const defenseRows = Array.isArray(campaign.defenseExecutionOutcomeRows)
    ? campaign.defenseExecutionOutcomeRows.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    : []
  const defenseRecaps = Array.isArray(campaign.defenseSettlementRecapEntries)
    ? campaign.defenseSettlementRecapEntries.filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    : []
  const defense = defenseRows[0] ?? defenseRecaps[0]
  if (defense) {
    const outcomeText = String(defense.outcome ?? defense.playerFacingSummary ?? '').match(/失守|失败|loss/i)
      ? '驻防失败'
      : '驻防成功'
    await recordAiPlayerAutonomousCombatDefaultEventInChat({
      aiPlayerId,
      source: 'autonomous_combat_defense_outcome_report',
      eventKey: `defense:${campaignId}:${defenseRows.length}:${defenseRecaps.length}`,
      body: [
        `${reportName}战况：${outcomeText}，防守结算已完成。`,
        String(defense.playerFacingSummary ?? '').trim(),
        String(defense.lossSummary ?? '').trim(),
        String(defense.counterAdviceSummary ?? '').trim(),
        String(battleDigest?.playerFacingSummary ?? '').trim(),
      ].filter(Boolean).join(' '),
      rewriteContext: {
        battleDigest,
      },
      metadata: {
        reportKind: 'defense_outcome',
        campaignId,
        regionId,
      },
    })
  }
}

async function handleAutonomousCombatCampaignArchiveRoute(
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const result = buildAiPlayerAutonomousCombatCampaignArchive(
    aiPlayerId,
    parseOptionalLimit(url.searchParams.get('limit'), 20),
  )
  if ('error' in result) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }
  await recordAutonomousCombatCampaignArchiveEventsInChat(aiPlayerId, result.archive as Record<string, unknown>)
  writeJson(res, 200, result)
}

async function handleAutonomousCombatWarRoomLiveRefreshRoute(
  res: ServerResponse,
  aiPlayerId: string,
  url: URL,
) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }
  const viewerFactionId = String(url.searchParams.get('viewerFactionId') ?? runtime.factionId).trim()
  if (viewerFactionId !== runtime.factionId) {
    writeJson(res, 403, {
      ok: false,
      error: 'war_room_forbidden',
      playerFacingSummary: '战情室权限隔离：该同盟/王国/帝国战情只向本势力成员开放。',
    })
    return
  }
  const result = buildAiPlayerAutonomousCombatWarRoomLiveRefresh(
    aiPlayerId,
    {
      limit: parseOptionalLimit(url.searchParams.get('limit'), 20),
      sinceTick: url.searchParams.get('sinceTick'),
    },
  )
  if ('error' in result) {
    writeJson(res, 404, { ok: false, error: result.error })
    return
  }
  if (!('refresh' in result)) {
    writeJson(res, 500, { ok: false, error: 'war_room_live_refresh_missing' })
    return
  }
  const pushDeliveredCount = broadcastWarRoomLiveRefresh(runtime.factionId, aiPlayerId, result.refresh as Record<string, unknown>)
  ;(result.refresh as Record<string, unknown>).pushDeliveredCount = pushDeliveredCount
  await recordAiPlayerAutonomousCombatWarRoomReportInChat({
    aiPlayerId,
    refresh: result.refresh as Record<string, unknown>,
  })
  writeJson(res, 200, result)
}

async function handleAutonomousCombatWarRoomUiStateRoute(
  req: IncomingMessage,
  res: ServerResponse,
  aiPlayerId: string,
) {
  if (req.method === 'GET') {
    const result = getAiPlayerAutonomousCombatWarRoomUiState(aiPlayerId)
    if ('error' in result) {
      writeJson(res, 404, { ok: false, error: result.error })
      return
    }
    writeJson(res, 200, result)
    return
  }
  if (req.method === 'POST') {
    const parsed = await parseBody(req, aiPlayerWarRoomUiStateRequestSchema)
    if (!parsed.ok) {
      writeJson(res, 400, { ok: false, error: parsed.error })
      return
    }
    const body = parsed.data
    const result = upsertAiPlayerAutonomousCombatWarRoomUiState(aiPlayerId, {
      selectedEnemyId: body.selectedEnemyId,
      enemyHistoryPage: body.enemyHistoryPage,
    })
    if ('error' in result) {
      writeJson(res, 404, { ok: false, error: result.error })
      return
    }
    writeJson(res, 200, result)
    return
  }
  writeJson(res, 405, { ok: false, error: 'method_not_allowed' })
}

function buildAiPlayerModelObservation(aiPlayerId: string, runtime: NonNullable<ReturnType<typeof getGovernedAiPlayerRuntime>>) {
  const world = getWorldStateReadonly()
  const faction = world.factions[runtime.factionId]
  const developmentPlan = buildAiPlayerDevelopmentPlan(runtime)
  const factionUnits = world.units
    .filter((unit) => unit.faction === runtime.factionId)
    .slice(0, 12)
    .map((unit) => ({
      id: unit.id,
      tileId: unit.tileId,
      status: unit.status,
      strength: unit.strength,
      supply: unit.supply,
      heroId: unit.hero.id,
      heroName: unit.hero.name,
    }))

  return {
    aiPlayerId,
    runtime,
    world: {
      tick: world.tick,
      worldVersion: world.worldVersion,
      faction: faction
        ? {
            id: faction.id,
            actionPoints: faction.actionPoints,
            food: faction.food,
            wood: faction.wood ?? 0,
            stone: faction.stone ?? 0,
            iron: faction.iron ?? 0,
            aiResourceAccounts: faction.aiResourceAccounts ?? {},
            governorResourceInboxes: faction.governorResourceInboxes ?? {},
            aiResourceTransferQuotaByAiPlayer: faction.aiResourceTransferQuotaByAiPlayer ?? {},
            aiResourceTransferPolicy: faction.aiResourceTransferPolicy ?? null,
          }
        : null,
      units: factionUnits,
    },
    developmentPlan,
    receipts: runtime.latestReceipt ? [runtime.latestReceipt] : [],
    failures: runtime.observability.recentFailures?.samples ?? [],
  }
}

function resolveProviderLabel(baseUrl: string) {
  try {
    return new URL(baseUrl).host || 'relay'
  } catch {
    return 'relay'
  }
}

function resolveModelProposalErrorStatus(error: string) {
  if (error === 'insufficient_ai_command_credits') {
    return 402
  }
  if (error === 'model_request_failed_429' || error === 'model_provider_backoff_active') {
    return 429
  }
  if (error === 'provider_budget_gate_unavailable') {
    return 503
  }
  if (error === 'model_provider_account_disabled') {
    return 503
  }
  if (error === 'model_provider_account_concurrency_cap_reached'
    || error === 'model_provider_account_not_dispatchable') {
    return 429
  }
  if (error.startsWith('provider_budget_')) {
    return 429
  }
  return error === 'missing_model_api_key' ? 400 : 502
}

async function buildAiPlayerModelProposalRequests(aiPlayerId: string, runtime: NonNullable<ReturnType<typeof getGovernedAiPlayerRuntime>>) {
  const observation = buildAiPlayerModelObservation(aiPlayerId, runtime)
  const testMockOutput = process.env.NODE_ENV === 'test'
    ? process.env.AI_PLAYER_RUNTIME_MODEL_MOCK_OUTPUT?.trim()
    : ''
  if (testMockOutput) {
    const output = parseAiPlayerRuntimeProposalJson(testMockOutput)
    return {
      ok: true as const,
      output,
      proposalRequests: toAiPlayerActionProposalRequests(aiPlayerId, output),
      model: 'mock:test',
      providerFallbackFailures: [],
    }
  }

  const candidates = resolveAiPlayerRuntimeModelTargetCandidates({
    factionId: runtime.factionId,
    ownerPlayerId: runtime.governorPlayerId,
  })
  return await requestAiPlayerRuntimeProposalFromCandidateTargets({
    candidates,
    observation,
    reserveCandidateAttempt: async (candidate, preflight) => {
      const budgetReservation = await reserveAiPlayerProviderBudget({
        aiPlayerId: runtime.aiPlayerId,
        factionId: runtime.factionId,
        governorPlayerId: runtime.governorPlayerId,
        model: candidate.target.model,
        provider: resolveProviderLabel(candidate.target.baseUrl),
        source: candidate.source,
        byokSource: candidate.byokSource,
      })
      if (!budgetReservation.ok) {
        return budgetReservation
      }
      const creditReservation = reserveAiPlayerProviderAiCommandCredits({
        accountId: runtime.governorPlayerId,
        factionId: runtime.factionId,
        usage: preflight.usage,
        aiPlayerId: runtime.aiPlayerId,
        reason: 'provider_request_preflight',
      })
      if (!creditReservation.ok) {
        await releaseAiPlayerProviderBudgetReservation(budgetReservation.reservationId)
        return {
          ok: false,
          error: creditReservation.error,
          reservationId: budgetReservation.reservationId,
          budgetWindowKey: budgetReservation.budgetWindowKey,
          limitMode: budgetReservation.limitMode,
        }
      }
      return {
        ...budgetReservation,
        aiCommandCreditReservationId: creditReservation.reservationId,
        aiCommandCreditReservedCredits: creditReservation.amountCredits,
      }
    },
    commitCandidateAttempt: async (_candidate, result, reservation) => {
      await commitAiPlayerProviderBudgetReservation(reservation?.reservationId, {
        ok: result.ok,
        usage: result.ok ? result.usage : undefined,
        error: result.ok ? undefined : result.error,
      })
      if (!result.ok) {
        releaseAiPlayerProviderAiCommandCreditReservation(reservation?.aiCommandCreditReservationId)
      }
    },
  })
}

async function handleModelProposalsRoute(_req: IncomingMessage, res: ServerResponse, aiPlayerId: string) {
  const runtime = getGovernedAiPlayerRuntime(aiPlayerId)
  if (!runtime) {
    writeJson(res, 404, { ok: false, error: `ai player not found: ${aiPlayerId}` })
    return
  }

  let modelResult: Awaited<ReturnType<typeof buildAiPlayerModelProposalRequests>>
  try {
    modelResult = await buildAiPlayerModelProposalRequests(aiPlayerId, runtime)
  } catch {
    recordAiPlayerRuntimeModelFallbackReasonForOwner(
      runtime.factionId,
      'model_proposal_request_failed',
      runtime.governorPlayerId,
    )
    recordAiPlayerProviderModelRequestAccounting({
      ok: false,
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      error: 'model_proposal_request_failed',
    })
    writeJson(res, 502, { ok: false, error: 'model_proposal_request_failed' })
    return
  }

  if (!modelResult.ok) {
    if (modelResult.providerFallbackFailures?.length) {
      recordAiPlayerRuntimeModelFallbackFailuresForOwner(
        runtime.factionId,
        modelResult.providerFallbackFailures,
        runtime.governorPlayerId,
      )
    } else {
      recordAiPlayerRuntimeModelFallbackReasonForOwner(runtime.factionId, modelResult.error, runtime.governorPlayerId)
    }
    recordAiPlayerProviderModelRequestAccounting({
      ok: false,
      aiPlayerId: runtime.aiPlayerId,
      factionId: runtime.factionId,
      governorPlayerId: runtime.governorPlayerId,
      providerFallbackFailures: modelResult.providerFallbackFailures ?? [],
      error: modelResult.error,
    })
    writeJson(res, resolveModelProposalErrorStatus(modelResult.error), {
      ok: false,
      error: modelResult.error,
      providerFallbackFailures: modelResult.providerFallbackFailures ?? [],
    })
    return
  }
  if (modelResult.providerFallbackFailures?.length) {
    recordAiPlayerRuntimeModelFallbackFailuresForOwner(
      runtime.factionId,
      modelResult.providerFallbackFailures,
      runtime.governorPlayerId,
    )
  } else {
    clearAiPlayerRuntimeModelFallbackReasonForOwner(runtime.factionId, runtime.governorPlayerId)
  }
  const providerRequestId = recordAiPlayerProviderModelRequestAccounting({
    ok: true,
    aiPlayerId: runtime.aiPlayerId,
    factionId: runtime.factionId,
    governorPlayerId: runtime.governorPlayerId,
    selectedProvider: modelResult.selectedProvider ?? null,
    providerFallbackFailures: modelResult.providerFallbackFailures ?? [],
    usage: modelResult.usage,
    budgetWindowKey: modelResult.budgetWindowKey,
    budgetReservationId: modelResult.budgetReservationId,
    aiCommandCreditReservationId: modelResult.aiCommandCreditReservationId,
  })

  const proposals = []
  const rejected = []
  for (const proposalRequest of modelResult.proposalRequests) {
    const created = createAiPlayerActionProposal(proposalRequest)
    if (created.error) {
      rejected.push({
        action: proposalRequest.action,
        error: created.error,
      })
      continue
    }
    proposals.push(created.proposal)
  }

  writeJson(res, rejected.length === 0 ? 200 : 409, {
    ok: rejected.length === 0,
    model: modelResult.model,
    output: modelResult.output,
    proposals,
    proposalCount: proposals.length,
    rejected,
    rejectedCount: rejected.length,
    providerFallback: {
      requestId: providerRequestId,
      selectedProvider: modelResult.selectedProvider ?? null,
      failureCount: modelResult.providerFallbackFailures?.length ?? 0,
      failures: modelResult.providerFallbackFailures ?? [],
    },
  })
}

export async function dispatchAiPlayerRuntimeRoutes(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  url: URL,
): Promise<boolean> {
  if (req.method === 'GET' && pathname === '/api/ai/player-actions/catalog') {
    writeJson(res, 200, {
      catalog: listAiPlayerActionCatalog(),
    })
    return true
  }

  if (req.method === 'POST' && pathname === '/api/ai/players') {
    await handleRegisterRoute(req, res)
    return true
  }

  if (req.method === 'GET' && pathname === '/api/ai/players') {
    handleListPlayersRoute(req, res, url)
    return true
  }

  if (!pathname.startsWith('/api/ai/players/')) {
    return false
  }

  const suffix = pathname.slice('/api/ai/players/'.length)
  const [aiPlayerId, operation, subOperation] = suffix.split('/')
  if (!aiPlayerId) {
    writeJson(res, 400, { ok: false, error: 'aiPlayerId required.' })
    return true
  }

  if (req.method === 'GET' && !operation) {
    handleGetPlayerRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'GET' && operation === 'home-city' && subOperation === 'candidates') {
    handleHomeCityCandidatesRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'POST' && operation === 'home-city' && !subOperation) {
    await handleBindHomeCityRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'POST' && operation === 'model-proposals') {
    await handleModelProposalsRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'GET' && operation === 'development-plan') {
    handleDevelopmentPlanRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'subject') {
    handleSubjectRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'battle-reports') {
    handleBattleReportsRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'execution-trace') {
    handleExecutionTraceRoute(req, res, aiPlayerId, url)
    return true
  }
  if (operation === 'autonomous-development' && subOperation === 'run') {
    if (req.method !== 'POST') {
      writeJson(res, 405, { ok: false, error: 'method_not_allowed' })
      return true
    }
    await handleAutonomousDevelopmentRunRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-development' && subOperation === 'observation') {
    handleAutonomousDevelopmentObservationRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-combat' && subOperation === 'observation') {
    handleAutonomousCombatObservationRoute(req, res, aiPlayerId, url)
    return true
  }
  if (operation === 'autonomous-combat' && subOperation === 'run') {
    if (req.method !== 'POST') {
      writeJson(res, 405, { ok: false, error: 'method_not_allowed' })
      return true
    }
    await handleAutonomousCombatRunRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-combat' && subOperation === 'personal-reports') {
    handleAutonomousCombatPersonalReportsRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-combat' && subOperation === 'player-reports') {
    handleAutonomousCombatPlayerReportsRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-combat' && subOperation === 'daily-summary') {
    await handleAutonomousCombatDailySummaryRoute(res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-combat' && subOperation === 'campaign-archive') {
    await handleAutonomousCombatCampaignArchiveRoute(res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-combat' && subOperation === 'war-room-live-refresh') {
    await handleAutonomousCombatWarRoomLiveRefreshRoute(res, aiPlayerId, url)
    return true
  }
  if (operation === 'autonomous-combat' && subOperation === 'war-room-ui-state') {
    await handleAutonomousCombatWarRoomUiStateRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-development' && subOperation === 'personal-reports') {
    handleAutonomousDevelopmentPersonalReportsRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'GET' && operation === 'autonomous-development' && subOperation === 'player-reports') {
    handleAutonomousDevelopmentPlayerReportsRoute(req, res, aiPlayerId, url)
    return true
  }
  if (req.method === 'POST' && operation === 'profile') {
    await handleProfileRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'POST' && operation === 'avatar-image') {
    await handleAvatarImageRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'POST' && operation === 'context-documents' && subOperation === 'refine') {
    await handleContextDocumentRefineRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'POST' && operation === 'context-documents' && !subOperation) {
    await handleContextDocumentRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'POST' && operation === 'pause') {
    await handlePauseRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'POST' && operation === 'resume') {
    await handleResumeRoute(req, res, aiPlayerId)
    return true
  }
  if (req.method === 'GET' && operation === 'receipts') {
    handleReceiptsRoute(req, res, aiPlayerId, url)
    return true
  }

  return false
}
