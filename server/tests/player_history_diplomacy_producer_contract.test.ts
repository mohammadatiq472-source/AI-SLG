import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import {
  buildSessionPersistPath,
  getAvailablePort,
  readArray,
  readObject,
  requestJson,
  shutdownChild,
  spawnBackend,
  type TailState,
  waitForHealth,
} from './helpers/backendHarness'

type UnitCandidate = {
  id: string
  faction: string
}

function unitCandidates(world: Record<string, unknown>): UnitCandidate[] {
  return readArray(world.units)
    .map((item) => readObject(item))
    .map((unit) => ({
      id: String(unit.id ?? ''),
      faction: String(unit.faction ?? ''),
    }))
    .filter((unit) => unit.id.length > 0 && unit.faction.length > 0)
}

function pickCrossFactionPair(units: UnitCandidate[]): [UnitCandidate, UnitCandidate] {
  for (const proposer of units) {
    const target = units.find((candidate) => candidate.faction !== proposer.faction)
    if (target) {
      return [proposer, target]
    }
  }
  throw new Error('diplomacy producer contract requires at least two factions with units')
}

function visibleCardText(card: Record<string, unknown>): string {
  return [
    card.actorName,
    card.title,
    card.summary,
    card.locationLabel,
    card.targetLabel,
    card.resultLabel,
    card.consequenceLabel,
    card.nextActionLabel,
  ].filter(Boolean).join('\n')
}

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  bearerToken: string,
  timeoutMs = 15_000,
) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(new URL(path, baseUrl), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: controller.signal,
    })
    const raw = await response.text()
    return {
      status: response.status,
      data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runDiplomacyProducerContract() {
  rmSync(join(process.cwd(), 'tmp', 'player-history-diplomacy-producer'), { recursive: true, force: true })

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_diplomacy_producer_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const worldResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(worldResponse.status, 200, `world route failed: ${JSON.stringify(worldResponse.data)}`)
    const world = readObject(readObject(worldResponse.data).world)
    const [proposer, target] = pickCrossFactionPair(unitCandidates(world))
    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: proposer.faction,
      playerName: proposer.faction,
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const sessionToken = String(readObject(join.data).token ?? '')
    assert.ok(sessionToken.length > 0, 'session join should return bearer token')

    const propose = await requestJson(baseUrl, '/api/diplomacy/propose', 'POST', {
      proposerId: proposer.id,
      targetId: target.id,
      type: 'ceasefire',
      terms: '边境停火三日，双方不得越界追击。',
    })
    assert.equal(propose.status, 200, `cross-faction diplomacy propose failed: ${JSON.stringify(propose.data)}`)
    const proposal = readObject(readObject(propose.data).proposal)
    const proposalId = String(proposal.id)

    const respond = await requestJson(baseUrl, '/api/diplomacy/respond', 'POST', { proposalId }, 30_000)
    assert.equal(respond.status, 200, `diplomacy respond failed: ${JSON.stringify(respond.data)}`)
    const respondedProposal = readObject(readObject(respond.data).proposal)
    const responseAction = String(readObject(respondedProposal.response).action)
    assert.ok(['accept', 'reject', 'counter'].includes(responseAction), 'response action should be normalized')

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const proposeEvent = eventItems.find((item) => item.action === 'diplomacy_propose' && item.success === true)
    const respondEvent = eventItems.find((item) => item.action === 'diplomacy_respond' && item.success === true)
    assert.ok(proposeEvent, 'runtime events should include successful diplomacy_propose')
    assert.ok(respondEvent, 'runtime events should include successful diplomacy_respond')

    for (const event of [proposeEvent, respondEvent]) {
      const metadata = readObject(readObject(event).metadata)
      assert.equal(metadata.playerHistoryCategory, 'diplomacy')
      assert.equal(typeof metadata.playerHistoryTitle, 'string')
      assert.equal(typeof metadata.playerHistoryActorName, 'string')
      assert.equal(typeof metadata.playerHistorySummary, 'string')
      assert.equal(typeof metadata.playerHistoryTarget, 'string')
      assert.equal(typeof metadata.playerHistoryResultLabel, 'string')
      assert.equal(typeof metadata.playerHistoryConsequence, 'string')
      assert.equal(typeof metadata.playerHistoryNextAction, 'string')
      assert.equal(metadata.playerHistorySeverity, 'medium')
      assert.equal(metadata.playerHistoryScope, 'organization_scope')
      assert.equal(metadata.playerHistorySharePolicy, 'not_shareable_private')
      assert.equal(metadata.playerHistoryShareStateLabel, '暂不可分享')
      assert.equal(typeof metadata.playerHistoryDedupeKey, 'string')
    }

    const history = await requestJsonWithBearer(baseUrl, '/api/player-history?limit=20&eventLimit=20&civilMemoryLimit=5', sessionToken)
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const diplomacyCards = cards.filter((card) => card.category === 'diplomacy')
    assert.ok(diplomacyCards.length >= 2, 'player history should expose diplomacy proposal and response cards')

    const proposedCard = diplomacyCards.find((card) => card.title === '同盟交涉已发起')
    const respondedCard = diplomacyCards.find((card) => card.title === '外交回应已送达')
    assert.ok(proposedCard, 'timeline should include the diplomacy proposed card')
    assert.ok(respondedCard, 'timeline should include the diplomacy responded card')
    assert.equal(proposedCard.resultLabel, '待回应')
    assert.ok(['停战生效', '交涉受阻', '需要复议'].includes(String(respondedCard.resultLabel)))
    assert.equal(proposedCard.nextActionLabel, '查看外交')
    assert.equal(respondedCard.nextActionLabel, '查看外交')
    for (const card of diplomacyCards) {
      assert.equal(card.sharePolicy, undefined, 'private diplomacy cards should not become shareable')
      assert.equal(card.shareStateLabel, '暂不可分享')
    }

    const visiblePayload = diplomacyCards.map(visibleCardText).join('\n')
    for (const required of ['同盟交涉已发起', '外交回应已送达', '边境停火', '查看外交']) {
      assert.ok(visiblePayload.includes(required), `diplomacy visible copy should include ${required}`)
    }
    for (const forbidden of [
      'diplomacy_propose',
      'diplomacy_respond',
      '/api/diplomacy',
      'proposalId',
      'proposerId',
      'targetId',
      'diplo_',
      'controlMode',
      'autonomyLevel',
      'organization_not_ai_player',
      'metadata',
      'debug',
      'route',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `diplomacy visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runDiplomacyProducerContract().then(() => {
  console.log('[player_history_diplomacy_producer_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_diplomacy_producer_contract] failed:', error)
  process.exitCode = 1
})
