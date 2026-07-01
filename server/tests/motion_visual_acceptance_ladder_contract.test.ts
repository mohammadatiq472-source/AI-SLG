import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path: string) {
  return readFileSync(path, 'utf8')
}

const motionAuthority = read('docs/PRODUCT_AUTHORITY_MOTION_ANIMATION_EFFECTS_CURRENT_2026_06_11.md')
const productIndex = read('docs/PRODUCT_AUTHORITY_INDEX_CURRENT_2026_06_10.md')
const currentHandoff = read('docs/CURRENT_HANDOFF_INDEX_2026_06_05.md')

assert.ok(
  productIndex.includes('| Motion/animation/effects | modeled with inventory and packets | partial |'),
  'product index must keep motion modeled/partial, not complete',
)

assert.ok(
  motionAuthority.includes('## 2026-06-12 Visual Acceptance Evidence Ladder'),
  'motion authority must define the visual acceptance evidence ladder',
)

for (const level of [
  'vision',
  'specified',
  'code_chain',
  'visual_smoke',
  'player_ui_accepted',
  'consequence_complete',
]) {
  assert.ok(motionAuthority.includes(`| \`${level}\` |`), `motion evidence ladder must define ${level}`)
}

for (const requiredPhrase of [
  'current screenshot or movement-frame proof',
  'Current screenshot or movement-frame packet',
  'real Godot controls/action ids',
  'safe Chinese visible copy',
  'no debug/ops/backend leakage',
  'durable report/history/replay/save/map/city/org/Court anchor',
  'whole-system completion beyond the exact accepted states',
  'support routes, old docs, local-only feedback, unanchored toast, or summary tokens alone',
]) {
  assert.ok(
    motionAuthority.includes(requiredPhrase),
    `motion evidence ladder must block overclaim: ${requiredPhrase}`,
  )
}

for (const promotionRule of [
  'A packet can move up only one evidence level at a time',
  'the accepted claim must name exact states',
  'called `modeled` when it reaches `specified`',
  'called `animated` only for states with `code_chain` plus current visual proof',
  'called `consequence-complete` only after durable anchor and recovery proof',
  'Old `PASS`, `visual-smoke`, `template-replay`, screenshot path, button-identity, route, or ops/debug gate rows can only serve as support evidence',
  'Every promotion must update `docs/CURRENT_HANDOFF_INDEX_2026_06_05.md`',
]) {
  assert.ok(motionAuthority.includes(promotionRule), `motion promotion rule missing: ${promotionRule}`)
}

assert.ok(
  currentHandoff.includes('Stage 492 - archive index motion/default-entry guard cleanup'),
  'CURRENT should retain the previous motion/default-entry guard stage before this ladder is extended',
)

console.log('[motion_visual_acceptance_ladder_contract] all checks passed')
