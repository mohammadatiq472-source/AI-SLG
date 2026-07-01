import assert from 'node:assert/strict'
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

async function requestJsonWithBearer(
  baseUrl: string,
  path: string,
  method: 'GET' | 'POST',
  token: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await response.text()
  return {
    status: response.status,
    data: raw.trim().length > 0 ? JSON.parse(raw) as unknown : null,
  }
}

async function joinFaction(baseUrl: string, factionId: string, playerName: string) {
  const response = await requestJson(baseUrl, '/api/session/join', 'POST', {
    factionId,
    playerName,
  })
  assert.equal(response.status, 200, `session join failed for ${factionId}: ${JSON.stringify(response.data)}`)
  const payload = readObject(response.data)
  const token = String(payload.token ?? '')
  assert.ok(token.length > 0, `${factionId} session join should return token`)
  return token
}

function collectVisibleText(payload: unknown): string {
  const history = readObject(payload)
  const timeline = readObject(history.timeline)
  const saveLoad = readObject(history.saveLoad)
  const cards = readArray(timeline.cards).map((item) => readObject(item))
  const slots = readArray(saveLoad.slots).map((item) => readObject(item))
  return [
    ...cards.flatMap((card) => [
      card.title,
      card.summary,
      card.targetLabel,
      card.resultLabel,
      card.nextActionLabel,
    ]),
    ...slots.flatMap((slot) => [
      slot.slotLabel,
      slot.worldSummary,
      slot.riskHint,
      slot.restorePreviewLabel,
    ]),
  ].filter(Boolean).join('\n')
}

async function runSaveSlotOwnerScopeRuntimeContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    SESSION_STATE_PERSIST_PATH: buildSessionPersistPath('player_history_save_slot_owner_scope_sessions'),
    WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_save_slot_owner_scope_slots'),
    WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_save_slot_owner_scope_archive')}.archive`,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const playerToken = await joinFaction(baseUrl, 'player', 'save_slot_owner_player')
    const enemyToken = await joinFaction(baseUrl, 'enemy', 'save_slot_owner_enemy')

    const legacySave = await requestJson(baseUrl, '/api/save-slots/save', 'POST', {
      slotId: 'legacy_ownerless_slot',
      label: '旧版无归属存档',
    })
    assert.equal(legacySave.status, 200, `legacy ownerless save failed: ${JSON.stringify(legacySave.data)}`)
    assert.equal(readObject(readObject(legacySave.data).slot).ownerFactionId, undefined)

    const playerSave = await requestJsonWithBearer(baseUrl, '/api/save-slots/save', 'POST', playerToken, {
      slotId: 'player_private_slot',
      label: '洛阳玩家存档',
    })
    assert.equal(playerSave.status, 200, `player save failed: ${JSON.stringify(playerSave.data)}`)
    assert.equal(readObject(readObject(playerSave.data).slot).ownerFactionId, 'player')

    const enemySave = await requestJsonWithBearer(baseUrl, '/api/save-slots/save', 'POST', enemyToken, {
      slotId: 'enemy_private_slot',
      label: '敌方私有存档',
    })
    assert.equal(enemySave.status, 200, `enemy save failed: ${JSON.stringify(enemySave.data)}`)
    assert.equal(readObject(readObject(enemySave.data).slot).ownerFactionId, 'enemy')

    const playerSlots = await requestJsonWithBearer(baseUrl, '/api/save-slots', 'GET', playerToken)
    assert.equal(playerSlots.status, 200, `player save-slot list failed: ${JSON.stringify(playerSlots.data)}`)
    const playerSlotIds = readArray(readObject(playerSlots.data).slots).map((slot) => String(readObject(slot).slotId))
    assert.ok(playerSlotIds.includes('player_private_slot'), 'player should see own save slot')
    assert.equal(playerSlotIds.includes('enemy_private_slot'), false, 'player should not see enemy save slot')
    assert.equal(playerSlotIds.includes('legacy_ownerless_slot'), false, 'player session should not inherit legacy ownerless slot')

    const supportSlots = await requestJson(baseUrl, '/api/save-slots', 'GET')
    assert.equal(supportSlots.status, 200, `support save-slot list failed: ${JSON.stringify(supportSlots.data)}`)
    const supportSlotIds = readArray(readObject(supportSlots.data).slots).map((slot) => String(readObject(slot).slotId))
    assert.ok(supportSlotIds.includes('legacy_ownerless_slot'), 'support route without bearer should retain legacy ownerless visibility')

    const playerHistory = await requestJsonWithBearer(baseUrl, '/api/player-history?factionId=player&limit=40', 'GET', playerToken)
    assert.equal(playerHistory.status, 200, `player history failed: ${JSON.stringify(playerHistory.data)}`)
    const playerVisibleText = collectVisibleText(playerHistory.data)
    assert.ok(playerVisibleText.includes('洛阳玩家存档'), 'player history should include own save slot label')
    assert.equal(playerVisibleText.includes('敌方私有存档'), false, 'player history should not expose enemy save slot label')
    assert.equal(playerVisibleText.includes('旧版无归属存档'), false, 'player history should not expose legacy ownerless save slot label')

    const crossLoad = await requestJsonWithBearer(baseUrl, '/api/save-slots/load', 'POST', playerToken, {
      slotId: 'enemy_private_slot',
    })
    assert.equal(crossLoad.status, 200, `cross-faction load should return action response: ${JSON.stringify(crossLoad.data)}`)
    assert.equal(readObject(crossLoad.data).ok, false, 'cross-faction save-slot load should fail as not found')

    const legacyLoad = await requestJsonWithBearer(baseUrl, '/api/save-slots/load', 'POST', playerToken, {
      slotId: 'legacy_ownerless_slot',
    })
    assert.equal(legacyLoad.status, 200, `legacy ownerless load should return action response: ${JSON.stringify(legacyLoad.data)}`)
    assert.equal(readObject(legacyLoad.data).ok, false, 'player session should not load legacy ownerless save slot')

    const ownLoad = await requestJsonWithBearer(baseUrl, '/api/save-slots/load', 'POST', playerToken, {
      slotId: 'player_private_slot',
    })
    assert.equal(ownLoad.status, 200, `own save-slot load failed: ${JSON.stringify(ownLoad.data)}`)
    assert.equal(readObject(ownLoad.data).ok, true, 'own save-slot load should succeed')
  } finally {
    await shutdownChild(child)
  }
}

runSaveSlotOwnerScopeRuntimeContract().then(() => {
  console.log('[player_history_save_slot_owner_scope_runtime_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_save_slot_owner_scope_runtime_contract] failed:', error)
  process.exitCode = 1
})
