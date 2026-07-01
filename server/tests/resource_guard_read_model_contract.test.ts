import assert from 'node:assert/strict'
import { getWorldMapLayout, resetWorldServiceForTests } from '../src/application/world/WorldService'
import { resolveResourceGuardTemplateForTile } from '../../shared/domain/resourceGuardTemplates'

resetWorldServiceForTests()

const layout = getWorldMapLayout({ scope: 'full' })
const resourceTile = layout.map.tiles.find((tile) => tile.type === 'resource')
assert.ok(resourceTile, 'world map layout should expose at least one resource tile')
assert.ok(resourceTile.resourceGuard, 'resource tile should expose resourceGuard read model for hover/detail')

const template = resolveResourceGuardTemplateForTile(resourceTile)
assert.ok(template, 'resource tile should resolve a resource guard template')
assert.equal(resourceTile.resourceGuard.templateId, template.id)
assert.equal(resourceTile.resourceGuard.resourceLevel, resourceTile.resourceLevel ?? 1)
assert.equal(resourceTile.resourceGuard.label, template.label)
assert.equal(resourceTile.resourceGuard.recommendedAttackerStrength, template.recommendedAttackerStrength)
assert.ok(resourceTile.resourceGuard.guardNames.length >= 1)
assert.ok(resourceTile.resourceGuard.guardNames.length <= 3)
assert.equal(resourceTile.resourceGuard.units.length, resourceTile.resourceGuard.guardNames.length)
assert.ok(resourceTile.resourceGuard.skillSummary.length > 0)

for (const unit of resourceTile.resourceGuard.units) {
  assert.ok(unit.name.length > 0)
  assert.ok(unit.assetKey.startsWith('npc_guard_'))
  assert.ok(unit.portraitAssetKey.startsWith('npc_guard.portrait.'))
  assert.ok(unit.level >= 1)
  assert.ok(unit.mainSkillName.length > 0)
  assert.ok(unit.fixedSkillSummary.includes(unit.name))
  assert.ok(unit.fixedSkillSummary.includes(unit.mainSkillName))
}

const plainTile = layout.map.tiles.find((tile) => tile.type !== 'resource')
assert.ok(plainTile, 'world map layout should expose at least one non-resource tile')
assert.equal(plainTile.resourceGuard, undefined, 'non-resource tiles should not expose resourceGuard')

console.log('[resource_guard_read_model_contract] all checks passed')
