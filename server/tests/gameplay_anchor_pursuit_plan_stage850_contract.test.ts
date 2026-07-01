import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function readUtf8(path: string): string {
  return readFileSync(path, 'utf8')
}

function assertIncludes(source: string, token: string, label: string): void {
  assert.ok(source.includes(token), `${label} must include ${token}`)
}

const planPath = 'docs/superpowers/plans/2026-06-18-local-gameplay-anchor-pursuit-plan.md'
const currentPath = 'docs/CURRENT_HANDOFF_INDEX_2026_06_05.md'
const megaPlanPath = 'docs/superpowers/plans/2026-06-17-client-server-ai-ops-megaplan-pursuit.md'
const stage826Path = 'ops/release-artifacts/local-dev.boundary-convergence-progress.json'
const registryPath = 'ops/release-artifacts/local-dev.gameplay-anchor-registry.json'
const stage850Guard = 'gameplay_anchor_pursuit_plan_guard'

const packageJson = JSON.parse(readUtf8('package.json')) as {
  scripts?: Record<string, string>
}

assert.equal(
  packageJson.scripts?.['test:gameplay-anchor-pursuit-plan-stage850-contract'],
  'tsx server/tests/gameplay_anchor_pursuit_plan_stage850_contract.test.ts',
  'package.json must expose the Stage 850 gameplay-anchor pursuit plan contract',
)

assert.ok(existsSync(planPath), `missing Stage 850 pursuit plan: ${planPath}`)
const plan = readUtf8(planPath)

for (const token of [
  'Local Gameplay Anchor Pursuit Plan - 2026-06-18',
  'Stage850 - Interior Authority Readiness Guard',
  'Stage851 - Main City Interior Tax Formal Anchor',
  'Stage852 - Interior Affairs Server-Authoritative Action Anchor',
  'world_open_main_city_interior_tax',
  'world_open_main_city_interior_affairs_press_first_action',
  'Stage816 仍是 boundary-only',
  '不把 Stage846 local replay 当作 hosted CI evidence',
  'npm.cmd run ops:service-process-guard',
  'tmp/stage851_main_city_interior_tax_gameplay_anchor',
]) {
  assertIncludes(plan, token, 'Stage 850 pursuit plan')
}

const current = readUtf8(currentPath)
for (const token of [
  'Stage 850 - Local Gameplay Anchor Pursuit Plan',
  planPath,
  'Stage 816 as `boundary-green-not-server-authoritative`',
  'world_open_main_city_interior_tax',
  'does not treat Stage 846 local replay as hosted evidence',
]) {
  assertIncludes(current, token, 'CURRENT handoff')
}

const megaPlan = readUtf8(megaPlanPath)
for (const token of [
  'Treat Stage 850 as the local-only gameplay anchor pursuit plan',
  planPath,
  'keep Stage 816 boundary-only',
  'prefer `world_open_main_city_interior_tax` as the next formal candidate',
]) {
  assertIncludes(megaPlan, token, 'mega plan')
}

const registry = JSON.parse(readUtf8(registryPath)) as {
  registeredAnchors?: Array<{
    stageId: number | string
    anchorId: string
    anchorClass: string
    status: string
  }>
  deniedClaims?: string[]
}

const stage816 = registry.registeredAnchors?.find((entry) => entry.stageId === 816)
assert.ok(stage816, 'gameplay anchor registry must keep Stage 816 visible')
assert.equal(stage816.anchorId, 'world_open_main_city_interior_affairs_press_first_action')
assert.equal(stage816.anchorClass, 'boundary-proof-anchor')
assert.equal(stage816.status, 'boundary-green-not-server-authoritative')

const stage849 = registry.registeredAnchors?.find((entry) => entry.stageId === 849)
assert.ok(stage849, 'gameplay anchor registry must keep Stage 849 visible')
assert.equal(stage849.anchorId, 'world_ai_switch_open_home_city')
assert.equal(stage849.anchorClass, 'formal-gameplay-anchor')
assert.equal(stage849.status, 'formal-green')

const progress = JSON.parse(readUtf8(stage826Path)) as {
  completedStages?: Array<{ stageId: number | string; status: string; evidence: string[] }>
  mandatoryGuards?: string[]
  nonClaims?: string[]
}

const stage850 = progress.completedStages?.find((stage) => stage.stageId === 850)
assert.ok(stage850, 'Stage 826 progress manifest must record Stage 850')
assert.equal(stage850.status, 'formal-green-static-gameplay-anchor-pursuit-plan')
assert.ok(stage850.evidence.includes(planPath), 'Stage 850 evidence must include the pursuit plan')
assert.ok(
  stage850.evidence.includes('server/tests/gameplay_anchor_pursuit_plan_stage850_contract.test.ts'),
  'Stage 850 evidence must include this static guard',
)
assert.ok(progress.mandatoryGuards?.includes(stage850Guard), 'Stage 826 must require Stage 850 guard')

for (const token of [
  'no hosted GitHub Actions run evidence is claimed',
  'no staging/prod endpoint profile is invented',
  'no physical source movement is allowed',
]) {
  assert.ok(progress.nonClaims?.includes(token), `Stage 826 non-claims must include: ${token}`)
}
