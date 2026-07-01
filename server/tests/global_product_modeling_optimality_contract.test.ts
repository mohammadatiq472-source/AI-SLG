import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string): string {
  return readFileSync(path, 'utf8')
}

const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')
const executionIndex = read('docs/AGENTS_EXECUTION_CURRENT_2026_04.md')
const packageJson = read('package.json')

assert.ok(
  productIndex.includes('### 2026-06-12 Global Optimality Product Modeling Router'),
  'product index must define the global optimality router',
)

for (const requiredPhrase of [
  'global-optimal product modeling',
  'local-optimal patch',
  'whole-SLG closure graph',
  'cross-domain consequence',
  'player-facing recovery',
  'durable history anchor',
]) {
  assert.ok(productIndex.includes(requiredPhrase), `global router must contain ${requiredPhrase}`)
}

for (const rankingRule of [
  '| 1 | P0 radar row that unlocks multiple downstream lanes |',
  '| 2 | Cross-domain producer / translator / receipt chain |',
  '| 3 | Player-visible Godot proof for a modeled P0 packet |',
  '| 4 | Old-source demotion that prevents wrong default routing |',
  '| 5 | Isolated polish or single-state motion proof |',
]) {
  assert.ok(productIndex.includes(rankingRule), `global router must rank ${rankingRule}`)
}

for (const antiPattern of [
  'Do not keep extending a narrow motion/UI lane just because the last stage passed.',
  'Do not choose a task only because it has the cheapest test.',
  'Do not call support-layer evidence a whole-product model.',
  'Do not allow old HANDOFF / PLAN / PROMPT files to become the default route.',
]) {
  assert.ok(productIndex.includes(antiPattern), `global router must reject local-optimal anti-pattern: ${antiPattern}`)
}

for (const nextBest of [
  'Unified player world history producers',
  'Main-city / domestic economy into history',
  'Dedicated replay product surface',
  'Save/load restore apply feedback',
  'Court decision world-effect receipt',
]) {
  assert.ok(productIndex.includes(nextBest), `global router must preserve P0 radar item ${nextBest}`)
}

assert.ok(
  productIndex.includes('Next-step selection rule: choose the highest-ranked open row whose formal proof would reduce the most cross-domain uncertainty'),
  'global router must state the next-step selection rule',
)

assert.ok(
  currentHandoff.includes('Stage 497 - global optimality product modeling router') &&
    currentHandoff.includes('global-optimal product modeling') &&
    currentHandoff.includes('local-optimal patch'),
  'CURRENT handoff must record the global optimality router stage',
)

assert.ok(
  executionIndex.includes('CURRENT_HANDOFF_INDEX_2026_06_05.md') &&
    executionIndex.includes('PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md'),
  'execution index must continue routing new work through product authority and CURRENT',
)

assert.ok(
  packageJson.includes(
    '"test:world:global-product-modeling-optimality-contract": "tsx server/tests/global_product_modeling_optimality_contract.test.ts"',
  ),
  'package.json must expose the global product modeling optimality contract',
)

console.log('[global_product_modeling_optimality_contract] all checks passed')
