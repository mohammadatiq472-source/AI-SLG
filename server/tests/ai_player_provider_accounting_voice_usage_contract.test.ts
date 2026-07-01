import assert from 'node:assert/strict'
import { existsSync, unlinkSync } from 'node:fs'
import { buildSessionPersistPath, readObject } from './helpers/backendHarness'

const storePath = buildSessionPersistPath('ai_player_provider_accounting_voice_usage_contract_store')
for (const path of [storePath, `${storePath}.tmp`]) {
  if (existsSync(path)) {
    unlinkSync(path)
  }
}
process.env.AI_PLAYER_PROVIDER_ACCOUNT_STORE_PATH = storePath

const providerStore = await import('../src/application/ai/aiPlayerProviderAccountStore')

function testVoiceUsageIsRecordedSeparatelyFromModelTokenUsage() {
  const requestId = providerStore.recordAiPlayerProviderModelRequestAccounting({
    ok: true,
    requestId: 'voice_usage_tts_req_001',
    aiPlayerId: 'voice_usage_ai',
    factionId: 'player',
    governorPlayerId: 'human_voice_usage',
    selectedProvider: {
      model: 'mock-tts-v1',
      provider: 'mock.voice.local',
      keyFingerprint: 'sha256:abcdef1234567890',
      source: 'player_config',
      byokSource: 'player_config',
      priority: 1,
    },
    usageType: 'tts',
    usage: {
      totalTokens: 0,
      estimatedCostUsd: 0,
    },
    usageBreakdown: {
      tts: {
        characters: 22,
        requestCount: 1,
        estimatedCostUsd: 0,
        estimatedCostSource: 'mock',
      },
    },
  } as unknown as Parameters<typeof providerStore.recordAiPlayerProviderModelRequestAccounting>[0])

  assert.equal(requestId, 'voice_usage_tts_req_001')
  const ledger = providerStore.listAiPlayerProviderBillingLedger({ limit: 10 })
  assert.equal(ledger.count, 1)
  const entry = readObject(ledger.items[0])
  assert.equal(entry.requestId, 'voice_usage_tts_req_001')
  assert.equal(entry.usageType, 'tts')
  assert.equal(readObject(entry.usage).totalTokens, 0)
  assert.equal(readObject(readObject(entry.usageBreakdown).tts).characters, 22)
  assert.equal(readObject(readObject(entry.usageBreakdown).tts).estimatedCostSource, 'mock')

  const tokenSummary = providerStore.listAiPlayerProviderTokenSummary({
    aiPlayerId: 'voice_usage_ai',
    provider: 'mock.voice.local',
    model: 'mock-tts-v1',
    keyFingerprint: 'sha256:abcdef1234567890',
  })
  assert.equal(tokenSummary.count, 1)
  assert.equal(readObject(readObject(tokenSummary.items[0]).total).totalTokens, 0)
}

function run() {
  testVoiceUsageIsRecordedSeparatelyFromModelTokenUsage()
  console.log('[ai_player_provider_accounting_voice_usage_contract] all checks passed')
}

run()
