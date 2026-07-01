import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULT_AI_PLAYER_RUNTIME_MODEL } from '../application/ai/aiPlayerRuntimeModelTarget'
import { runGate, type LiveAutonomousCombatRecoveryGateReport } from './runAiPlayerLiveAutonomousCombatRecoveryGate'

type SoakRunSummary = {
  index: number
  ok: boolean
  durationMs: number
  stepCount: number
  plannerSources: unknown
  plannerModels: unknown
  selectedActions: unknown
  receiptWorldActions: unknown
  reportPath: string
  stampedReportPath: string
}

type SoakGateReport = {
  ok: boolean
  status: 'pass' | 'fail'
  generatedAt: string
  gate: 'gate:ai:live-autonomous-combat-recovery:soak'
  mode: 'live_provider_strict_budget'
  target: {
    host: string
    model: string
    defaultModel: string
    defaultModelSource: 'DEFAULT_AI_PLAYER_RUNTIME_MODEL'
    protocol: 'openai_compat'
    hasKey: boolean
    secretSources: string[]
    secretPolicy: 'env_only_no_file_no_echo'
  }
  durationLimitMs: number
  durationMs: number
  minRuns: number
  maxRuns: number
  completedRuns: number
  totalStepCount: number
  stopReason: 'max_runs_reached' | 'duration_elapsed' | 'failed'
  runSummaries: SoakRunSummary[]
  failure?: Record<string, unknown>
  reportPath?: string
  stampedReportPath?: string
}

const SECRET_ENV_NAME = 'AI_PLAYER_RUNTIME_MODEL_API_KEY'
const LATEST_REPORT_PATH = join(process.cwd(), 'tmp', 'gates', 'ai_player_live_autonomous_combat_recovery_soak_gate_latest.json')
const DEFAULT_DURATION_LIMIT_MS = 120_000
const DEFAULT_MAX_RUNS = 2
const DEFAULT_MIN_RUNS = 2

function readBoundedIntArg(name: string, fallback: number, min: number, max: number): number {
  const index = process.argv.indexOf(name)
  if (index < 0 || index + 1 >= process.argv.length) {
    return fallback
  }
  const parsed = Number(process.argv[index + 1])
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.floor(parsed)))
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
    stackHead: normalized.stack?.split(/\r?\n/).slice(0, 6),
  }
}

function writeReport(report: SoakGateReport): SoakGateReport {
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

function summarizeRun(report: LiveAutonomousCombatRecoveryGateReport, index: number, durationMs: number): SoakRunSummary {
  return {
    index,
    ok: report.ok,
    durationMs,
    stepCount: Number(report.summary.stepCount ?? 0),
    plannerSources: report.summary.plannerSources,
    plannerModels: report.summary.plannerModels,
    selectedActions: report.summary.selectedActions,
    receiptWorldActions: report.summary.receiptWorldActions,
    reportPath: String(report.reportPath ?? ''),
    stampedReportPath: String(report.stampedReportPath ?? ''),
  }
}

async function runSoakGate() {
  const apiKey = process.env[SECRET_ENV_NAME]?.trim()
  const baseModelUrl = process.env.AI_PLAYER_RUNTIME_MODEL_BASE_URL?.trim() || 'https://api.deepseek.com'
  const model = process.env.AI_PLAYER_RUNTIME_MODEL?.trim() || DEFAULT_AI_PLAYER_RUNTIME_MODEL
  const durationLimitMs = readBoundedIntArg('--duration-ms', DEFAULT_DURATION_LIMIT_MS, 30_000, 300_000)
  const maxRuns = readBoundedIntArg('--max-runs', DEFAULT_MAX_RUNS, 1, 3)
  const minRuns = Math.min(maxRuns, readBoundedIntArg('--min-runs', DEFAULT_MIN_RUNS, 1, 3))
  const startedAt = Date.now()
  const deadlineAt = startedAt + durationLimitMs
  const runSummaries: SoakRunSummary[] = []
  const reportBase = {
    generatedAt: new Date().toISOString(),
    gate: 'gate:ai:live-autonomous-combat-recovery:soak' as const,
    mode: 'live_provider_strict_budget' as const,
    target: {
      host: targetHost(baseModelUrl),
      model,
      defaultModel: DEFAULT_AI_PLAYER_RUNTIME_MODEL,
      defaultModelSource: 'DEFAULT_AI_PLAYER_RUNTIME_MODEL' as const,
      protocol: 'openai_compat' as const,
      hasKey: Boolean(apiKey),
      secretSources: apiKey ? [SECRET_ENV_NAME] : [],
      secretPolicy: 'env_only_no_file_no_echo' as const,
    },
    durationLimitMs,
    minRuns,
    maxRuns,
  }

  assert.ok(apiKey, `${SECRET_ENV_NAME} is required`)

  try {
    while (runSummaries.length < maxRuns && (Date.now() < deadlineAt || runSummaries.length < minRuns)) {
      const runStartedAt = Date.now()
      const report = await runGate()
      const durationMs = Date.now() - runStartedAt
      const runSummary = summarizeRun(report, runSummaries.length + 1, durationMs)
      runSummaries.push(runSummary)
      assert.equal(runSummary.ok, true, `live recovery soak run ${runSummary.index} failed`)
      assert.equal(runSummary.stepCount, 3, `live recovery soak run ${runSummary.index} should remain a 3-step recovery chain`)
    }

    const durationMs = Date.now() - startedAt
    const totalStepCount = runSummaries.reduce((total, run) => total + run.stepCount, 0)
    assert.ok(runSummaries.length >= minRuns, `live recovery soak requires at least ${minRuns} runs`)
    assert.equal(totalStepCount, runSummaries.length * 3)
    const stopReason = runSummaries.length >= maxRuns ? 'max_runs_reached' : 'duration_elapsed'
    const report = writeReport({
      ok: true,
      status: 'pass',
      ...reportBase,
      durationMs,
      completedRuns: runSummaries.length,
      totalStepCount,
      stopReason,
      runSummaries,
    })
    console.log(`[AI Player Live Autonomous Combat Recovery Soak Gate] ok=true runs=${runSummaries.length} steps=${totalStepCount} stopReason=${stopReason} latest=${String(report.reportPath)}`)
  } catch (error) {
    const durationMs = Date.now() - startedAt
    const totalStepCount = runSummaries.reduce((total, run) => total + run.stepCount, 0)
    writeReport({
      ok: false,
      status: 'fail',
      ...reportBase,
      durationMs,
      completedRuns: runSummaries.length,
      totalStepCount,
      stopReason: 'failed',
      runSummaries,
      failure: sanitizeError(error),
    })
    throw error
  }
}

runSoakGate().catch((error) => {
  console.error(`[AI Player Live Autonomous Combat Recovery Soak Gate] failed: ${sanitizeError(error).message}`)
  process.exitCode = 1
})
