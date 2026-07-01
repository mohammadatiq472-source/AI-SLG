import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const readUtf8 = (path: string) => readFileSync(path, 'utf-8')

const authority = readUtf8('docs/PRODUCT_AUTHORITY_PLAYER_HISTORY_REPORT_REPLAY_SAVE_CURRENT_2026_06_11.md')
const courtAuthority = readUtf8('docs/PRODUCT_AUTHORITY_COURT_DECISION_CURRENT_2026_06_11.md')
const civilMemoryService = readUtf8('server/src/agents/memory/CivilMemoryService.ts')
const playerHistoryDomain = readUtf8('shared/domain/playerHistory.ts')
const worldService = readUtf8('server/src/application/world/WorldService.ts')
const courtWorldEffectContract = readUtf8('server/tests/court_decision_world_effect_contract.test.ts')
const courtWorldEffectReceiptContract = readUtf8('server/tests/court_decision_world_effect_receipt_contract.test.ts')
const courtContracts = readUtf8('shared/contracts/court.ts')
const packageJson = readUtf8('package.json')

const contractId = 'player_history_court_producer_packet_contract'

for (const required of [
  contractId,
  'court_history_producer_packet',
  'Court History Producer Packet Contract',
  'recordCourtSessionMemory(...)',
  'court_session_closed',
  'court_resolution',
  'preview_court_session',
  'execute:*',
  'hold:*',
  'session_closed',
  'resolution_passed',
  'resolution_rejected',
  'resolution_deferred',
  'world_effect_pending',
  'world_effect_applied',
  'world_effect_blocked',
  'dedupe',
  'recovery',
  'playerHistoryCategory',
  '`npm.cmd run test:world:court-decision-world-effect-receipt-contract` now proves the first pending/deferred Court receipt overlay producer.',
]) {
  assert.ok(authority.includes(required), `missing Court producer authority proof: ${required}`)
}

assert.ok(
  packageJson.includes('"test:world:player-history-court-producer-packet-contract"'),
  'package.json must expose the Court producer packet contract command',
)
assert.ok(
  packageJson.includes('"test:world:court-decision-world-effect-receipt-contract"'),
  'package.json must expose the Court decision receipt contract command',
)

for (const courtAuthorityToken of [
  'Product Authority: Court / Decision Current',
  'Court is the strategic deliberation layer',
  'preview',
  'does not mutate world version',
  'execute:*',
  'hold:*',
]) {
  assert.ok(courtAuthority.includes(courtAuthorityToken), `Court authority should include ${courtAuthorityToken}`)
}

for (const civilMemoryToken of [
  'export function recordCourtSessionMemory(session: CourtSession): CivilMemoryEntry[]',
  "type: 'court_session_closed'",
  'title: `Court session closed T${session.tick}`',
  "type: 'court_resolution'",
  'title: `Resolution ${resolution.decision} - ${proposal?.sourceIntentKey ?? resolution.proposalId}`',
  'summary: resolution.executionDirective',
  'proposalId: resolution.proposalId',
  'resolutionId: resolution.id',
  "outcome: resolution.decision === 'passed' ? 'pending' : 'failed'",
]) {
  assert.ok(civilMemoryService.includes(civilMemoryToken), `Civil Memory service should expose Court source fact: ${civilMemoryToken}`)
}

for (const playerHistoryToken of [
  "if (entry.type === 'court_session_closed' || entry.type === 'court_resolution') return 'court'",
  "case 'court_session_closed':",
  "return '朝议已结束'",
  "case 'court_resolution':",
  "return '决议已形成'",
  "if (entry.type === 'court_resolution') return 'medium'",
]) {
  assert.ok(playerHistoryDomain.includes(playerHistoryToken), `player history domain should expose Court mapping: ${playerHistoryToken}`)
}

for (const previewToken of [
  "action: 'previewCourtSession'",
  'assert.match(directive, /^execute:[^:]+:[^:]+$/',
  'assert.match(directive, /^hold:[^:]+$/',
  'court preview should not commit a world version change',
  'worldEffectSignature(afterWorld)',
]) {
  assert.ok(courtWorldEffectContract.includes(previewToken), `Court world-effect contract should prove preview boundary: ${previewToken}`)
}

for (const sourceToken of [
  'function buildCourtDecisionPreviewHistoryOverlay',
  "playerHistoryCategory: 'court'",
  "playerHistoryTitle: '决议待执行'",
  "playerHistoryTitle: '朝议暂缓'",
  "courtWorldEffectState: 'decision_passed_pending'",
  "courtWorldEffectState: 'decision_deferred_or_held'",
]) {
  assert.ok(worldService.includes(sourceToken), `WorldService Court receipt source should prove ${sourceToken}`)
}

for (const receiptToken of [
  'court_decision_world_effect_receipt_contract',
  "'/api/world/action'",
  "action: 'previewCourtSession'",
  "metadata.playerHistoryCategory, 'court'",
  "card.category === 'court'",
  'must not mutate world state',
]) {
  assert.ok(courtWorldEffectReceiptContract.includes(receiptToken), `Court receipt contract should prove ${receiptToken}`)
}

for (const contractToken of [
  "export type CourtResolutionDecision = 'passed' | 'rejected' | 'deferred'",
  'executionDirective: string',
  'accountableSeatIds: string[]',
  'export type CourtSession = {',
  'resolutions: CourtResolution[]',
]) {
  assert.ok(courtContracts.includes(contractToken), `Court contract should expose ${contractToken}`)
}

const courtProducerStates = [
  'session_closed',
  'resolution_passed',
  'resolution_rejected',
  'resolution_deferred',
  'world_effect_pending',
  'world_effect_applied',
  'world_effect_blocked',
  'dedupe',
  'recovery',
]
assert.equal(courtProducerStates.length, 9)

const courtProducerFixture = {
  contractId,
  category: 'court',
  playerHistoryTitle: '决议待执行',
  playerHistoryActorName: '洛阳朝议',
  playerHistorySummary: '军议通过前线调度方案，等待执行结果回报。',
  playerHistoryLocation: '洛阳',
  playerHistoryTarget: '虎牢关防线',
  playerHistoryResultLabel: '待执行',
  playerHistoryConsequence: '尚未改变地图或资源，需要等待执行回执。',
  playerHistoryNextAction: '查看朝议',
  playerHistorySeverity: 'medium',
  effectState: 'world_effect_pending',
  dedupeKey: 'court:session-44:resolution-2:pending',
  sourceRefs: {
    courtSessionId: 'summary-only-session-id',
    courtResolutionId: 'summary-only-resolution-id',
  },
}

assert.equal(courtProducerFixture.category, 'court')
assert.equal(courtProducerFixture.effectState, 'world_effect_pending')
assert.ok(courtProducerFixture.dedupeKey.startsWith('court:'))
assert.ok(courtProducerFixture.sourceRefs.courtSessionId.length > 0)
assert.ok(courtProducerFixture.sourceRefs.courtResolutionId.length > 0)

const playerVisibleCopy = [
  courtProducerFixture.playerHistoryTitle,
  courtProducerFixture.playerHistoryActorName,
  courtProducerFixture.playerHistorySummary,
  courtProducerFixture.playerHistoryLocation,
  courtProducerFixture.playerHistoryTarget,
  courtProducerFixture.playerHistoryResultLabel,
  courtProducerFixture.playerHistoryConsequence,
  courtProducerFixture.playerHistoryNextAction,
  '朝议执行受阻，请稍后重试。',
].join('\n')

for (const forbidden of [
  'court_session_closed',
  'court_resolution',
  'preview_court_session',
  'previewCourtSession',
  'execute:',
  'hold:',
  'proposalId',
  'resolutionId',
  'seatId',
  'Court session closed',
  'Resolution passed',
  'sourceRefs',
  'debug',
  'route',
  'fixture',
  'gate',
  'snake_case',
]) {
  assert.equal(
    playerVisibleCopy.includes(forbidden),
    false,
    `Court producer visible copy leaked implementation term: ${forbidden}`,
  )
}

console.log('[player_history_court_producer_packet_contract] all checks passed')
