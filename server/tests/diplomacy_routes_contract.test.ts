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
  throw new Error('diplomacy contract requires at least two factions with units')
}

function pickSameFactionPair(units: UnitCandidate[]): [UnitCandidate, UnitCandidate] {
  for (const proposer of units) {
    const target = units.find((candidate) => candidate.faction === proposer.faction && candidate.id !== proposer.id)
    if (target) {
      return [proposer, target]
    }
  }
  throw new Error('diplomacy contract requires at least two units in one faction')
}

async function runDiplomacyRoutesContract() {
  rmSync(join(process.cwd(), 'tmp', 'diplomacy'), { recursive: true, force: true })

  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('diplomacy_routes_contract_session_state'),
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health, `backend did not become healthy\nstdout=${tail.stdout.join('\n')}\nstderr=${tail.stderr.join('\n')}`)

    const worldResponse = await requestJson(baseUrl, '/api/world?intelMode=full', 'GET', undefined, 30_000)
    assert.equal(worldResponse.status, 200, `world route failed: ${JSON.stringify(worldResponse.data)}`)
    const world = readObject(readObject(worldResponse.data).world)
    const units = unitCandidates(world)
    const [proposer, target] = pickCrossFactionPair(units)
    const [sameFactionProposer, sameFactionTarget] = pickSameFactionPair(units)

    const sameFaction = await requestJson(baseUrl, '/api/diplomacy/propose', 'POST', {
      proposerId: sameFactionProposer.id,
      targetId: sameFactionTarget.id,
      type: 'alliance',
      terms: '同势力内部不能作为外交对象。',
    })
    assert.equal(sameFaction.status, 400, `same-faction diplomacy should be rejected: ${JSON.stringify(sameFaction.data)}`)
    assert.match(String(readObject(sameFaction.data).error), /same faction|same faction|同/i)

    const propose = await requestJson(baseUrl, '/api/diplomacy/propose', 'POST', {
      proposerId: proposer.id,
      targetId: target.id,
      type: 'ceasefire',
      terms: '边境停火三日，双方不得越界追击。',
    })
    assert.equal(propose.status, 200, `cross-faction diplomacy propose failed: ${JSON.stringify(propose.data)}`)
    const proposal = readObject(readObject(propose.data).proposal)
    const proposalId = String(proposal.id)
    assert.ok(proposalId.startsWith('diplo_'), 'diplomacy proposal should expose a stable diplo id')
    assert.equal(proposal.proposerId, proposer.id)
    assert.equal(proposal.targetId, target.id)
    assert.equal(proposal.proposerFaction, proposer.faction)
    assert.equal(proposal.targetFaction, target.faction)
    assert.notEqual(proposal.proposerFaction, proposal.targetFaction, 'diplomacy must be cross-faction at this route layer')
    assert.equal(proposal.type, 'ceasefire')

    const detailBefore = await requestJson(baseUrl, `/api/diplomacy/proposals/${encodeURIComponent(proposalId)}`, 'GET')
    assert.equal(detailBefore.status, 200, `proposal detail failed: ${JSON.stringify(detailBefore.data)}`)
    assert.equal(readObject(readObject(detailBefore.data).proposal).id, proposalId)

    const listBefore = await requestJson(baseUrl, '/api/diplomacy/proposals', 'GET')
    assert.equal(listBefore.status, 200, `proposal list failed: ${JSON.stringify(listBefore.data)}`)
    const proposalsBefore = readArray(readObject(listBefore.data).proposals).map((item) => readObject(item))
    assert.ok(proposalsBefore.some((item) => item.id === proposalId), 'proposal list should include the created diplomacy proposal')

    const respond = await requestJson(baseUrl, '/api/diplomacy/respond', 'POST', { proposalId }, 30_000)
    assert.equal(respond.status, 200, `diplomacy respond failed: ${JSON.stringify(respond.data)}`)
    const respondedProposal = readObject(readObject(respond.data).proposal)
    const response = readObject(respondedProposal.response)
    assert.equal(respondedProposal.id, proposalId)
    assert.ok(['accept', 'reject', 'counter'].includes(String(response.action)), 'response action should be normalized')
    assert.ok(String(response.targetMessage).length > 0, 'response should expose player-readable target message')
    assert.ok(readArray(readObject(response.consequence).requestedWorldChanges), 'response consequence should expose requested world changes array')

    const detailAfter = await requestJson(baseUrl, `/api/diplomacy/proposals/${encodeURIComponent(proposalId)}`, 'GET')
    assert.equal(detailAfter.status, 200, `proposal detail after response failed: ${JSON.stringify(detailAfter.data)}`)
    assert.ok(readObject(readObject(readObject(detailAfter.data).proposal).response), 'detail should include the persisted response')

    const events = await requestJson(baseUrl, '/api/events?limit=20', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventsPayload = readObject(events.data)
    const eventItems = readArray(eventsPayload.items ?? eventsPayload.events).map((item) => readObject(item))
    assert.ok(
      eventItems.some((item) => item.action === 'diplomacy_propose' && item.success === true),
      'runtime events should include successful diplomacy_propose',
    )
    assert.ok(
      eventItems.some((item) => item.action === 'diplomacy_respond' && item.success === true),
      'runtime events should include successful diplomacy_respond',
    )
  } finally {
    await shutdownChild(child)
  }
}

runDiplomacyRoutesContract().then(() => {
  console.log('[diplomacy_routes_contract] all checks passed')
}).catch((error) => {
  console.error('[diplomacy_routes_contract] failed:', error)
  process.exitCode = 1
})
