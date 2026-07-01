import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

function extractJsonBlock(source: string): any {
  const match = source.match(/```json\s*([\s\S]*?)```/)
  assert.ok(match, 'mega plan must include one fenced json block')
  return JSON.parse(match[1])
}

const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const packageJson = JSON.parse(readUtf8('package.json'))

assert.equal(
  packageJson.scripts?.['test:client-server-ai-ops-megaplan-contract'],
  'tsx server/tests/client_server_ai_ops_megaplan_contract.test.ts',
  'package.json must expose the Stage 814 mega plan contract',
)

assert.ok(existsSync(megaPlanPath), `missing Stage 814 mega plan: ${megaPlanPath}`)
const megaPlan = readUtf8(megaPlanPath)

for (const requiredPlanToken of [
  '# Client Server AI Ops Megaplan Pursuit Implementation Plan',
  'Status: current Stage 814 mega pursuit plan',
  'Stage 814',
  'pursuit goal',
  'no source directory split',
  'do not fake staging/prod endpoints',
  'do not move source directories',
  'subagent governance',
  'continuous verification cadence',
]) {
  assertIncludes(megaPlan, requiredPlanToken, 'Stage 814 mega plan')
}

const machinePlan = extractJsonBlock(megaPlan)
assert.equal(machinePlan.status, 'current Stage 814 mega pursuit plan')
assert.equal(machinePlan.stage, 814)
assert.equal(machinePlan.planId, 'client_server_ai_ops_megaplan_pursuit_2026_06_17')
assert.equal(machinePlan.sourceMovementAllowed, false)
assert.equal(machinePlan.fakeEndpointAllowed, false)
assert.equal(machinePlan.pursuitGoalMode, true)

for (const lane of [
  'gameplay-anchors',
  'release-ci-evidence',
  'ai-subject-boundary',
  'ops-recovery',
  'physical-split-readiness',
  'documentation-governance',
]) {
  assert.ok(machinePlan.lanes.includes(lane), `mega plan lanes must include ${lane}`)
}

for (const plannedStage of [
  '814',
  '815',
  '816',
  '817',
  '818',
  '819',
  '820',
  '821',
  '822',
  '823',
  '824',
  '825',
]) {
  assert.ok(
    machinePlan.plannedStages.some((stage: any) => String(stage.stage) === plannedStage),
    `mega plan must include planned Stage ${plannedStage}`,
  )
}

for (const command of [
  'npm.cmd run test:client-server-ai-ops-megaplan-contract',
  'npm.cmd run test:physical-split-readiness-contract',
  'npm.cmd run release:candidate:local-dev',
  'npm.cmd run test:godot:ai-proposal-gameplay-anchor-contract',
  'npm.cmd run godot:mainline:visual-smoke',
]) {
  assert.ok(machinePlan.verificationCadence.formalCommands.includes(command), `mega plan commands must include ${command}`)
}

for (const forbidden of [
  'fake staging/prod endpoint',
  'physical source movement before Stage 804 flips ready',
  'server secret in Godot package',
  'AI private sourceRefs in player UI',
  'raw contract fields in player copy',
]) {
  assert.ok(machinePlan.forbiddenMoves.includes(forbidden), `mega plan forbidden moves must include ${forbidden}`)
}

const currentHandoff = readUtf8('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
for (const requiredHandoffToken of [
  'Stage 814 - Client Server AI Ops Megaplan Pursuit',
  megaPlanPath,
  'npm.cmd run test:client-server-ai-ops-megaplan-contract',
]) {
  assertIncludes(currentHandoff, requiredHandoffToken, 'CURRENT handoff Stage 814')
}

const splitTarget = readUtf8('docs/SLG_CLIENT_SERVER_AI_OPS_SPLIT_TARGET_CURRENT_2026_06_15.md')
assertIncludes(splitTarget, 'Stage 814', 'split target Stage 814 reference')
assertIncludes(splitTarget, megaPlanPath, 'split target mega plan link')

const roadmap = readUtf8('docs/superpowers/plans/2026-06-16-client-server-ai-ops-release-lane-roadmap.md')
assertIncludes(roadmap, 'Stage 814', 'roadmap Stage 814 reference')
assertIncludes(roadmap, megaPlanPath, 'roadmap mega plan link')
