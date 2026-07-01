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

async function runSaveLoadRestoreApplyContract() {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const tail: TailState = { stdout: [], stderr: [] }
  const child = spawnBackend(port, tail, {
    WORLD_SAVE_SLOTS_PATH: buildSessionPersistPath('player_history_save_load_restore_apply_slots'),
    WORLD_SAVE_SLOTS_ARCHIVE_DIR: `${buildSessionPersistPath('player_history_save_load_restore_apply_archive')}.archive`,
  })

  try {
    const health = await waitForHealth(baseUrl)
    assert.ok(health?.ok, `backend did not become healthy; stdout=${tail.stdout.join('\n')} stderr=${tail.stderr.join('\n')}`)

    const join = await requestJson(baseUrl, '/api/session/join', 'POST', {
      factionId: 'player',
      playerName: 'restore_apply_owner',
    })
    assert.equal(join.status, 200, `session join failed: ${JSON.stringify(join.data)}`)
    const token = String(readObject(join.data).token)
    assert.ok(token.length > 0, 'session join should return a bearer token')

    const saved = await requestJsonWithBearer(
      baseUrl,
      '/api/save-slots/save',
      'POST',
      token,
      {
        slotId: 'restore_apply_contract_slot',
        label: '洛阳战前',
      },
    )
    assert.equal(saved.status, 200, `save-slot save failed: ${JSON.stringify(saved.data)}`)
    const savedSlot = readObject(saved.data).slot
    assert.equal(readObject(savedSlot).ownerFactionId, 'player')

    const savedEvents = await requestJson(baseUrl, '/api/events?limit=30', 'GET')
    assert.equal(savedEvents.status, 200, `events route failed after save: ${JSON.stringify(savedEvents.data)}`)
    const savedEventItems = readArray(readObject(savedEvents.data).items ?? readObject(savedEvents.data).events).map((item) => readObject(item))
    const savedEvent = savedEventItems.find((item) => item.action === 'save_slot' && item.success === true)
    assert.ok(savedEvent, 'runtime events should include successful save_slot')
    const savedMetadata = readObject(readObject(savedEvent).metadata)
    assert.equal(savedMetadata.playerHistoryCategory, 'system')
    assert.equal(savedMetadata.playerHistoryTitle, '存档已保存')
    assert.equal(savedMetadata.playerHistoryActorName, '玩家')
    assert.equal(savedMetadata.playerHistoryTarget, '洛阳战前')
    assert.equal(savedMetadata.playerHistoryResultLabel, '可恢复')
    assert.equal(savedMetadata.playerHistoryNextAction, '需要时可从存档恢复')
    assert.equal(savedMetadata.playerHistorySeverity, 'low')
    assert.equal(savedMetadata.playerHistoryScope, 'own_save_slot')
    assert.equal(savedMetadata.playerHistoryFactionId, 'player')
    assert.equal(typeof savedMetadata.playerHistoryDedupeKey, 'string')

    const anonymousAfterSave = await requestJson(baseUrl, '/api/player-history?limit=30&eventLimit=30&civilMemoryLimit=5', 'GET')
    assert.equal(anonymousAfterSave.status, 200, `anonymous player-history route failed: ${JSON.stringify(anonymousAfterSave.data)}`)
    const anonymousAfterSaveCards = readArray(readObject(readObject(anonymousAfterSave.data).timeline).cards).map((item) => readObject(item))
    assert.equal(
      anonymousAfterSaveCards.some((card) => card.category === 'system' && card.title === '存档已保存'),
      false,
      'anonymous player history must not expose the own-save system card',
    )

    const playerHistoryAfterSave = await requestJsonWithBearer(
      baseUrl,
      '/api/player-history?factionId=player&limit=30&eventLimit=30&civilMemoryLimit=5',
      'GET',
      token,
    )
    assert.equal(playerHistoryAfterSave.status, 200, `player-history after save failed: ${JSON.stringify(playerHistoryAfterSave.data)}`)
    const playerAfterSaveCards = readArray(readObject(readObject(playerHistoryAfterSave.data).timeline).cards).map((item) => readObject(item))
    const savedCard = playerAfterSaveCards.find((card) => card.category === 'system' && card.title === '存档已保存')
    assert.ok(savedCard, 'player history should expose the save-written system card')
    assert.equal(savedCard.actorName, '玩家')
    assert.equal(savedCard.targetLabel, '洛阳战前')
    assert.equal(savedCard.resultLabel, '可恢复')
    assert.equal(savedCard.nextActionLabel, '需要时可从存档恢复')

    const savedVisiblePayload = visibleCardText(savedCard)
    for (const required of ['存档已保存', '玩家', '洛阳战前', '可恢复', '需要时可从存档恢复']) {
      assert.ok(savedVisiblePayload.includes(required), `save-written visible copy should include ${required}`)
    }
    for (const forbidden of [
      'save_slot',
      'slotId',
      'restore_apply_contract_slot',
      '/api/save-slots/save',
      'ownerFactionId',
      'playerHistoryScope',
      'playerHistoryFactionId',
      'metadata',
      'backend',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(savedVisiblePayload.includes(forbidden), false, `save-written visible copy leaked implementation term: ${forbidden}`)
    }

    const prime = await requestJson(baseUrl, '/api/save-slots/smoke-setup/prime', 'POST', {
      slotId: 'restore_apply_contract_slot',
      label: '洛阳战前',
      source: 'current_world',
    })
    assert.equal(prime.status, 200, `save-slot prime failed: ${JSON.stringify(prime.data)}`)

    const missing = await requestJson(baseUrl, '/api/save-slots/load', 'POST', {
      slotId: 'restore_apply_missing_slot',
      playerHistoryScope: 'foreign_save_slot',
      scopeToken: 'foreign_save_slot',
      ownerFactionId: 'other_player',
    })
    assert.equal(missing.status, 200, `missing save-slot load should return action response: ${JSON.stringify(missing.data)}`)
    assert.equal(readObject(missing.data).ok, false, 'missing save-slot load should fail inside the action response')

    const restored = await requestJson(baseUrl, '/api/save-slots/load', 'POST', {
      slotId: 'restore_apply_contract_slot',
      playerHistoryScope: 'foreign_save_slot',
      scopeToken: 'foreign_save_slot',
      ownerFactionId: 'other_player',
    })
    assert.equal(restored.status, 200, `save-slot load failed: ${JSON.stringify(restored.data)}`)
    assert.equal(readObject(restored.data).ok, true, 'existing save-slot load should succeed')

    const events = await requestJson(baseUrl, '/api/events?limit=30', 'GET')
    assert.equal(events.status, 200, `events route failed: ${JSON.stringify(events.data)}`)
    const eventItems = readArray(readObject(events.data).items ?? readObject(events.data).events).map((item) => readObject(item))
    const failedEvent = eventItems.find((item) => item.action === 'load_slot' && item.success === false)
    const restoredEvent = eventItems.find((item) => item.action === 'load_slot' && item.success === true)
    assert.ok(failedEvent, 'runtime events should include failed load_slot restore apply')
    assert.ok(restoredEvent, 'runtime events should include successful load_slot restore apply')

    const failedMetadata = readObject(readObject(failedEvent).metadata)
    assert.equal(failedMetadata.playerHistoryCategory, 'system')
    assert.equal(failedMetadata.playerHistoryTitle, '存档恢复失败')
    assert.equal(failedMetadata.playerHistoryActorName, '玩家')
    assert.equal(failedMetadata.playerHistoryResultLabel, '未找到存档')
    assert.equal(failedMetadata.playerHistorySeverity, 'medium')
    assert.equal(failedMetadata.playerHistoryScope, 'own_save_slot')
    assert.equal(failedMetadata.ownerFactionId, undefined)
    assert.equal(typeof failedMetadata.playerHistoryDedupeKey, 'string')

    const restoredMetadata = readObject(readObject(restoredEvent).metadata)
    assert.equal(restoredMetadata.playerHistoryCategory, 'system')
    assert.equal(restoredMetadata.playerHistoryTitle, '存档已恢复')
    assert.equal(restoredMetadata.playerHistoryActorName, '玩家')
    assert.equal(restoredMetadata.playerHistoryTarget, '洛阳战前')
    assert.equal(restoredMetadata.playerHistoryResultLabel, '已恢复')
    assert.equal(restoredMetadata.playerHistorySeverity, 'low')
    assert.equal(restoredMetadata.playerHistoryScope, 'own_save_slot')
    assert.equal(restoredMetadata.ownerFactionId, undefined)
    assert.equal(typeof restoredMetadata.playerHistoryDedupeKey, 'string')

    const history = await requestJson(baseUrl, '/api/player-history?limit=30&eventLimit=30&civilMemoryLimit=5', 'GET')
    assert.equal(history.status, 200, `player-history route failed: ${JSON.stringify(history.data)}`)
    const timeline = readObject(readObject(history.data).timeline)
    const cards = readArray(timeline.cards).map((item) => readObject(item))
    const systemCards = cards.filter((card) => card.category === 'system')
    const failedCard = systemCards.find((card) => card.title === '存档恢复失败')
    const restoredCard = systemCards.find((card) => card.title === '存档已恢复')
    assert.ok(failedCard, 'player history should expose failed restore apply as a system card')
    assert.ok(restoredCard, 'player history should expose successful restore apply as a system card')
    assert.equal(restoredCard.targetLabel, '洛阳战前')
    assert.equal(restoredCard.resultLabel, '已恢复')
    assert.equal(restoredCard.nextActionLabel, '继续游戏')
    assert.equal(failedCard.resultLabel, '未找到存档')
    assert.equal(failedCard.nextActionLabel, '查看存档')

    const visiblePayload = [failedCard, restoredCard].map((card) => visibleCardText(readObject(card))).join('\n')
    for (const required of ['存档恢复失败', '存档已恢复', '洛阳战前', '继续游戏', '查看存档']) {
      assert.ok(visiblePayload.includes(required), `restore apply visible copy should include ${required}`)
    }
    for (const forbidden of [
      'load_slot',
      'slotId',
      'restore_apply_contract_slot',
      'restore_apply_missing_slot',
      'foreign_save_slot',
      'other_player',
      '/api/save-slots',
      'save-slots',
      'archive',
      'metadata',
      'backend',
      'route',
      'fixture',
      'snake_case',
    ]) {
      assert.equal(visiblePayload.includes(forbidden), false, `restore apply visible copy leaked implementation term: ${forbidden}`)
    }
  } finally {
    await shutdownChild(child)
  }
}

runSaveLoadRestoreApplyContract().then(() => {
  console.log('[player_history_save_load_restore_apply_contract] all checks passed')
}).catch((error) => {
  console.error('[player_history_save_load_restore_apply_contract] failed:', error)
  process.exitCode = 1
})
