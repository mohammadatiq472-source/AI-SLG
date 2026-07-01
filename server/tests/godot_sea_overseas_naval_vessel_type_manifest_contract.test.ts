import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const manifestPath = path.join(repoRoot, 'godot-client/data/ui/sea_overseas_naval_unit_frames_manifest_v1.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
  requiredMovingBodies?: Array<Record<string, unknown>>
}

const movingBodies = manifest.requiredMovingBodies ?? []
const bySlot = new Map(movingBodies.map((body) => [String(body.slotId), body]))

for (const slotId of ['naval_light_patrol_warship_v1', 'naval_interceptor_warship_v1', 'naval_transport_warship_v1']) {
  assert.ok(bySlot.has(slotId), `missing naval vessel moving body: ${slotId}`)
  const body = bySlot.get(slotId)!
  assert.equal(body.requiredFrameCount, 80, `${slotId} should require 80 moving-body frames`)
  assert.equal(body.directionCount, 8, `${slotId} should keep 8 movement directions`)
  assert.equal(body.framesPerDirection, 10, `${slotId} should keep 10 frames per direction`)
}

const lightPatrol = bySlot.get('naval_light_patrol_warship_v1')!
assert.equal(lightPatrol.carriedUnitCapacity, 1)
assert.equal(lightPatrol.speedTier, 'fast')
assert.equal(lightPatrol.buildCostTier, 'low')
assert.equal(lightPatrol.combatBonusPercent, 0)
assert.equal(lightPatrol.visualScaleTier, 'small')

const interceptor = bySlot.get('naval_interceptor_warship_v1')!
assert.equal(interceptor.carriedUnitCapacity, 1)
assert.equal(interceptor.combatBonusPercent, 20)
assert.equal(interceptor.speedTier, 'normal')
assert.equal(interceptor.buildCostTier, 'medium')
assert.equal(interceptor.visualScaleTier, 'medium')

const transport = bySlot.get('naval_transport_warship_v1')!
assert.equal(transport.carriedUnitCapacity, 3)
assert.equal(transport.combatBonusPercent, 0)
assert.equal(transport.speedTier, 'slow')
assert.equal(transport.buildCostTier, 'high')
assert.equal(transport.visualScaleTier, 'large')

const manifestText = fs.readFileSync(manifestPath, 'utf8')
assert.ok(manifestText.includes('轻巡战船'))
assert.ok(manifestText.includes('拦截战船'))
assert.ok(manifestText.includes('运输战船'))
assert.ok(!manifestText.includes('transport_junk_supply'), 'transport should be framed as a transport warship, not a pure supply junk')

console.log('[godot_sea_overseas_naval_vessel_type_manifest_contract] all checks passed')
