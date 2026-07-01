import assert from 'node:assert/strict'
import {
  getAvailablePort,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'
import type { WorldEventRecord } from '../../shared/contracts/game'
import { buildPlayerWorldTimelineReadModel } from '../../shared/domain/playerHistory'
import { filterPlayerHistoryEventsForViewer } from '../src/routes/playerHistory'

async function requestJsonWithBearer(baseUrl: string, path: string, token?: string) {
  const response = await fetch(new URL(path, baseUrl), {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function runPlayerHistoryRuntimeAccessScopeContract() {
  const scopedReadModelProof = buildScopedReadModelProof()
  assert.equal(scopedReadModelProof.visibleCardTitles.includes('敌方密议'), false)
  assert.equal(scopedReadModelProof.visibleCardTitles.includes('外部同盟目标'), false)
  assert.equal(scopedReadModelProof.visibleCardTitles.includes('官员权限调整'), false)
  assert.equal(scopedReadModelProof.visibleCardTitles.includes('己方军议'), true)
  assert.equal(scopedReadModelProof.visibleCardTitles.includes('同盟目标推进'), true)
  assert.equal(scopedReadModelProof.visibleCardTitles.includes('天下公告'), true)
  assert.equal(scopedReadModelProof.officerVisibleCardTitles.includes('官员权限调整'), true)
  assert.equal(scopedReadModelProof.deniedPrivateEventCount, 3)
  assert.equal(scopedReadModelProof.deniedAnchor.accessState, 'private')
  assert.equal(scopedReadModelProof.deniedAnchor.accessFeedbackLabel, '这条提醒暂时不可查看')
  assert.equal(scopedReadModelProof.deniedAnchor.title, '有记录暂未开放')
  assert.equal(scopedReadModelProof.deniedAnchor.body, '相关成员可查看详情')
  assert.equal(JSON.stringify(scopedReadModelProof.deniedAnchor).includes('敌方密议'), false)
  assert.equal(JSON.stringify(scopedReadModelProof.deniedAnchor).includes('foreign_faction'), false)

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail)

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'history_scope_player',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const joined = readObject(join.data)
    const token = String(joined.token)
    assert.ok(token.length > 0, 'session join should return a bearer token')

    const allowed = await requestJsonWithBearer(baseUrl, '/api/player-history?factionId=player&limit=20', token)
    assert.equal(allowed.status, 200, `own faction player history should pass: ${JSON.stringify(allowed.data)}`)
    const allowedPayload = readObject(allowed.data)
    assert.equal(readObject(allowedPayload.timeline).contractId, 'player_world_timeline_read_model_v1')

    const deniedForeign = await requestJsonWithBearer(baseUrl, '/api/player-history?factionId=foreign_faction&limit=20', token)
    assert.equal(deniedForeign.status, 403, `foreign faction player history should be denied: ${JSON.stringify(deniedForeign.data)}`)
    const deniedForeignPayload = readObject(deniedForeign.data)
    assert.equal(deniedForeignPayload.ok, false)
    assert.equal(deniedForeignPayload.deniedCopy, '暂无权限查看这段记录')

    const deniedMissing = await requestJsonWithBearer(baseUrl, '/api/player-history?factionId=player&limit=20')
    assert.equal(deniedMissing.status, 401, `declared faction without token should be denied: ${JSON.stringify(deniedMissing.data)}`)
    const deniedMissingPayload = readObject(deniedMissing.data)
    assert.equal(deniedMissingPayload.ok, false)
    assert.equal(deniedMissingPayload.deniedCopy, '暂无权限查看这段记录')

    const deniedVisibleCopy = [
      deniedForeignPayload.deniedCopy,
      deniedMissingPayload.deniedCopy,
    ].join('\n')
    for (const forbidden of [
      'token',
      'Authorization',
      'Bearer',
      '/api/',
      'route',
      'provider',
      'archive',
      'debug',
      'ops',
      'foreign_faction',
      'session',
      'factionId',
      'snake_case',
    ]) {
      assert.equal(deniedVisibleCopy.includes(forbidden), false, `access denied visible copy leaked ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

function buildScopedReadModelProof() {
  const events: WorldEventRecord[] = [
    buildScopedEvent({
      id: 'public-event',
      title: '天下公告',
      factionId: 'neutral',
      scope: 'public_world',
    }),
    buildScopedEvent({
      id: 'own-private-event',
      title: '己方军议',
      factionId: 'player',
      scope: 'faction_private',
    }),
    buildScopedEvent({
      id: 'foreign-private-event',
      title: '敌方密议',
      factionId: 'foreign_faction',
      scope: 'private_ai',
    }),
    buildScopedEvent({
      id: 'own-organization-event',
      title: '同盟目标推进',
      factionId: 'player',
      scope: 'own_organization',
      organizationId: 'player',
      category: 'organization_nation',
    }),
    buildScopedEvent({
      id: 'foreign-organization-event',
      title: '外部同盟目标',
      factionId: 'foreign_faction',
      scope: 'own_organization',
      organizationId: 'foreign_organization',
      category: 'organization_nation',
    }),
    buildScopedEvent({
      id: 'officer-only-organization-event',
      title: '官员权限调整',
      factionId: 'player',
      scope: 'own_organization',
      organizationId: 'player',
      category: 'organization_nation',
      requiredOfficerRole: 'alliance_commander',
    }),
  ]
  const scopedEvents = filterPlayerHistoryEventsForViewer(events, { factionId: 'player', organizationIds: ['player'] })
  const officerScopedEvents = filterPlayerHistoryEventsForViewer(events, {
    factionId: 'player',
    organizationIds: ['player'],
    organizationOfficerRoleIds: ['alliance_commander'],
  })
  const readModel = buildPlayerWorldTimelineReadModel({
    generatedAt: '2026-06-13T00:00:00.000Z',
    events: scopedEvents.events,
    notificationAnchors: scopedEvents.notificationAnchors,
    limit: 20,
  })
  const officerReadModel = buildPlayerWorldTimelineReadModel({
    generatedAt: '2026-06-13T00:00:00.000Z',
    events: officerScopedEvents.events,
    notificationAnchors: officerScopedEvents.notificationAnchors,
    limit: 20,
  })
  return {
    visibleCardTitles: readModel.cards.map((card) => card.title),
    officerVisibleCardTitles: officerReadModel.cards.map((card) => card.title),
    deniedPrivateEventCount: scopedEvents.deniedPrivateEventCount,
    deniedAnchor: readObject(readModel.historyNotificationAnchors?.[0] ?? {}),
  }
}

function buildScopedEvent(input: {
  id: string
  title: string
  factionId: string
  scope: string
  organizationId?: string
  category?: string
  requiredOfficerRole?: string
}): WorldEventRecord {
  return {
    id: input.id,
    category: 'planning',
    action: 'history_scope_fixture',
    success: true,
    tick: 1,
    worldVersion: 1,
    createdAt: '2026-06-13T00:00:00.000Z',
    metadata: {
      factionId: input.factionId,
      playerHistoryFactionId: input.factionId,
      playerHistoryScope: input.scope,
      playerHistoryRequiredOfficerRole: input.requiredOfficerRole,
      organizationId: input.organizationId,
      playerHistoryCategory: input.category ?? 'ai_activity',
      playerHistoryTitle: input.title,
      playerHistoryActorName: `势力 ${input.factionId}`,
      playerHistorySummary: `${input.title}已记录`,
      playerHistoryResultLabel: '已记录',
      playerHistoryConsequence: '等待后续处理',
      playerHistoryNextAction: '查看大事',
      playerHistorySeverity: 'medium',
    },
  }
}

runPlayerHistoryRuntimeAccessScopeContract().then(() => {
  console.log('[player_history_runtime_access_scope_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_runtime_access_scope_contract] failed:', error)
  process.exitCode = 1
})
