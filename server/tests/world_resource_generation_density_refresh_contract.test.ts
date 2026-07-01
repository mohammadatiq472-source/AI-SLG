import assert from 'node:assert/strict'
import type { ResourceKind, Tile } from '../../shared/contracts/game'
import { createInitialWorldState } from '../../shared/domain/scenario'
import {
  DEFAULT_WORLD_RESOURCE_GENERATION_POLICY,
  buildWorldResourceDensityReadModel,
  buildWorldResourceRefreshCandidate,
} from '../../shared/domain/worldResourceGeneration'
import { RESOURCE_TILE_ECONOMY_MODEL_VERSION } from '../../shared/domain/resourceTileEconomy'
import { listResourceGuardTemplates } from '../../shared/domain/resourceGuardTemplates'

const world = createInitialWorldState()
const density = buildWorldResourceDensityReadModel(world.map.tiles)

assert.equal(density.generationVersion, DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.generationVersion)
assert.equal(density.resourceTileDensityPermille, DEFAULT_WORLD_RESOURCE_GENERATION_POLICY.resourceTileDensityPermille)
assert.ok(density.totalTileCount > 0)
assert.ok(density.l0SubstrateTileCount > 0, 'map must preserve L0 substrate tiles')
assert.ok(density.generatedResourceTileCount > 0, 'map must generate sparse L1-L9 resource tiles')
assert.ok(
  density.l0SubstrateTileCount > density.generatedResourceTileCount,
  'default generation should preserve more L0 substrate than resource overlay tiles',
)
assert.deepEqual(density.levelDistribution.map((entry) => entry.level), [1, 2, 3, 4, 5, 6, 7, 8, 9])
assert.equal(density.levelDistribution.some((entry) => Number(entry.level) === 10), false, 'L10 must not enter current density policy')
assert.equal(density.l1L9DistributionOnly, true)
assert.equal(density.l0SubstratePreserved, true)

const l0Tile = world.map.tiles.find((tile) => tile.type !== 'resource')
assert.ok(l0Tile, 'fixture world must include an L0 substrate tile')
const l0Candidate = buildWorldResourceRefreshCandidate(l0Tile)
assert.equal(l0Candidate.refreshEligible, false)
assert.equal(l0Candidate.reason, 'l0_substrate_not_resource_tile')
assert.equal(l0Candidate.refreshWeight, 0)
assert.equal(l0Candidate.hasResourceEconomy, false)
assert.equal(l0Candidate.hasResourceGuard, false)

const guardLevels = listResourceGuardTemplates().map((template) => template.resourceLevel)
assert.deepEqual(guardLevels, [1, 2, 3, 4, 5, 6, 7, 8, 9])

const resourceKinds: ResourceKind[] = ['food', 'wood', 'stone', 'iron']
for (const [index, resourceKind] of resourceKinds.entries()) {
  const tile = buildSyntheticResourceTile(resourceKind, index + 3)
  const candidate = buildWorldResourceRefreshCandidate(tile)
  assert.equal(candidate.refreshEligible, true)
  assert.equal(candidate.resourceEconomyModelVersion, RESOURCE_TILE_ECONOMY_MODEL_VERSION)
  assert.equal(candidate.resourceKind, resourceKind)
  assert.equal(candidate.tileLevel, index + 3)
  assert.equal(candidate.hasResourceEconomy, true)
  assert.equal(candidate.hasResourceGuard, true)
  assert.ok(candidate.guardTemplateId?.startsWith('resource_guard_level_'))
  assert.ok(candidate.refreshWeight > 0)
  assert.ok(candidate.recoveryCooldownTicks > 0)
  assert.ok(candidate.nextRecoveryHint.length > 0)
}

const l10Candidate = buildWorldResourceRefreshCandidate(buildSyntheticResourceTile('wood', 10))
assert.equal(l10Candidate.refreshEligible, false)
assert.equal(l10Candidate.reason, 'unsupported_resource_level')
assert.equal(l10Candidate.refreshWeight, 0)
assert.equal(l10Candidate.tileLevel, undefined)

console.log('[world_resource_generation_density_refresh_contract] all checks passed')

function buildSyntheticResourceTile(resourceKind: ResourceKind, resourceLevel: number): Tile {
  return {
    id: `synthetic_${resourceKind}_${resourceLevel}`,
    name: `synthetic ${resourceKind} L${resourceLevel}`,
    type: 'resource',
    terrain: 'grassland',
    owner: 'neutral',
    x: resourceLevel,
    y: resourceLevel,
    moveCost: 1,
    enemyPressure: 0,
    scoutingDifficulty: 1,
    resourceKind,
    resourceLevel,
  }
}
