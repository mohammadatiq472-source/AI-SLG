import assert from 'node:assert/strict'
import { registerGovernedAiPlayer } from '../src/application/ai/AIPlayerGovernanceService'
import {
  listAiPlayerChatChannel,
  recordAiPlayerAutonomousCombatDefaultEventInChat,
} from '../src/application/ai/aiPlayerChatCommandService'

const AI_PLAYER_ID = `ai_follow_up_contract_${Date.now()}`

const registerResult = registerGovernedAiPlayer({
  aiPlayerId: AI_PLAYER_ID,
  displayName: '青州后勤官',
  governorPlayerId: 'human_alpha',
  factionId: 'player',
  runtimePolicy: {
    allowAutonomousCombatDailySummaryChatReports: true,
    allowAutonomousCombatWarEventChatReports: true,
    allowAutonomousCombatVoiceReports: false,
  },
})

assert.ok(registerResult.player, `register AI player failed: ${registerResult.error}`)

const battleDigest = {
  schemaVersion: 'ai_combat_battle_digest_v1',
  retainedBattleRecordCount: 32,
  relevantBattleReportCount: 32,
  visibleBattleReportCount: 20,
  omittedRelevantReportCount: 12,
  targetHotspots: [
    {
      hotspotId: 'chunk:0:0',
      center: { x: 35, y: 8 },
      reportCount: 12,
      highSeverityCount: 0,
      winCount: 12,
      lossCount: 0,
      drawCount: 0,
      playerFacingSummary: '热点：坐标(35,8)附近近期有12条相关战报，胜12、负0、平0。',
    },
  ],
  playerFacingSummary: '我看了一批战报，共32条；不逐条刷屏，只挑1个坐标热点说给你听。热点：坐标(35,8)附近近期有12条相关战报。',
}

const message = await recordAiPlayerAutonomousCombatDefaultEventInChat({
  aiPlayerId: AI_PLAYER_ID,
  source: 'autonomous_combat_daily_summary_report',
  eventKey: 'daily:follow-up-intent-contract',
  body: '我看了一批战报，共32条；不逐条刷屏，只挑1个坐标热点说给你听。热点：坐标(35,8)附近近期有12条相关战报。',
  rewriteContext: { battleDigest },
  metadata: { reportKind: 'daily_summary' },
  throttleMs: 0,
})

assert.ok(message, 'default combat chat message should be recorded')
const chatHistory = listAiPlayerChatChannel(AI_PLAYER_ID, 5)
assert.ok(!('error' in chatHistory), `chat history should be queryable: ${'error' in chatHistory ? chatHistory.error : ''}`)
const messages = chatHistory.messages
const latest = messages.find((item) => item.messageId === message?.messageId)
assert.ok(latest, 'recorded message should be queryable from chat history')

const followUpIntent = latest.metadata?.followUpIntent as Record<string, unknown> | undefined
assert.equal(followUpIntent?.intentKind, 'coordinate_hotspot_watch')
assert.equal(followUpIntent?.status, 'watching')
assert.equal(followUpIntent?.source, 'autonomous_combat_daily_summary_report')
assert.equal(followUpIntent?.hotspotId, 'chunk:0:0')
assert.deepEqual(followUpIntent?.center, { x: 35, y: 8 })
assert.equal(followUpIntent?.observedReportCount, 32)
assert.equal(followUpIntent?.omittedReportCount, 12)
assert.match(String(followUpIntent?.playerFacingStatus ?? ''), /我会继续盯坐标\(35,8\)附近/)
assert.match(String(followUpIntent?.triggerCondition ?? ''), /新战报|来袭|失败|集结/)
assert.doesNotMatch(JSON.stringify(followUpIntent), /battleDigest|regionId|stateKind|proposalId|worldAction|provider|env|key/)

console.log('[ai_player_autonomous_combat_follow_up_intent_contract] ok')
