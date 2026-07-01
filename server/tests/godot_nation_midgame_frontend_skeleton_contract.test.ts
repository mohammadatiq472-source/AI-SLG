import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const alliancePresenter = readFileSync('godot-client/scripts/ui/presenters/alliance_presenter.gd', 'utf-8')
const alliancePanel = readFileSync('godot-client/scripts/ui/alliance_panel.gd', 'utf-8')
const main = readFileSync('godot-client/scripts/app/main.gd', 'utf-8')
const smokeRunner = readFileSync('godot-client/tools/run_mainline_visual_smoke.py', 'utf-8')

assert.match(
  alliancePresenter,
  /nation_midgame_frontend_skeleton_v1/,
  'AlliancePresenter must expose the nation_midgame_frontend_skeleton_v1 contract.',
)
assert.match(
  alliancePresenter,
  /organization_membership_authority_v1/,
  'AlliancePresenter must consume organization_membership_authority_v1 instead of local roster placeholders.',
)
assert.match(
  alliancePresenter,
  /region_control[\s\S]*state_capital[\s\S]*luoyang_control[\s\S]*empire_status[\s\S]*east_han_unification/,
  'AlliancePresenter must preserve the nation objective chain from the read model.',
)
assert.match(
  alliancePresenter,
  /alliance[\s\S]*kingdom[\s\S]*empire/,
  'AlliancePresenter must expose alliance -> kingdom -> empire stage progression.',
)
assert.match(
  alliancePanel,
  /NationMidgameFrontendSkeletonBlock/,
  'AlliancePanel must render a visible midgame skeleton block.',
)
assert.match(
  alliancePanel,
  /organizationNationMidgameObjectiveRowCount/,
  'AlliancePanel visual summary must count read-model objective rows.',
)
assert.match(
  alliancePanel,
  /organizationNationMidgameMembershipAuthorityVisible/,
  'AlliancePanel visual summary must report membership authority visibility.',
)
assert.match(
  main,
  /world_open_main_city_organization_nation_midgame_frontend/,
  'Mainline visual smoke must expose a nation midgame frontend click action.',
)
assert.match(
  main,
  /organizationNationMidgameFrontendSkeletonVerified/,
  'Mainline visual smoke click action must verify the midgame skeleton.',
)
assert.match(
  smokeRunner,
  /world_open_main_city_organization_nation_midgame_frontend/,
  'Visual smoke runner must whitelist the nation midgame frontend click action.',
)
assert.match(
  smokeRunner,
  /seedNationMidgameFrontendFixture/,
  'Visual smoke runner must seed nation objective and membership read models for this action.',
)

console.log('[godot_nation_midgame_frontend_skeleton_contract] all checks passed')
