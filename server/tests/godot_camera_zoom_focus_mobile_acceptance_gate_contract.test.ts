import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const docSource = readFileSync(
  'docs/parallel-validation/2026-06-19-camera-zoom-focus-validation.md',
  'utf-8',
)
const scriptSource = readFileSync(
  'scripts/run_camera_zoom_focus_mobile_acceptance_gate.py',
  'utf-8',
)
const mapGridSource = readFileSync(
  'godot-client/scripts/map/map_grid.gd',
  'utf-8',
)
const mainSource = readFileSync(
  'godot-client/scripts/app/main.gd',
  'utf-8',
)
const smokeSource = readFileSync(
  'godot-client/tools/run_mainline_visual_smoke.py',
  'utf-8',
)

function assertIncludes(source: string, needle: string, message: string) {
  assert.ok(source.includes(needle), message)
}

for (const caseId of [
  'wheel_pivot',
  'pinch_pivot',
  'state_jump',
  'state_detail_zoom',
  'marker_hit',
  'low_end_cache',
]) {
  assertIncludes(docSource, caseId, `validation doc must include ${caseId}`)
  assertIncludes(scriptSource, caseId, `gate script must include ${caseId}`)
}

for (const thresholdField of [
  'wheelPivotDriftPx <= 2',
  'pinchPivotDriftPx <= 3',
  'pivotCellDrift <= 1',
  'stateFillRatio2k >= 0.62',
  'focusSettleTimeMs <= 900',
  'hitRadiusPx >= 22',
  'labelOverlapCount == 0',
  'viewportCacheHitCount',
  'viewportStaleResponseCount',
  'memoryPeakMb',
]) {
  assertIncludes(docSource, thresholdField, `validation doc must include ${thresholdField}`)
}

for (const requiredNeedle of [
  'camera_zoom_focus_mobile_acceptance_gate_v1',
  '--print-plan',
  '--godot-report',
  'ops:service-process-guard',
  'world_mainworld_camera_pan_resource_roundtrip_fixture',
  'godot:strategic-nodes:zoom-hit-gate',
  '"runtimeReportMissing"',
  '"runtimeSummaryIncomplete"',
  '"runtimeSummaryProducerFailed"',
  '"runtimeSummaryThresholdFailed"',
  '"runtimeSummaryPresent"',
]) {
  assertIncludes(scriptSource, requiredNeedle, `gate script must include ${requiredNeedle}`)
}

for (const requiredNeedle of [
  'stateFillRatio2k',
  'wheelPivotDriftPx',
  'pinchPivotDriftPx',
  'pivotCellDrift',
  'hitRadiusPx',
  'labelOverlapCount',
  'loadedChunkCount',
  'loadedChunkIds',
  'unloadCandidateChunkIds',
  'wheelPivotMetricRecorded',
  'pinchPivotMetricRecorded',
  'tianxiaYutuWheelPivotMetricRecorded',
  'tianxiaYutuPinchPivotMetricRecorded',
  'tianxiaYutuHitMetricRecorded',
]) {
  assertIncludes(mapGridSource, requiredNeedle, `map_grid runtime summary must include ${requiredNeedle}`)
}

for (const requiredNeedle of [
  '_read_camera_zoom_focus_runtime_summary',
  'cameraZoomFocusRuntimeSummary',
  'focusSettleTimeMs',
  'memoryPeakMb',
  'viewportCacheHitCount',
  'viewportStaleResponseCount',
  'memoryAfterUnloadMb',
  'memoryRecoveredMb',
  'cacheUnloadOk',
  'runtimeProducerOk',
  'runtimeProducerInvalidFields',
  'runtimeProducerFieldSources',
  '_last_camera_zoom_focus_settle_recorded',
  'planOnly',
]) {
  assertIncludes(mainSource, requiredNeedle, `main.gd runtime summary must include ${requiredNeedle}`)
}

for (const requiredProducerSourceNeedle of [
  '"loadedChunkIds": "map_grid.get_main_map_streaming_debug_summary.loadedChunkIds"',
  '"unloadCandidateChunkIds": "map_grid.get_main_map_streaming_debug_summary.unloadCandidateChunkIds"',
]) {
  assertIncludes(
    mainSource,
    requiredProducerSourceNeedle,
    `main.gd runtimeProducerFieldSources must include ${requiredProducerSourceNeedle}`,
  )
}

for (const requiredNeedle of [
  'stateFillRatio2k',
  'wheelPivotDriftPx',
  'pinchPivotDriftPx',
  'pivotCellDrift',
  'focusSettleTimeMs',
  'hitRadiusPx',
  'labelOverlapCount',
  'cacheUnloadOk',
  'planOnly',
  'cameraZoomFocusRuntimeSummary',
  'worldMapVideoStyleTransitionChain',
  'worldMapVideoStyleTransitionChainContractFailures',
]) {
  assertIncludes(smokeSource, requiredNeedle, `visual smoke contract must include ${requiredNeedle}`)
}

for (const nestedProducerNeedle of [
  '_camera_runtime_producer_metadata_for_validation',
  'metadata_source = cameraZoomFocusRuntimeSummary',
  'producer_metadata.get("runtimeProducerOk")',
  'producer_metadata.get("runtimeProducerInvalidFields")',
  'producer_metadata.get("runtimeProducerFieldSources")',
]) {
  assertIncludes(
    smokeSource,
    nestedProducerNeedle,
    `mainworld camera runner must accept nested producer metadata via ${nestedProducerNeedle}`,
  )
}

for (const requiredNeedle of [
  'Main-Window Unified Validation Commands',
  'Not Run In This Pass',
  'Tmp Cleanup Items',
  'Files Changed In This Pass',
]) {
  assertIncludes(docSource, requiredNeedle, `validation doc must include section ${requiredNeedle}`)
}

function runGateWithReport(report: Record<string, unknown>, outputName: string) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'camera-focus-gate-contract-'))
  const inputPath = join(tmpDir, `${outputName}-input.json`)
  const outputPath = join(tmpDir, `${outputName}-output.json`)
  const command = process.platform === 'win32' ? 'python' : 'python3'
  writeFileSync(inputPath, JSON.stringify(report))
  const result = spawnSync(command, ['scripts/run_camera_zoom_focus_mobile_acceptance_gate.py', '--godot-report', inputPath, '--output', outputPath], {
    encoding: 'utf-8',
    shell: false,
  })
  const outputText = (result.stdout ?? '') + (result.stderr ?? '')
  const parsed = JSON.parse(readFileSync(outputPath, 'utf-8'))
  rmSync(tmpDir, { force: true, recursive: true })
  return { exitCode: result.status ?? 1, parsed, outputText }
}

function runGateWithArgs(args: string[]) {
  const tmpDir = mkdtempSync(join(tmpdir(), 'camera-focus-gate-contract-'))
  const outputPath = join(tmpDir, 'output.json')
  const result = spawnSync(process.platform === 'win32' ? 'python' : 'python3', ['scripts/run_camera_zoom_focus_mobile_acceptance_gate.py', ...args, '--output', outputPath], {
    encoding: 'utf-8',
    shell: false,
  })
  const parsed = JSON.parse(readFileSync(outputPath, 'utf-8'))
  rmSync(tmpDir, { force: true, recursive: true })
  return { exitCode: result.status ?? 1, parsed, outputText: (result.stdout ?? '') + (result.stderr ?? '') }
}

const requiredRuntimeFields = [
  'runtimeProducerOk',
  'runtimeProducerInvalidFields',
  'runtimeProducerFieldSources',
  'stateFillRatio2k',
  'wheelPivotDriftPx',
  'pinchPivotDriftPx',
  'pivotCellDrift',
  'focusSettleTimeMs',
  'hitRadiusPx',
  'labelOverlapCount',
  'loadedChunkCount',
  'loadedChunkIds',
  'unloadCandidateChunkIds',
  'viewportCacheHitCount',
  'viewportStaleResponseCount',
  'memoryPeakMb',
  'memoryAfterUnloadMb',
  'memoryRecoveredMb',
  'cacheUnloadOk',
]

const runtimePresentReport = {
  cameraZoomFocusEvidence: {
    screenshotPaths: ['tmp/screenshots/camera_zoom_focus_mobile_acceptance/fixture/state_focus.png'],
    summaryPath: 'tmp/gates/camera_zoom_focus_mobile_acceptance_gate.json',
  },
  cameraZoomFocusRuntimeSummary: {
    fixtureOnlyNotRuntimeEvidence: true,
    runtimeProducerOk: true,
    runtimeProducerInvalidFields: [],
    runtimeProducerFieldSources: Object.fromEntries(requiredRuntimeFields.map((key) => [key, 'synthetic_contract_source'])),
    stateFillRatio2k: 0.8,
    wheelPivotDriftPx: 1,
    pinchPivotDriftPx: 2,
    pivotCellDrift: 0.5,
    focusSettleTimeMs: 300,
    hitRadiusPx: 24,
    labelOverlapCount: 0,
    loadedChunkCount: 4,
    loadedChunkIds: ['chunk_y001_x001', 'chunk_y001_x002', 'chunk_y002_x001', 'chunk_y002_x002'],
    unloadCandidateChunkIds: ['chunk_y000_x000'],
    viewportCacheHitCount: 1,
    viewportStaleResponseCount: 0,
    memoryPeakMb: 512,
    memoryAfterUnloadMb: 420,
    memoryRecoveredMb: 92,
    cacheUnloadOk: true,
  },
}

function runtimeReportWith(overrides: Record<string, unknown>) {
  return {
    cameraZoomFocusRuntimeSummary: {
      ...runtimePresentReport.cameraZoomFocusRuntimeSummary,
      ...overrides,
    },
  }
}

function runtimeReportWithout(fields: string[]) {
  const summary: Record<string, unknown> = { ...runtimePresentReport.cameraZoomFocusRuntimeSummary }
  for (const field of fields) {
    delete summary[field]
  }
  return { cameraZoomFocusRuntimeSummary: summary }
}

const missingRuntimeReport = {}
const incompleteRuntimeReport = {
  cameraZoomFocusRuntimeSummary: {
    stateFillRatio2k: 0.8,
  },
}
const legacyR2StyleRuntimeReport = runtimeReportWithout([
  'runtimeProducerOk',
  'runtimeProducerInvalidFields',
  'runtimeProducerFieldSources',
])
const producerFailedRuntimeReport = runtimeReportWith({
  runtimeProducerOk: false,
  runtimeProducerInvalidFields: ['wheelPivotDriftPx'],
})
const producerSourceMissingRuntimeReport = runtimeReportWith({
  runtimeProducerFieldSources: {
    ...runtimePresentReport.cameraZoomFocusRuntimeSummary.runtimeProducerFieldSources,
    loadedChunkIds: '',
  },
})
const unloadProducerSourceMissingRuntimeReport = runtimeReportWith({
  runtimeProducerFieldSources: {
    ...runtimePresentReport.cameraZoomFocusRuntimeSummary.runtimeProducerFieldSources,
    unloadCandidateChunkIds: '',
  },
})
const loadedChunkSampleMissingRuntimeReport = runtimeReportWith({
  loadedChunkIds: [],
})
const unloadCandidateSampleMissingRuntimeReport = runtimeReportWith({
  unloadCandidateChunkIds: [],
})
const loadedChunkCountMismatchRuntimeReport = runtimeReportWith({
  loadedChunkCount: 5,
})
const thresholdFailedRuntimeReport = runtimeReportWith({ stateFillRatio2k: 0.029 })
const realEvidenceShapedRuntimeReport = {
  cameraZoomFocusEvidence: {
    screenshotPaths: ['tmp/screenshots/camera_zoom_focus_mobile_acceptance/heavy/state_focus.png'],
    summaryPath: 'tmp/gates/camera_zoom_focus_mobile_acceptance_gate.json',
  },
  cameraZoomFocusRuntimeSummary: {
    ...runtimePresentReport.cameraZoomFocusRuntimeSummary,
    fixtureOnlyNotRuntimeEvidence: false,
  },
}
const missingScreenshotEvidenceRuntimeReport = {
  cameraZoomFocusRuntimeSummary: {
    ...runtimePresentReport.cameraZoomFocusRuntimeSummary,
    fixtureOnlyNotRuntimeEvidence: false,
  },
}

const completeRun = runGateWithReport(runtimePresentReport, 'complete')
assert.equal(completeRun.exitCode, 0, 'complete runtime report should exit 0')
assert.equal(completeRun.parsed.runtimeSummaryPresent, true, 'runtimeSummaryPresent must be true with complete report')
assert.equal(
  completeRun.parsed.runtimeSummary.fixtureOnlyNotRuntimeEvidence,
  true,
  'passing synthetic fixture must remain marked as fixture-only evidence',
)
assert.deepEqual(
  completeRun.parsed.arraySampleCounts,
  {
    loadedChunkIds: 4,
    unloadCandidateChunkIds: 1,
  },
  'passing synthetic fixture should expose array sample counts',
)
assert.equal(
  completeRun.parsed.evidenceBundle.productGreenEligible,
  false,
  'passing synthetic fixture must not be product-green eligible',
)
assert.equal(
  completeRun.parsed.evidenceBundle.fixtureOnlyNotRuntimeEvidence,
  true,
  'evidence bundle should expose fixture-only marker',
)
assert.ok(
  String(completeRun.parsed.evidenceBundle.productGreenBlockers ?? '').includes('fixtureOnlyNotRuntimeEvidence'),
  'fixture-only report should name product-green blocker',
)
assert.equal(completeRun.parsed.runtimeReportMissing, false, 'runtimeReportMissing should be false with complete report')
assert.equal(completeRun.parsed.runtimeSummaryIncomplete, false, 'runtimeSummaryIncomplete should be false with complete report')
assert.equal(completeRun.parsed.runtimeSummaryProducerFailed, false, 'runtimeSummaryProducerFailed should be false with complete report')
assert.equal(completeRun.parsed.runtimeSummaryThresholdFailed, false, 'runtimeSummaryThresholdFailed should be false with complete report')
const completeRunOutput = runGateWithArgs(['--print-plan'])
assert.equal(completeRunOutput.parsed.status, 'plan_only_not_executed', 'print-plan should remain a plan-only status')
assert.equal(completeRunOutput.parsed.planOnly, true, 'print-plan output should be planOnly=true')
assert.equal(completeRunOutput.parsed.runtimeReportMissing, false, 'plan-only output should not set runtimeReportMissing')
assert.equal(completeRunOutput.parsed.runtimeSummaryPresent, false, 'plan-only output should not set runtimeSummaryPresent')
assert.equal(completeRunOutput.parsed.runtimeSummaryIncomplete, false, 'plan-only output should not set runtimeSummaryIncomplete')
assert.equal(completeRunOutput.parsed.runtimeSummaryProducerFailed, false, 'plan-only output should not set runtimeSummaryProducerFailed')
assert.equal(completeRunOutput.parsed.runtimeSummaryThresholdFailed, false, 'plan-only output should not set runtimeSummaryThresholdFailed')
assert.equal(
  completeRunOutput.parsed.evidenceBundle.productGreenEligible,
  false,
  'plan-only output must not be product-green eligible',
)
assert.ok(
  String(completeRunOutput.parsed.evidenceBundle.productGreenBlockers ?? '').includes('planOnly'),
  'plan-only output should name planOnly blocker',
)

const realEvidenceShapedRun = runGateWithReport(realEvidenceShapedRuntimeReport, 'real-evidence-shaped')
assert.equal(realEvidenceShapedRun.exitCode, 0, 'real-evidence-shaped report should exit 0')
assert.equal(realEvidenceShapedRun.parsed.runtimeSummaryPresent, true, 'real-evidence-shaped report should be runtime present')
assert.equal(
  realEvidenceShapedRun.parsed.evidenceBundle.productGreenEligible,
  true,
  'real-evidence-shaped report should be product-green eligible at the report-consumer layer',
)
assert.equal(
  realEvidenceShapedRun.parsed.evidenceBundle.screenshotEvidencePresent,
  true,
  'real-evidence-shaped report should expose screenshot evidence presence',
)

const missingScreenshotEvidenceRun = runGateWithReport(
  missingScreenshotEvidenceRuntimeReport,
  'missing-screenshot-evidence',
)
assert.equal(missingScreenshotEvidenceRun.exitCode, 0, 'missing screenshot evidence can still pass JSON gate')
assert.equal(
  missingScreenshotEvidenceRun.parsed.evidenceBundle.productGreenEligible,
  false,
  'missing screenshot evidence must not be product-green eligible',
)
assert.ok(
  String(missingScreenshotEvidenceRun.parsed.evidenceBundle.productGreenBlockers ?? '').includes(
    'screenshotEvidenceMissing',
  ),
  'missing screenshot evidence should name screenshotEvidenceMissing blocker',
)

const incompleteRun = runGateWithReport(incompleteRuntimeReport, 'incomplete')
assert.equal(incompleteRun.parsed.runtimeSummaryPresent, false, 'incomplete report should not be present')
assert.equal(incompleteRun.parsed.runtimeReportMissing, false, 'incomplete report should not be missing')
assert.equal(incompleteRun.parsed.runtimeSummaryIncomplete, true, 'incomplete report should set runtimeSummaryIncomplete')
assert.equal(incompleteRun.parsed.status, 'runtimeSummaryIncomplete', 'incomplete report should report runtimeSummaryIncomplete')
assert.ok(
  String(incompleteRun.parsed.missingFields ?? '').includes('wheelPivotDriftPx'),
  'incomplete report should include missing fields list',
)
assert.equal(incompleteRun.exitCode, 2, 'incomplete report should exit non-zero')

const legacyR2StyleRun = runGateWithReport(legacyR2StyleRuntimeReport, 'legacy-r2-style')
assert.equal(legacyR2StyleRun.exitCode, 2, 'legacy r2-style report without producer metadata should exit non-zero')
assert.equal(legacyR2StyleRun.parsed.runtimeSummaryPresent, false, 'legacy r2-style report should not be present')
assert.equal(legacyR2StyleRun.parsed.status, 'runtimeSummaryIncomplete', 'legacy r2-style report should be incomplete')
assert.ok(
  String(legacyR2StyleRun.parsed.missingFields ?? '').includes('runtimeProducerOk'),
  'legacy r2-style report should require runtimeProducerOk',
)

const missingRun = runGateWithReport(missingRuntimeReport, 'missing')
assert.equal(missingRun.parsed.runtimeSummaryPresent, false, 'missing runtime summary should not be present')
assert.equal(missingRun.parsed.runtimeReportMissing, true, 'missing runtime summary should set runtimeReportMissing')
assert.equal(missingRun.parsed.runtimeSummaryIncomplete, false, 'missing runtime summary should not be incomplete')
assert.equal(missingRun.parsed.status, 'runtimeReportMissing', 'missing runtime summary should report runtimeReportMissing')
assert.ok(
  String(missingRun.parsed.missingFields ?? '').includes('cameraZoomFocusRuntimeSummary'),
  'missing report should include cameraZoomFocusRuntimeSummary in missing fields',
)
assert.equal(missingRun.exitCode, 2, 'missing runtime summary should exit non-zero')

const producerFailedRun = runGateWithReport(producerFailedRuntimeReport, 'producer-failed')
assert.equal(producerFailedRun.exitCode, 2, 'producer failed report should exit non-zero')
assert.equal(producerFailedRun.parsed.runtimeSummaryPresent, false, 'producer failed report should not be present')
assert.equal(producerFailedRun.parsed.status, 'runtimeSummaryProducerFailed', 'producer failed report should report runtimeSummaryProducerFailed')
assert.equal(producerFailedRun.parsed.runtimeSummaryProducerFailed, true, 'producer failed report should set runtimeSummaryProducerFailed')
assert.ok(
  String(producerFailedRun.parsed.producerFailures ?? '').includes('wheelPivotDriftPx'),
  'producer failed report should include invalid producer field',
)

const producerSourceMissingRun = runGateWithReport(producerSourceMissingRuntimeReport, 'producer-source-missing')
assert.equal(producerSourceMissingRun.exitCode, 2, 'producer source missing report should exit non-zero')
assert.equal(
  producerSourceMissingRun.parsed.runtimeSummaryPresent,
  false,
  'producer source missing report should not be present',
)
assert.equal(
  producerSourceMissingRun.parsed.status,
  'runtimeSummaryProducerFailed',
  'producer source missing report should report runtimeSummaryProducerFailed',
)
assert.equal(
  producerSourceMissingRun.parsed.runtimeSummaryProducerFailed,
  true,
  'producer source missing report should set runtimeSummaryProducerFailed',
)
assert.ok(
  String(producerSourceMissingRun.parsed.producerFailures ?? '').includes('loadedChunkIds'),
  'producer source missing report should name the missing source field',
)
assert.ok(
  Array.isArray(producerSourceMissingRun.parsed.missingProducerSourceFields),
  'producer source missing report should expose missingProducerSourceFields',
)
assert.ok(
  (producerSourceMissingRun.parsed.missingProducerSourceFields as unknown[]).includes('loadedChunkIds'),
  'producer source missing report should expose loadedChunkIds in missingProducerSourceFields',
)

const unloadProducerSourceMissingRun = runGateWithReport(
  unloadProducerSourceMissingRuntimeReport,
  'unload-producer-source-missing',
)
assert.equal(unloadProducerSourceMissingRun.exitCode, 2, 'unload source missing report should exit non-zero')
assert.equal(
  unloadProducerSourceMissingRun.parsed.status,
  'runtimeSummaryProducerFailed',
  'unload source missing report should report runtimeSummaryProducerFailed',
)
assert.ok(
  (unloadProducerSourceMissingRun.parsed.missingProducerSourceFields as unknown[]).includes('unloadCandidateChunkIds'),
  'unload source missing report should expose unloadCandidateChunkIds in missingProducerSourceFields',
)

const loadedChunkSampleMissingRun = runGateWithReport(
  loadedChunkSampleMissingRuntimeReport,
  'loaded-chunk-sample-missing',
)
assert.equal(loadedChunkSampleMissingRun.exitCode, 2, 'empty loadedChunkIds report should exit non-zero')
assert.equal(
  loadedChunkSampleMissingRun.parsed.status,
  'runtimeSummaryIncomplete',
  'empty loadedChunkIds report should report runtimeSummaryIncomplete',
)
assert.ok(
  String(loadedChunkSampleMissingRun.parsed.typeFailures ?? '').includes('loadedChunkIds empty_array'),
  'empty loadedChunkIds report should name the missing array sample',
)

const unloadCandidateSampleMissingRun = runGateWithReport(
  unloadCandidateSampleMissingRuntimeReport,
  'unload-candidate-sample-missing',
)
assert.equal(unloadCandidateSampleMissingRun.exitCode, 2, 'empty unloadCandidateChunkIds report should exit non-zero')
assert.equal(
  unloadCandidateSampleMissingRun.parsed.status,
  'runtimeSummaryIncomplete',
  'empty unloadCandidateChunkIds report should report runtimeSummaryIncomplete',
)
assert.ok(
  String(unloadCandidateSampleMissingRun.parsed.typeFailures ?? '').includes('unloadCandidateChunkIds empty_array'),
  'empty unloadCandidateChunkIds report should name the missing array sample',
)

const loadedChunkCountMismatchRun = runGateWithReport(
  loadedChunkCountMismatchRuntimeReport,
  'loaded-chunk-count-mismatch',
)
assert.equal(loadedChunkCountMismatchRun.exitCode, 2, 'loadedChunkCount mismatch report should exit non-zero')
assert.equal(
  loadedChunkCountMismatchRun.parsed.status,
  'runtimeSummaryIncomplete',
  'loadedChunkCount mismatch report should report runtimeSummaryIncomplete',
)
assert.ok(
  String(loadedChunkCountMismatchRun.parsed.typeFailures ?? '').includes(
    'loadedChunkCount count_mismatch loadedChunkIds',
  ),
  'loadedChunkCount mismatch report should name the count mismatch',
)

const thresholdFailedRun = runGateWithReport(thresholdFailedRuntimeReport, 'threshold-failed')
assert.equal(thresholdFailedRun.exitCode, 2, 'threshold failed report should exit non-zero')
assert.equal(thresholdFailedRun.parsed.runtimeSummaryPresent, false, 'threshold failed report should not be present')
assert.equal(thresholdFailedRun.parsed.status, 'runtimeSummaryThresholdFailed', 'threshold failed report should report runtimeSummaryThresholdFailed')
assert.equal(thresholdFailedRun.parsed.runtimeSummaryThresholdFailed, true, 'threshold failed report should set runtimeSummaryThresholdFailed')
assert.ok(
  String(thresholdFailedRun.parsed.thresholdFailures ?? '').includes('stateFillRatio2k'),
  'threshold failed report should include stateFillRatio2k failure',
)

for (const thresholdCase of [
  ['stateFillRatio2k', 0.61],
  ['wheelPivotDriftPx', 2.01],
  ['pinchPivotDriftPx', 3.01],
  ['pivotCellDrift', 1.01],
  ['focusSettleTimeMs', 901],
  ['hitRadiusPx', 21.99],
  ['labelOverlapCount', 1],
  ['cacheUnloadOk', false],
] as const) {
  const [field, value] = thresholdCase
  const thresholdRun = runGateWithReport(runtimeReportWith({ [field]: value }), `threshold-${field}`)
  assert.equal(thresholdRun.exitCode, 2, `${field} threshold failure should exit non-zero`)
  assert.equal(thresholdRun.parsed.runtimeSummaryPresent, false, `${field} threshold failure should not be present`)
  assert.equal(thresholdRun.parsed.status, 'runtimeSummaryThresholdFailed', `${field} threshold failure should report runtimeSummaryThresholdFailed`)
  assert.ok(
    String(thresholdRun.parsed.thresholdFailures ?? '').includes(field),
    `${field} threshold failure should be named in thresholdFailures`,
  )
}

for (const typeCase of [
  ['loadedChunkIds', 'chunk_y001_x001'],
  ['unloadCandidateChunkIds', 'chunk_y000_x000'],
  ['viewportCacheHitCount', '1'],
  ['viewportStaleResponseCount', '0'],
  ['memoryPeakMb', null],
  ['memoryAfterUnloadMb', null],
  ['memoryRecoveredMb', null],
  ['runtimeProducerFieldSources', []],
] as const) {
  const [field, value] = typeCase
  const typeRun = runGateWithReport(runtimeReportWith({ [field]: value }), `type-${field}`)
  assert.equal(typeRun.exitCode, 2, `${field} type failure should exit non-zero`)
  assert.equal(typeRun.parsed.runtimeSummaryPresent, false, `${field} type failure should not be present`)
  assert.equal(typeRun.parsed.status, 'runtimeSummaryIncomplete', `${field} type failure should be incomplete`)
  assert.ok(
    String(typeRun.parsed.typeFailures ?? '').includes(field),
    `${field} type failure should be named in typeFailures`,
  )
}

console.log('[godot_camera_zoom_focus_mobile_acceptance_gate_contract] all checks passed')
