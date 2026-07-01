import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  buildGodotReleasePackagingPreflightSteps,
  DEFAULT_RELEASE_PACKAGING_PROFILE,
} from '../../scripts/run_godot_release_packaging_preflight'

const steps = buildGodotReleasePackagingPreflightSteps('local-dev')
const stepNames = steps.map((step) => step.name)

assert.equal(DEFAULT_RELEASE_PACKAGING_PROFILE, 'local-dev')
assert.deepEqual(stepNames, [
  'select active Godot client profile',
  'validate release manifest schemas',
  'validate concrete release manifest instances',
  'generate server release artifact',
  'validate feature boundary card',
  'validate Godot client profile selection',
  'validate Godot AppConfig profile reader',
  'validate Godot client package boundary',
  'validate Godot release export hygiene',
  'build TypeScript server/contracts',
  'smoke Godot headless scene startup',
])

const selectStep = steps[0]
assert.equal(selectStep.command, 'npm')
assert.deepEqual(selectStep.args, ['run', 'godot:client-profile:select', '--', '--profile', 'local-dev'])

for (const requiredScript of [
  'test:release-artifact:manifest-schema-contract',
  'test:release-artifact:manifest-instances-contract',
  'release:server-artifact:generate',
  'test:release-artifact:feature-boundary-card-contract',
  'test:godot:client-profile-selection-contract',
  'test:godot:app-config-client-profile-contract',
  'test:godot:client-package-boundary-contract',
  'test:godot:release-export-hygiene-contract',
  'build',
  'godot:headless:smoke',
]) {
  assert.ok(
    steps.some((step) => step.args.includes(requiredScript)),
    `release packaging preflight must run ${requiredScript}`,
  )
}

const packageJson = readFileSync('package.json', 'utf8')
assert.ok(
  packageJson.includes('"godot:release:preflight": "tsx scripts/run_godot_release_packaging_preflight.ts"'),
  'package.json must expose godot:release:preflight as the formal release packaging preflight entry.',
)

console.log('[godot_release_packaging_preflight_contract] all checks passed')
