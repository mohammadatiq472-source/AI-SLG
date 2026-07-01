import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { DEFAULT_AI_PLAYER_RUNTIME_MODEL } from '../application/ai/aiPlayerRuntimeModelTarget'

type ProviderVoiceSoakRun = {
  index: number
  ok: boolean
  durationMs: number
  evidenceDir: string
  screenshotPath: string
  multiEventScreenshotPath: string
  textRewriteOk: boolean
  voiceSynthesisOk: boolean
  godotPlaybackOk: boolean
  bodyVisibleWithVoice: boolean
  multiEventOk: boolean
  multiEventSourcesOk: boolean
  multiEventSourceCount: number
  multiEventMissingSources: string[]
  fallbackCount: number
  forbiddenCopyLeakCount: number
  multiEventForbiddenCopyLeakCount: number
  coordinateDigestOk: boolean
  coordinateDigestNeedleCount: number
  coordinateDigestSeededReportCount: number
  coordinateDigestOmittedReportCount: number
  defaultReportAttemptCount: number
  multiEventAttemptCount: number
  godotParseErrorAttemptCount: number
  audioAssetId?: string
  failureReason?: string
}

type LatencyDistribution = {
  minMs: number
  p50Ms: number
  p90Ms: number
  p95Ms: number
  maxMs: number
  averageMs: number
}

type ProviderVoiceSoakReport = {
  ok: boolean
  status: 'pass' | 'fail'
  generatedAt: string
  gate: 'gate:ai:combat-provider-voice-soak'
  mode: 'live_provider_strict_budget'
  target: {
    textModelHost: string
    textModel: string
    defaultModel: string
    voiceProvider: 'mimo'
    textKeyConfigured: boolean
    voiceKeyConfigured: boolean
    secretPolicy: 'env_only_no_file_no_echo'
  }
  durationLimitMs: number
  durationMs: number
  minRuns: number
  maxRuns: number
  completedRuns: number
  successRuns: number
  failureRuns: number
  fallbackCount: number
  failureRate: number
  failureRateBps: number
  fallbackRate: number
  fallbackRateBps: number
  averageRunDurationMs: number
  latencyDistributionMs: LatencyDistribution
  providerFailureCount: number
  playbackFailureCount: number
  multiEventFailureCount: number
  coordinateDigestFailureCount: number
  godotParseErrorRetryCount: number
  forbiddenCopyLeakCount: number
  stopReason: 'max_runs_reached' | 'duration_elapsed' | 'failed'
  runs: ProviderVoiceSoakRun[]
  reportPath?: string
  stampedReportPath?: string
  failure?: Record<string, unknown>
}

const GATE_NAME = 'gate:ai:combat-provider-voice-soak' as const
const LATEST_REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_player_combat_provider_voice_soak_latest.json')
const TEXT_KEY_ENV = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'
const VOICE_KEY_ENV = 'MIMO_API_KEY'
const DEFAULT_REPORT_ACTION = 'shell_open_chat_default_report_voice_playback'
const MULTI_EVENT_REPORT_ACTION = 'shell_open_chat_war_room_report_fixture'
const DEFAULT_SMOKE_RETRY_COUNT = 1
const GODOT_SCRIPT_PREFLIGHT_ACTIONS = new Set<string>([DEFAULT_REPORT_ACTION])
const REQUIRED_MULTI_EVENT_SOURCES = [
  'autonomous_combat_daily_summary_report',
  'autonomous_combat_siege_report',
  'autonomous_combat_incoming_attack_report',
  'autonomous_combat_defense_outcome_report',
  'autonomous_combat_war_room_report',
] as const

function readBoundedIntArg(name: string, fallback: number, min: number, max: number) {
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`))
  const raw = inline ? inline.slice(name.length + 1) : process.argv[process.argv.indexOf(name) + 1]
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(min, Math.min(max, Math.trunc(parsed)))
}

function readFlag(name: string) {
  return process.argv.includes(name)
}

function targetHost(baseUrl: string) {
  try {
    return new URL(baseUrl).host
  } catch {
    return 'invalid'
  }
}

function sanitizeError(error: unknown) {
  const normalized = error instanceof Error ? error : new Error(String(error))
  return {
    name: normalized.name,
    message: normalized.message,
    stackHead: normalized.stack?.split(/\r?\n/).slice(0, 8),
  }
}

function writeReport(report: ProviderVoiceSoakReport): ProviderVoiceSoakReport {
  mkdirSync(dirname(LATEST_REPORT_PATH), { recursive: true })
  const stampedReportPath = LATEST_REPORT_PATH.replace(
    /\.json$/,
    `_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
  )
  const payload = {
    ...report,
    reportPath: LATEST_REPORT_PATH,
    stampedReportPath,
  }
  writeFileSync(LATEST_REPORT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  writeFileSync(stampedReportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
  return payload
}

function runNpmVisualSmoke(evidenceDir: string, timeoutSec: number, clickAction: string) {
  const narrativeRewriteEnabled = clickAction === DEFAULT_REPORT_ACTION
  const env = {
    ...process.env,
    AI_PLAYER_COMBAT_NARRATIVE_REWRITE_ENABLED: narrativeRewriteEnabled ? 'true' : 'false',
    AI_PLAYER_VOICE_PROVIDER: 'mimo',
    AI_PLAYER_COMBAT_NARRATIVE_REWRITE_TIMEOUT_MS: process.env.AI_PLAYER_COMBAT_NARRATIVE_REWRITE_TIMEOUT_MS?.trim() || '10000',
  }
  const args = [
    'run',
    'godot:mainline:visual-smoke',
    '--',
    '--click-action',
    clickAction,
    '--isolated-backend-state',
    '--timeout-sec',
    String(timeoutSec),
    '--evidence-dir',
    evidenceDir,
  ]
  if (GODOT_SCRIPT_PREFLIGHT_ACTIONS.has(clickAction)) {
    args.push('--godot-script-preflight')
  }
  const command = ['npm', ...args].join(' ')
  return process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', command], {
      cwd: process.cwd(),
      env,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: (timeoutSec + 60) * 1000,
    })
    : spawnSync('npm', args, {
    cwd: process.cwd(),
    env,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: (timeoutSec + 60) * 1000,
    })
}

function readJsonFile(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function smokeSummaryOk(evidenceDir: string) {
  try {
    const summary = readJsonFile(join(evidenceDir, 'mainline_visual_smoke_summary.json'))
    return Boolean(summary.ok)
  } catch {
    return false
  }
}

function readTextFileIfExists(path: string) {
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return ''
  }
}

function classifySmokeFailureText(text: string): string | undefined {
  if (/Parse Error|Failed to load script/i.test(text)) {
    return 'godot_parse_error'
  }
  if (/CrashHandlerException|signal 11|Parameter \"mem\" is null/i.test(text)) {
    return 'godot_native_crash'
  }
  return undefined
}

function classifySmokeAttemptFailure(evidenceDir: string, status: number | null): { failureKind?: string; error?: string } {
  const summary = (() => {
    try {
      return readJsonFile(join(evidenceDir, 'mainline_visual_smoke_summary.json'))
    } catch {
      return {}
    }
  })()
  const summaryError = String(summary.error ?? '').trim()
  const godotLog = readTextFileIfExists(join(evidenceDir, 'godot.log'))
  const combined = `${summaryError}\n${godotLog}`
  const logFailureKind = classifySmokeFailureText(combined)
  if (logFailureKind === 'godot_parse_error') {
    return {
      failureKind: 'godot_parse_error',
      error: summaryError || 'godot_parse_error',
    }
  }
  if (logFailureKind === 'godot_native_crash') {
    return {
      failureKind: 'godot_native_crash',
      error: summaryError || 'godot_native_crash',
    }
  }
  if (summaryError) {
    return {
      failureKind: summaryError,
      error: summaryError,
    }
  }
  if (status !== 0 && status !== null) {
    return {
      failureKind: 'visual_smoke_exit_nonzero',
      error: `visual_smoke_exit_${status}`,
    }
  }
  if (status === null) {
    return {
      failureKind: 'visual_smoke_timeout',
      error: 'visual_smoke_timeout',
    }
  }
  return {}
}

function runNpmVisualSmokeWithRetries(baseEvidenceDir: string, timeoutSec: number, clickAction: string, retryCount: number) {
  let lastCompleted: ReturnType<typeof runNpmVisualSmoke> | null = null
  let lastEvidenceDir = baseEvidenceDir
  const attempts: Array<{ evidenceDir: string; status: number | null; summaryOk: boolean; failureKind?: string; error?: string }> = []
  for (let attemptIndex = 0; attemptIndex <= retryCount; attemptIndex += 1) {
    const evidenceDir = attemptIndex === 0 ? baseEvidenceDir : `${baseEvidenceDir}_retry_${attemptIndex + 1}`
    const completed = runNpmVisualSmoke(evidenceDir, timeoutSec, clickAction)
    const summaryOk = smokeSummaryOk(evidenceDir)
    const failure = summaryOk ? {} : classifySmokeAttemptFailure(evidenceDir, completed.status)
    attempts.push({
      evidenceDir,
      status: completed.status,
      summaryOk,
      ...failure,
    })
    lastCompleted = completed
    lastEvidenceDir = evidenceDir
    if (completed.status === 0 && summaryOk) {
      break
    }
  }
  return {
    completed: lastCompleted ?? runNpmVisualSmoke(baseEvidenceDir, timeoutSec, clickAction),
    evidenceDir: lastEvidenceDir,
    attemptCount: attempts.length,
    attempts,
  }
}

function countForbiddenCopyLeaks(text: string) {
  const forbidden = [
    'proposalId',
    'worldAction',
    'queuePlanExecution',
    'stateKind',
    'regionId',
    'provider',
    'env',
    'key',
    'MIMO_API_KEY',
    'AI_PLAYER_RUNTIME_MODEL_API_KEY',
    'east_expansion',
    'west_front',
    'frontline_east',
    'neutral_neighbor',
    'war-room',
    'push',
  ]
  return forbidden.filter((item) => text.includes(item)).length
}

function summarizeMultiEventSources(clickActionResult: Record<string, unknown>) {
  const sourcesRaw = clickActionResult.chatWarRoomReportBackendSources
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw.map((item) => String(item)).filter(Boolean)
    : []
  const missingSources = REQUIRED_MULTI_EVENT_SOURCES.filter((source) => !sources.includes(source))
  return {
    requiredSources: [...REQUIRED_MULTI_EVENT_SOURCES],
    sources,
    missingSources,
    sourceCount: sources.length,
    sourcesOk: missingSources.length === 0 && Boolean(clickActionResult.chatWarRoomReportBackendSourcesOk),
  }
}

function countFallbackNarrativeHits(text: string) {
  const fallbackNeedles = [
    '今天暂时没有收到战斗线回报',
    '今天没有收到后端行动回报',
    '没有收到后端行动回报',
    '暂无可播报战况',
    '暂无新的战况',
  ]
  return fallbackNeedles.filter((item) => text.includes(item)).length
}

const COORDINATE_DIGEST_NEEDLES = [
  '战报',
  '热点',
  '坐标',
] as const

function summarizeCoordinateDigest(text: string) {
  const needleCount = COORDINATE_DIGEST_NEEDLES.filter((needle) => text.includes(needle)).length
  const batchSignals = [
    /看了\d+条战报/,
    /扫了\d+条战报/,
    /刷了\d+条战报/,
    /翻了\d+条战报/,
    /一批战报/,
    /共\d+条/,
    /筛了?\d*个?.*热点/,
    /挑(?:了|出|出来|选)?\d*个?.*热点/,
    /\d+条.*战报.*热点/,
  ]
  const hasBatchSignal = batchSignals.some((pattern) => pattern.test(text))
  return {
    ok: needleCount === COORDINATE_DIGEST_NEEDLES.length && hasBatchSignal,
    needleCount,
    needles: [...COORDINATE_DIGEST_NEEDLES],
  }
}

function percentile(sortedValues: number[], percentileValue: number) {
  if (sortedValues.length === 0) {
    return 0
  }
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1))
  return sortedValues[index]
}

function summarizeLatencyDistribution(runs: ProviderVoiceSoakRun[]): LatencyDistribution {
  const values = runs.map((run) => run.durationMs).filter((value) => Number.isFinite(value)).sort((left, right) => left - right)
  if (values.length === 0) {
    return {
      minMs: 0,
      p50Ms: 0,
      p90Ms: 0,
      p95Ms: 0,
      maxMs: 0,
      averageMs: 0,
    }
  }
  const total = values.reduce((sum, value) => sum + value, 0)
  return {
    minMs: values[0],
    p50Ms: percentile(values, 50),
    p90Ms: percentile(values, 90),
    p95Ms: percentile(values, 95),
    maxMs: values[values.length - 1],
    averageMs: Math.round(total / values.length),
  }
}

function buildFailedRun(index: number, startedAt: number, evidenceDir: string, failureReason: string): ProviderVoiceSoakRun {
  return {
    index,
    ok: false,
    durationMs: Date.now() - startedAt,
    evidenceDir,
    screenshotPath: '',
    multiEventScreenshotPath: '',
    textRewriteOk: false,
    voiceSynthesisOk: false,
    godotPlaybackOk: false,
    bodyVisibleWithVoice: false,
    multiEventOk: false,
    multiEventSourcesOk: false,
    multiEventSourceCount: 0,
    multiEventMissingSources: [...REQUIRED_MULTI_EVENT_SOURCES],
    fallbackCount: 0,
    forbiddenCopyLeakCount: 0,
    multiEventForbiddenCopyLeakCount: 0,
    coordinateDigestOk: false,
    coordinateDigestNeedleCount: 0,
    coordinateDigestSeededReportCount: 0,
    coordinateDigestOmittedReportCount: 0,
    defaultReportAttemptCount: 1,
    multiEventAttemptCount: 0,
    godotParseErrorAttemptCount: 0,
    failureReason,
  }
}

function summarizeReportStats(runs: ProviderVoiceSoakRun[]) {
  const completedRuns = runs.length
  const successRuns = runs.filter((run) => run.ok).length
  const failureRuns = completedRuns - successRuns
  const fallbackCount = runs.reduce((total, run) => total + run.fallbackCount, 0)
  const forbiddenCopyLeakCount = runs.reduce((total, run) => total + run.forbiddenCopyLeakCount + run.multiEventForbiddenCopyLeakCount, 0)
  const providerFailureCount = runs.filter((run) => !run.textRewriteOk || !run.voiceSynthesisOk || run.fallbackCount > 0).length
  const playbackFailureCount = runs.filter((run) => !run.godotPlaybackOk || !run.bodyVisibleWithVoice).length
  const multiEventFailureCount = runs.filter((run) => !run.multiEventOk || !run.multiEventSourcesOk || run.multiEventForbiddenCopyLeakCount > 0).length
  const coordinateDigestFailureCount = runs.filter((run) => !run.coordinateDigestOk).length
  const godotParseErrorRetryCount = runs.reduce((total, run) => total + run.godotParseErrorAttemptCount, 0)
  const failureRate = completedRuns > 0 ? failureRuns / completedRuns : 0
  const fallbackRate = completedRuns > 0 ? fallbackCount / completedRuns : 0
  return {
    completedRuns,
    successRuns,
    failureRuns,
    fallbackCount,
    failureRate,
    failureRateBps: Math.round(failureRate * 10_000),
    fallbackRate,
    fallbackRateBps: Math.round(fallbackRate * 10_000),
    averageRunDurationMs: completedRuns > 0 ? Math.round(runs.reduce((total, run) => total + run.durationMs, 0) / completedRuns) : 0,
    latencyDistributionMs: summarizeLatencyDistribution(runs),
    providerFailureCount,
    playbackFailureCount,
    multiEventFailureCount,
    coordinateDigestFailureCount,
    godotParseErrorRetryCount,
    forbiddenCopyLeakCount,
  }
}

function summarizeDefaultReportSmokeRun(index: number, startedAt: number, evidenceDir: string, exitStatus: number | null, errorMessage?: string): ProviderVoiceSoakRun {
  const summaryPath = join(evidenceDir, 'mainline_visual_smoke_summary.json')
  const summary = readJsonFile(summaryPath)
  const godotReport = readObject(summary.godotReport)
  const clickActionResult = readObject(godotReport.clickActionResult)
  const playback = readObject(clickActionResult.defaultReportVoicePlayback)
  const chatVoiceSummary = readObject(playback.chatVoiceSummary)
  const latestBodyText = String(chatVoiceSummary.chatLatestAiBodyText ?? '').trim()
  const latestSpeakableText = String(chatVoiceSummary.chatLatestAiSpeakableText ?? '').trim()
  const playerVisibleText = [latestBodyText, latestSpeakableText].filter(Boolean).join('\n')
  const fallbackCount = countFallbackNarrativeHits(playerVisibleText)
  const coordinateDigest = summarizeCoordinateDigest(playerVisibleText)
  const audioAssetId = String(playback.chatVoiceAudioAssetId ?? clickActionResult.chatVoiceAudioAssetId ?? '').trim()
  const voicePlaybackWait = readObject(playback.voicePlaybackWait)
  const autoPlaySuccessCountAfter = Number(playback.autoPlaySuccessCountAfter ?? clickActionResult.autoPlaySuccessCountAfter ?? 0) || 0
  const autoPlaySuccessCountBefore = Number(playback.autoPlaySuccessCountBefore ?? clickActionResult.autoPlaySuccessCountBefore ?? 0) || 0
  const seedStep = (Array.isArray(summary.steps) ? summary.steps : [])
    .filter((step): step is Record<string, unknown> => step !== null && typeof step === 'object')
    .find((step) => step.name === 'seed_ai_player_for_voice_playback')
  const seedResult = readObject(seedStep?.defaultCombatReportSeed)
  const battleDigestSeed = readObject(seedResult.battleDigestSeed)
  const run: ProviderVoiceSoakRun = {
    index,
    ok: Boolean(summary.ok) && Boolean(godotReport.ok) && Boolean(clickActionResult.ok) && Boolean(playback.ok) && exitStatus === 0,
    durationMs: Date.now() - startedAt,
    evidenceDir,
    screenshotPath: String(readObject(summary.artifacts).screenshot ?? ''),
    multiEventScreenshotPath: '',
    textRewriteOk: fallbackCount === 0 && latestBodyText.length >= 12 && latestSpeakableText.length >= 12,
    voiceSynthesisOk: Boolean(audioAssetId),
    godotPlaybackOk: Boolean(playback.ok)
      || Boolean(voicePlaybackWait.ok)
      || String(voicePlaybackWait.reason ?? '') === 'voice_audio_playback_started'
      || autoPlaySuccessCountAfter > autoPlaySuccessCountBefore
      || autoPlaySuccessCountAfter > 0,
    bodyVisibleWithVoice: Boolean(playback.chatVoicePlayableBodyTextVisible) || Boolean(chatVoiceSummary.chatVoicePlayableBodyTextVisible),
    multiEventOk: false,
    multiEventSourcesOk: false,
    multiEventSourceCount: 0,
    multiEventMissingSources: [...REQUIRED_MULTI_EVENT_SOURCES],
    fallbackCount,
    forbiddenCopyLeakCount: countForbiddenCopyLeaks(playerVisibleText),
    multiEventForbiddenCopyLeakCount: 0,
    coordinateDigestOk: coordinateDigest.ok,
    coordinateDigestNeedleCount: coordinateDigest.needleCount,
    coordinateDigestSeededReportCount: Number(battleDigestSeed.seededBattleReportCount ?? 0) || 0,
    coordinateDigestOmittedReportCount: Number(seedResult.omittedRelevantReportCount ?? 0) || 0,
    defaultReportAttemptCount: 1,
    multiEventAttemptCount: 0,
    godotParseErrorAttemptCount: 0,
    ...(audioAssetId ? { audioAssetId } : {}),
    ...(errorMessage ? { failureReason: errorMessage } : {}),
  }
  run.ok = run.ok
    && run.textRewriteOk
    && run.voiceSynthesisOk
    && run.godotPlaybackOk
    && run.bodyVisibleWithVoice
    && run.coordinateDigestOk
    && run.coordinateDigestSeededReportCount >= 24
    && run.coordinateDigestOmittedReportCount > 0
    && run.forbiddenCopyLeakCount === 0
  return run
}

function summarizeMultiEventSmokeRun(evidenceDir: string, exitStatus: number | null, errorMessage?: string) {
  const summaryPath = join(evidenceDir, 'mainline_visual_smoke_summary.json')
  const summary = readJsonFile(summaryPath)
  const godotReport = readObject(summary.godotReport)
  const clickActionResult = readObject(godotReport.clickActionResult)
  const sourceSummary = summarizeMultiEventSources(clickActionResult)
  const latestBodyText = String(clickActionResult.chatLatestAiBodyText ?? '').trim()
  const latestSpeakableText = String(clickActionResult.chatLatestAiSpeakableText ?? '').trim()
  const playerVisibleText = [latestBodyText, latestSpeakableText].filter(Boolean).join('\n')
  const forbiddenCopyLeakCount = countForbiddenCopyLeaks(playerVisibleText)
  const ok = Boolean(summary.ok)
    && Boolean(godotReport.ok)
    && Boolean(clickActionResult.ok)
    && exitStatus === 0
    && sourceSummary.sourcesOk
    && forbiddenCopyLeakCount === 0
  return {
    ok,
    sourcesOk: sourceSummary.sourcesOk,
    sourceCount: sourceSummary.sourceCount,
    missingSources: sourceSummary.missingSources,
    forbiddenCopyLeakCount,
    screenshotPath: String(readObject(summary.artifacts).screenshot ?? ''),
    ...(errorMessage ? { failureReason: errorMessage } : {}),
  }
}

function runSelfTestMultiEventSummary() {
  const sourceSummary = summarizeMultiEventSources({
    chatWarRoomReportBackendSources: [...REQUIRED_MULTI_EVENT_SOURCES],
    chatWarRoomReportBackendSourcesOk: true,
  })
  const coordinateDigest = summarizeCoordinateDigest('今天看了32条战报，有12条没来得及细看，先挑三个热点说。坐标(35,8)附近最近12场全胜。')
  const coordinateDigestFallback = summarizeCoordinateDigest('今天暂时没有收到战斗线回报，继续观察。')
  const parsedLogFailure = classifySmokeFailureText('SCRIPT ERROR: Parse Error: Function "_press_mainline_visual_smoke_settings_action_row_button_identity()" not found in base self.\nERROR: Failed to load script "res://scripts/app/main.gd" with error "Parse error".')
  const payload = {
    ok: sourceSummary.sourcesOk,
    multiEventSourcesOk: sourceSummary.sourcesOk,
    forbiddenCopyLeakCount: countForbiddenCopyLeaks('这句玩家文案不该出现 push。'),
    requiredSources: sourceSummary.requiredSources,
    coordinateDigestOk: coordinateDigest.ok,
    coordinateDigestFallbackOk: coordinateDigestFallback.ok,
    coordinateDigestNeedles: coordinateDigest.needles,
    smokeRetryDefault: DEFAULT_SMOKE_RETRY_COUNT,
    godotScriptPreflightDefaultAction: GODOT_SCRIPT_PREFLIGHT_ACTIONS.has(DEFAULT_REPORT_ACTION),
    godotParseErrorClassification: parsedLogFailure,
  }
  console.log(JSON.stringify(payload))
}

async function runGate() {
  const textKey = process.env[TEXT_KEY_ENV]?.trim()
  const voiceKey = process.env[VOICE_KEY_ENV]?.trim()
  const baseModelUrl = process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL?.trim() || 'https://api.deepseek.com'
  const model = process.env.AI_PLAYER_RUNTIME_MODEL?.trim() || DEFAULT_AI_PLAYER_RUNTIME_MODEL
  const durationLimitMs = readBoundedIntArg('--duration-ms', 1_800_000, 30_000, 3_600_000)
  const maxRuns = readBoundedIntArg('--max-runs', 20, 1, 60)
  const minRuns = Math.min(maxRuns, readBoundedIntArg('--min-runs', 1, 1, 60))
  const timeoutSec = readBoundedIntArg('--smoke-timeout-sec', 320, 120, 900)
  const smokeRetryCount = readBoundedIntArg('--smoke-retries', DEFAULT_SMOKE_RETRY_COUNT, 0, 3)
  const maxFailureRateBps = readBoundedIntArg('--max-failure-rate-bps', 0, 0, 10_000)
  const allowMissingProvider = readFlag('--allow-missing-provider')
  const startedAt = Date.now()
  const deadlineAt = startedAt + durationLimitMs
  const runs: ProviderVoiceSoakRun[] = []
  const reportBase = {
    generatedAt: new Date().toISOString(),
    gate: GATE_NAME,
    mode: 'live_provider_strict_budget' as const,
    target: {
      textModelHost: targetHost(baseModelUrl),
      textModel: model,
      defaultModel: DEFAULT_AI_PLAYER_RUNTIME_MODEL,
      voiceProvider: 'mimo' as const,
      textKeyConfigured: Boolean(textKey),
      voiceKeyConfigured: Boolean(voiceKey),
      secretPolicy: 'env_only_no_file_no_echo' as const,
    },
    durationLimitMs,
    minRuns,
    maxRuns,
  }

  assert.ok(allowMissingProvider || textKey, `${TEXT_KEY_ENV} is required for live provider voice soak`)
  assert.ok(allowMissingProvider || voiceKey, `${VOICE_KEY_ENV} is required for live provider voice soak`)

  try {
    while (runs.length < maxRuns && (Date.now() < deadlineAt || runs.length < minRuns)) {
      const index = runs.length + 1
      const evidenceDir = resolve(process.cwd(), 'tmp', 'gates', 'ai-player-combat-provider-voice-soak', `run_${String(index).padStart(2, '0')}_${Date.now()}`)
      const defaultReportEvidenceDir = join(evidenceDir, 'default_report_voice')
      const multiEventEvidenceDir = join(evidenceDir, 'multi_event_war_room')
      mkdirSync(evidenceDir, { recursive: true })
      const runStartedAt = Date.now()
      const defaultReportSmoke = runNpmVisualSmokeWithRetries(defaultReportEvidenceDir, timeoutSec, DEFAULT_REPORT_ACTION, smokeRetryCount)
      const completed = defaultReportSmoke.completed
      const failureReason = completed.error instanceof Error
        ? completed.error.message
        : completed.status === 0
          ? undefined
          : String(completed.stderr || completed.stdout || `visual smoke exited ${completed.status}`).slice(0, 500)
      let run: ProviderVoiceSoakRun
      try {
        run = summarizeDefaultReportSmokeRun(index, runStartedAt, defaultReportSmoke.evidenceDir, completed.status, failureReason)
        run.defaultReportAttemptCount = defaultReportSmoke.attemptCount
        run.godotParseErrorAttemptCount = defaultReportSmoke.attempts.filter((attempt) => attempt.failureKind === 'godot_parse_error').length
      } catch (error) {
        run = buildFailedRun(index, runStartedAt, evidenceDir, sanitizeError(error).message)
        run.defaultReportAttemptCount = defaultReportSmoke.attemptCount
        run.godotParseErrorAttemptCount = defaultReportSmoke.attempts.filter((attempt) => attempt.failureKind === 'godot_parse_error').length
      }
      const multiEventSmoke = runNpmVisualSmokeWithRetries(multiEventEvidenceDir, timeoutSec, MULTI_EVENT_REPORT_ACTION, smokeRetryCount)
      const multiEventCompleted = multiEventSmoke.completed
      const multiEventFailureReason = multiEventCompleted.error instanceof Error
        ? multiEventCompleted.error.message
        : multiEventCompleted.status === 0
          ? undefined
          : String(multiEventCompleted.stderr || multiEventCompleted.stdout || `visual smoke exited ${multiEventCompleted.status}`).slice(0, 500)
      try {
        const multiEvent = summarizeMultiEventSmokeRun(multiEventSmoke.evidenceDir, multiEventCompleted.status, multiEventFailureReason)
        run.multiEventOk = multiEvent.ok
        run.multiEventSourcesOk = multiEvent.sourcesOk
        run.multiEventSourceCount = multiEvent.sourceCount
        run.multiEventMissingSources = multiEvent.missingSources
        run.multiEventForbiddenCopyLeakCount = multiEvent.forbiddenCopyLeakCount
        run.multiEventScreenshotPath = multiEvent.screenshotPath
        run.multiEventAttemptCount = multiEventSmoke.attemptCount
        run.godotParseErrorAttemptCount += multiEventSmoke.attempts.filter((attempt) => attempt.failureKind === 'godot_parse_error').length
        run.durationMs = Date.now() - runStartedAt
        if (!multiEvent.ok && multiEvent.failureReason) {
          run.failureReason = [run.failureReason, multiEvent.failureReason].filter(Boolean).join(' | ')
        }
      } catch (error) {
        run.multiEventOk = false
        run.multiEventSourcesOk = false
        run.multiEventMissingSources = [...REQUIRED_MULTI_EVENT_SOURCES]
        run.multiEventForbiddenCopyLeakCount = 0
        run.multiEventAttemptCount = multiEventSmoke.attemptCount
        run.godotParseErrorAttemptCount += multiEventSmoke.attempts.filter((attempt) => attempt.failureKind === 'godot_parse_error').length
        run.durationMs = Date.now() - runStartedAt
        run.failureReason = [run.failureReason, sanitizeError(error).message].filter(Boolean).join(' | ')
      }
      run.ok = run.ok && run.multiEventOk && run.multiEventSourcesOk && run.multiEventForbiddenCopyLeakCount === 0
      runs.push(run)
    }

    const durationMs = Date.now() - startedAt
    const stats = summarizeReportStats(runs)
    assert.ok(runs.length >= minRuns, `provider voice soak requires at least ${minRuns} completed runs`)
    assert.ok(stats.failureRateBps <= maxFailureRateBps, `provider voice soak failure rate ${stats.failureRateBps}bps exceeded ${maxFailureRateBps}bps`)
    const stopReason = runs.length >= maxRuns ? 'max_runs_reached' : 'duration_elapsed'
    const report = writeReport({
      ok: true,
      status: 'pass',
      ...reportBase,
      durationMs,
      ...stats,
      stopReason,
      runs,
    })
    console.log(`[AI Player Combat Provider Voice Soak Gate] ok=true runs=${runs.length} failureRateBps=${stats.failureRateBps} fallbackCount=${stats.fallbackCount} latest=${report.reportPath}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    const stats = summarizeReportStats(runs)
    writeReport({
      ok: false,
      status: 'fail',
      ...reportBase,
      durationMs,
      ...stats,
      stopReason: 'failed',
      runs,
      failure: sanitizeError(error),
    })
    throw error
  }
}

if (readFlag('--self-test-multi-event-summary')) {
  runSelfTestMultiEventSummary()
} else {
  runGate().catch((error) => {
    console.error(`[AI Player Combat Provider Voice Soak Gate] failed: ${sanitizeError(error).message}`)
    process.exitCode = 1
  })
}
