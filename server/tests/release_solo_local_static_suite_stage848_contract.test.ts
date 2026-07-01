import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

import {
  buildReleaseSoloLocalStaticSuiteSteps,
  shellLineForReleaseSoloLocalStaticSuiteStep,
} from '../../scripts/run_release_solo_local_static_suite'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const suitePath = 'ops/release-artifacts/local-dev.solo-local-static-suite.json'
const runnerScript = 'scripts/run_release_solo_local_static_suite.ts'
const stage848Guard = 'solo_local_static_suite_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['release:solo-local-static-suite:check'],
  'tsx scripts/run_release_solo_local_static_suite.ts',
  'package.json must expose the solo/local static release suite runner',
)
assert.equal(
  packageJson.scripts?.['test:release-solo-local-static-suite-stage848-contract'],
  'tsx server/tests/release_solo_local_static_suite_stage848_contract.test.ts',
  'package.json must expose the Stage 848 solo/local static suite contract',
)

assert.ok(existsSync(suitePath), `missing solo/local static suite manifest: ${suitePath}`)
const suite = JSON.parse(readUtf8(suitePath)) as {
  status: string
  profileId: string
  suiteCommand: string
  nonStarting: boolean
  sourceMatrix: string
  steps: Array<{
    index: number
    gateId: string
    command: string
    startsService: boolean
    requiresHostedEvidence: boolean
    requiresStagingProdEndpoint: boolean
  }>
  nonClaims: string[]
}

assert.equal(suite.status, 'current Stage 848 solo-local static release suite')
assert.equal(suite.profileId, 'local-dev')
assert.equal(suite.suiteCommand, 'npm.cmd run release:solo-local-static-suite:check -- --profile local-dev')
assert.equal(suite.nonStarting, true)
assert.equal(suite.sourceMatrix, 'ops/release-artifacts/local-dev.solo-local-release-gate-matrix.json')

const steps = buildReleaseSoloLocalStaticSuiteSteps('local-dev')
assert.deepEqual(
  suite.steps,
  steps.map((step, index) => ({
    index: index + 1,
    gateId: step.gateId,
    command: shellLineForReleaseSoloLocalStaticSuiteStep(step),
    startsService: step.startsService,
    requiresHostedEvidence: step.requiresHostedEvidence,
    requiresStagingProdEndpoint: step.requiresStagingProdEndpoint,
  })),
  'suite manifest must match the static suite step builder',
)
assert.deepEqual(
  steps.map((step) => step.gateId),
  [
    'service_process_guard',
    'solo_local_release_gate_matrix',
    'release_candidate_dry_run_snapshot',
    'release_boundary_mandatory_artifacts',
    'release_boundary_artifact_coverage',
    'local_anchor_static_sweep',
    'release_github_actions_summary_local_replay',
    'github_actions_run_archive_static_contract',
  ],
)
for (const step of steps) {
  assert.equal(step.startsService, false, `${step.gateId} must be non-starting`)
  assert.equal(step.requiresHostedEvidence, false, `${step.gateId} must not require hosted evidence`)
  assert.equal(step.requiresStagingProdEndpoint, false, `${step.gateId} must not require staging/prod endpoint evidence`)
}

for (const nonClaim of [
  'does not run release:candidate:local-dev',
  'does not run Godot export',
  'does not claim hosted GitHub Actions run evidence',
  'does not treat Stage 846 local replay as hosted evidence',
  'does not start server:dev or tsx watch',
]) {
  assert.ok(suite.nonClaims.includes(nonClaim), `missing non-claim: ${nonClaim}`)
}

const runner = readUtf8(runnerScript)
assertIncludes(runner, suitePath, 'solo/local static suite runner')
assertIncludes(runner, 'buildReleaseSoloLocalStaticSuiteSteps', 'solo/local static suite runner')
assertIncludes(runner, 'release solo/local static suite manifest drift', 'solo/local static suite runner')

const mandatory = readUtf8('ops/release-artifacts/local-dev.release-boundary-mandatory-artifacts.json')
assertIncludes(mandatory, 'solo_local_static_suite', 'mandatory checklist')
assertIncludes(mandatory, suitePath, 'mandatory checklist')

const coverage = readUtf8('ops/release-artifacts/local-dev.release-boundary-artifact-coverage.json')
assertIncludes(coverage, suitePath, 'coverage manifest')
assertIncludes(coverage, 'solo/local static release suite', 'coverage manifest')

const archiveDoc = readUtf8('docs/RELEASE_CANDIDATE_GITHUB_ACTIONS_RUN_ARCHIVE_CURRENT_2026_06_16.md')
assertIncludes(archiveDoc, suitePath, 'GitHub archive doc')

const replay = readUtf8('ops/release-artifacts/local-dev.release-github-actions-summary-local-replay.json')
assertIncludes(replay, 'soloLocalStaticSuite', 'summary local replay')
assertIncludes(replay, suitePath, 'summary local replay')

const current = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const token of [
  'Stage 848 - Solo Local Static Release Suite Guard',
  suitePath,
  'does not run `release:candidate:local-dev`, Godot export, full visual smoke, `server:dev`, or `tsx watch`',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const progress = JSON.parse(readUtf8('ops/release-artifacts/local-dev.boundary-convergence-progress.json')) as {
  completedStages: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards: string[]
}
const stage848 = progress.completedStages.find((stage) => stage.stageId === 848)
assert.ok(stage848, 'Stage 826 progress manifest must record Stage 848')
assert.equal(stage848.status, 'formal-green-static-solo-local-release-suite')
assert.ok(stage848.evidence.includes(suitePath))
assert.ok(progress.mandatoryGuards.includes(stage848Guard), 'Stage 826 must require Stage 848 guard')

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 848', 'split target')
assertIncludes(splitTarget, 'solo/local static release suite', 'split target')

const megaPlan = readUtf8('docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md')
assertIncludes(megaPlan, 'Stage 848', 'mega plan')
assertIncludes(megaPlan, stage848Guard, 'mega plan')
